#!/usr/bin/env node
// Seed planner.inventory_snapshots from a Cin7 "Historic and Current Stock Valuations" pivot export (xlsx).
// Standalone, run by hand (Diviyaj on prod; also runs against the sandbox for testing). DRY RUN by default.
//
//   node scripts/seed_inventory_snapshots.mjs "<file.xlsx>" --date=YYYY-MM-DD [--source=erp_seed] [--apply]
//
// Requires DATABASE_URL (from .env). Reads Branch / Category / Code / SOH Total; ignores Category (products.category
// is the truth). Drops Grand Total + subtotal rows, reconciles the detail sum to the file's Grand Total (fails on
// mismatch), maps Branch→warehouse (unmapped = loud failure), aggregates to (sku,warehouse), resolves Code against
// planner.products.sku (unmatched reported + dropped, never guessed), then upserts. Migration 232 must be applied first.

import 'dotenv/config';
import ExcelJS from 'exceljs';
import pg from 'pg';

// ── Branch → warehouse (HORIZON_INVENTORY_SNAPSHOT_SEED §5). null = deliberate exclude; ABSENT = loud failure. ──
const BRANCH_MAP = {
  'UK ILG': 'uk_3pl', 'US Geneva': 'us_3pl', 'AU Coghlans': 'au_3pl', 'US AWD': 'us_awd', 'US FBA': 'us_fba',
  'EU iFulfillment': 'eu_3pl', 'UK FBA': 'uk_fba', 'UK ILG non grs': 'uk_nongrs', 'US Geneva non GRS': 'us_nongrs',
  'AU FBA': 'au_fba', 'EU FBA': 'eu_fba', 'CA FBA': 'ca_fba', 'EU ILG': 'eu_3pl',
  // excluded (not planning stock / committed / test / in-transit / own table):
  'AU Embroidery': null, 'US B2B': null, 'Zalando': null, 'China Stock': null, 'UK B2B JLEW': null, 'JP FBA': null,
  '3PL Test': null, 'Nordstrom Test': null, 'US Walmart': null, 'CA Propack': null, 'Direct to Client': null, 'UK Head Office': null,
  'EU Preorder': null, 'US Preorder': null, 'UK Preorder': null, 'AU Preorder': null,   // preorder = committed / not-yet-received, not on-hand stock
};
const WH_ALLOW = new Set(['uk_3pl','us_3pl','au_3pl','eu_3pl','uk_fba','us_fba','au_fba','eu_fba','ca_fba','us_awd','uk_nongrs','us_nongrs']);

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const file = args.find(a => !a.startsWith('--'));
const dateArg = (args.find(a => a.startsWith('--date=')) || '').split('=')[1];
const source = (args.find(a => a.startsWith('--source=')) || '--source=erp_seed').split('=')[1];
const num = (v) => { if (v == null) return NaN; const n = Number(String(v).replace(/,/g, '').trim()); return Number.isFinite(n) ? n : NaN; };
const fail = (m) => { console.error('FAIL:', m); process.exit(1); };

if (!file) fail('give the xlsx path as the first argument');
if (!/^\d{4}-\d{2}-\d{2}$/.test(dateArg || '')) fail('give the snapshot date as --date=YYYY-MM-DD (the AS-OF date, not the export date)');

(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const ws = wb.worksheets[0];

  // find the header row (Branch/Category/Code/SOH Total), then map columns by name
  let headerRow = 0, col = {};
  for (let r = 1; r <= Math.min(ws.rowCount, 20); r++) {
    const vals = []; for (let c = 1; c <= ws.columnCount; c++) vals.push(String(ws.getRow(r).getCell(c).value ?? '').trim());
    const bi = vals.indexOf('Branch'), ci = vals.indexOf('Code'), si = vals.findIndex(v => /^SOH Total$/i.test(v));
    if (bi >= 0 && ci >= 0 && si >= 0) { headerRow = r; col = { branch: bi + 1, code: ci + 1, soh: si + 1, cat: vals.indexOf('Category') + 1 }; break; }
  }
  if (!headerRow) fail('could not find the header row (Branch / Code / SOH Total)');

  let read = 0, dropped = 0, detailSum = 0, grandTotal = null, negatives = 0;
  const byPair = new Map();          // "skuwarehouse" -> units
  const excludedBranchUnits = {};    // excluded branch -> units (reporting)
  const unmapped = new Map();        // unmapped branch -> units (fatal)

  for (let r = headerRow + 1; r <= ws.rowCount; r++) {
    const branch = String(ws.getRow(r).getCell(col.branch).value ?? '').trim();
    const code = String(ws.getRow(r).getCell(col.code).value ?? '').trim();
    const soh = num(ws.getRow(r).getCell(col.soh).value);
    // Grand Total / subtotal rows: this export labels them "Grand Total"; also drop null/blank Code.
    if (branch === 'Grand Total' || code === 'Grand Total') { if (Number.isFinite(soh) && grandTotal == null) grandTotal = soh; continue; }
    if (!code) { dropped++; continue; }                    // blank Code = a subtotal row
    if (!Number.isFinite(soh)) { dropped++; continue; }
    read++; detailSum += soh; if (soh < 0) negatives++;
    if (!(branch in BRANCH_MAP)) { unmapped.set(branch, (unmapped.get(branch) || 0) + soh); continue; }
    const wh = BRANCH_MAP[branch];
    if (wh === null) { excludedBranchUnits[branch] = (excludedBranchUnits[branch] || 0) + soh; continue; }
    if (!WH_ALLOW.has(wh)) fail('mapped warehouse not in allow-list: ' + wh);
    const key = code + '\x1f' + wh;
    byPair.set(key, (byPair.get(key) || 0) + soh);
  }

  // Reconcile the detail sum to the file's own Grand Total (free integrity check).
  if (grandTotal == null) fail('no Grand Total row found to reconcile against');
  if (Math.round(detailSum) !== Math.round(grandTotal)) fail(`detail sum ${Math.round(detailSum)} != Grand Total ${Math.round(grandTotal)}`);

  // Unmapped branches halt the load (the ERP branch list drifts from planner.branches; fail noisily).
  if (unmapped.size) { console.error('UNMAPPED branches (map or exclude them, then re-run):'); for (const [b, u] of unmapped) console.error(`   "${b}"  ${Math.round(u)} units`); process.exit(1); }

  // Resolve Codes against planner.products.sku.
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const known = new Set((await client.query('SELECT sku FROM planner.products')).rows.map(r => r.sku));
  const rows = [], unmatched = new Map();
  let mappedUnits = 0;
  for (const [key, units] of byPair) {
    const [sku, wh] = key.split('\x1f');
    if (!known.has(sku)) { unmatched.set(sku, (unmatched.get(sku) || 0) + units); continue; }
    rows.push({ sku, wh, units }); mappedUnits += units;
  }

  // ── Summary (§8) ──
  const byWh = {}; rows.forEach(r => byWh[r.wh] = (byWh[r.wh] || 0) + r.units);
  console.log('── seed summary ──');
  console.log('file:', file, '| snapshot_date:', dateArg, '| source:', source, '| mode:', APPLY ? 'APPLY' : 'DRY RUN');
  console.log('detail rows read:', read, '| subtotal/blank dropped:', dropped, '| Grand Total reconciled:', Math.round(grandTotal));
  console.log('negatives (loaded as-is):', negatives);
  console.log('excluded branches:', Object.keys(excludedBranchUnits).length ? Object.entries(excludedBranchUnits).map(([b, u]) => `${b}=${Math.round(u)}`).join(', ') : 'none');
  console.log('unmatched SKU codes:', unmatched.size, '(', Math.round([...unmatched.values()].reduce((a, b) => a + b, 0)), 'units, dropped)');
  if (unmatched.size) { console.log('  top unmatched:', [...unmatched.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([s, u]) => `${s}(${Math.round(u)})`).join(', ')); }
  console.log('(sku,warehouse) rows to write:', rows.length, '| mapped units:', Math.round(mappedUnits));
  console.log('units by warehouse:', Object.entries(byWh).map(([w, u]) => `${w}=${Math.round(u)}`).join(', '));
  const covered = Math.round(mappedUnits + [...unmatched.values()].reduce((a, b) => a + b, 0));
  console.log('planning-warehouse coverage: ~' + Math.round(100 * (mappedUnits) / grandTotal) + '% of Grand Total (before excludes)');

  if (!APPLY) { console.log('\nDRY RUN — nothing written. Re-run with --apply to upsert.'); await client.end(); return; }

  // Upsert in chunks (idempotent on the PK).
  let written = 0;
  for (let i = 0; i < rows.length; i += 1000) {
    const chunk = rows.slice(i, i + 1000);
    const vals = chunk.map((_, j) => `($${j * 5 + 1},$${j * 5 + 2},$${j * 5 + 3}::date,$${j * 5 + 4},$${j * 5 + 5})`).join(',');
    const params = chunk.flatMap(r => [r.sku, r.wh, dateArg, r.units, source]);
    await client.query(`INSERT INTO planner.inventory_snapshots (sku,warehouse,snapshot_date,available,source) VALUES ${vals}
      ON CONFLICT (sku,warehouse,snapshot_date) DO UPDATE SET available=EXCLUDED.available, source=EXCLUDED.source`, params);
    written += chunk.length;
  }
  console.log('\nAPPLIED — rows written:', written);
  await client.end();
})().catch(e => fail(e.message));
