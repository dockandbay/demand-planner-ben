/**
 * Parse all DOK*.xlsx Coghlans invoices in this folder.
 * Reads the "Order Processing" sheet, maps columns by HEADER NAME (robust to
 * column drift), and extracts per-order: Customer Ref, dispatch Time Stamp,
 * Fulfilment Cost, Carrier Cost, Packaging Cost.
 * Also reads "Coghlan Settings" for Invoice Number + Effective Date.
 *
 * Output: writes coghlans_parsed.json (array, one entry per invoice) and prints
 * a one-line-per-invoice summary.
 *
 * Run:  node parse_coghlans.cjs
 */
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const DIR = __dirname;
const OUT = path.join(DIR, 'coghlans_parsed.json');

const norm = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().toLowerCase();
const num = v => {
  if (v == null || v === '') return 0;
  if (typeof v === 'object' && v.result != null) v = v.result; // formula cell
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? 0 : n;
};
const cellText = v => {
  if (v == null) return '';
  if (typeof v === 'object') {
    if (v.text != null) return String(v.text);
    if (v.result != null) return String(v.result);
    if (v.richText) return v.richText.map(r => r.text).join('');
  }
  return String(v);
};

// Header aliases -> canonical key. Order = priority (earlier wins), so the
// money "... Cost" columns are preferred over bare service/barcode columns.
const WANT = {
  ref:        ['customer ref', 'customer reference', 'cust ref', 'reference'],
  ts:         ['time stamp', 'timestamp', 'dispatch date', 'dispatched', 'date'],
  fulfilment: ['fulfilment cost', 'fulfillment cost', 'fulfilment', 'fulfillment'],
  carrier:    ['carrier cost', 'postage', 'freight', 'carrier'],
  packaging:  ['packaging cost', 'packing cost', 'packaging', 'packing'],
};

// Normalise a header for matching: lower-case, collapse spaces, and strip a
// trailing unit/parenthetical like " ($)", " (AUD)", or a trailing "$".
const normHeader = s => norm(s)
  .replace(/\s*\([^)]*\)\s*$/, '')   // drop trailing "( ... )"
  .replace(/\s*\$\s*$/, '')          // drop trailing "$"
  .trim();

function findHeaderRow(ws) {
  // Scan first ~20 rows for the row containing "customer ref"
  for (let r = 1; r <= Math.min(20, ws.rowCount); r++) {
    const row = ws.getRow(r);
    let hits = 0;
    row.eachCell({ includeEmpty: false }, c => {
      const t = normHeader(cellText(c.value));
      if (WANT.ref.includes(t) || WANT.ts.includes(t) || WANT.fulfilment.includes(t)) hits++;
    });
    if (hits >= 2) return r;
  }
  return null;
}

function mapColumns(ws, headerRow) {
  // For each key pick the column whose header has the best (lowest) alias rank.
  const best = {}; // key -> {col, rank}
  const row = ws.getRow(headerRow);
  row.eachCell({ includeEmpty: false }, (c, col) => {
    const t = normHeader(cellText(c.value));
    for (const key of Object.keys(WANT)) {
      const rank = WANT[key].indexOf(t);
      if (rank >= 0 && (best[key] == null || rank < best[key].rank)) best[key] = { col, rank };
    }
  });
  const map = {};
  for (const key of Object.keys(best)) map[key] = best[key].col;
  return map;
}

function readSettings(wb) {
  const ws = wb.worksheets.find(w => norm(w.name).includes('setting'));
  if (!ws) return {};
  const out = {};
  for (let r = 1; r <= Math.min(60, ws.rowCount); r++) {
    const row = ws.getRow(r);
    const vals = [];
    row.eachCell({ includeEmpty: true }, c => vals.push(cellText(c.value)));
    for (let i = 0; i < vals.length - 1; i++) {
      const label = norm(vals[i]);
      if (label.includes('invoice') && label.includes('number')) out.invoiceNumber = vals[i + 1].trim();
      if (label.includes('effective') || (label.includes('week') && label.includes('end'))) out.effectiveDate = vals[i + 1].trim();
      if (label.includes('account') && label.includes('code')) out.accountCode = vals[i + 1].trim();
    }
  }
  return out;
}

async function parseFile(file) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const ws = wb.worksheets.find(w => norm(w.name).includes('order processing'))
          || wb.worksheets.find(w => findHeaderRow(w));
  if (!ws) throw new Error('no Order Processing sheet in ' + path.basename(file));

  const hr = findHeaderRow(ws);
  if (!hr) throw new Error('no header row in ' + path.basename(file));
  const cols = mapColumns(ws, hr);
  if (!cols.ref || !cols.fulfilment) throw new Error('missing key cols in ' + path.basename(file) + ' -> ' + JSON.stringify(cols));

  const orders = [];
  for (let r = hr + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const ref = cellText(row.getCell(cols.ref).value).trim();
    if (!ref) continue;
    const ts = cellText(row.getCell(cols.ts || 1).value).trim();
    const fulfilment = num(row.getCell(cols.fulfilment).value);
    const carrier = cols.carrier ? num(row.getCell(cols.carrier).value) : 0;
    const packaging = cols.packaging ? num(row.getCell(cols.packaging).value) : 0;
    // skip total/blank rows: require a ref that looks like an order ref
    if (/^total/i.test(ref)) continue;
    orders.push({ ref, ts, fulfilment, carrier, packaging });
  }

  const settings = readSettings(wb);
  const sumFulf = orders.reduce((a, o) => a + o.fulfilment, 0);
  const sumCarr = orders.reduce((a, o) => a + o.carrier, 0);
  const sumPack = orders.reduce((a, o) => a + o.packaging, 0);
  const dok = (path.basename(file).match(/DOK\d+/i) || [''])[0].toUpperCase();

  return {
    file: path.basename(file),
    dok,
    invoiceNumber: settings.invoiceNumber || dok,
    effectiveDate: settings.effectiveDate || null,
    accountCode: settings.accountCode || null,
    headerRow: hr,
    colMap: cols,
    orderCount: orders.length,
    sumFulfilment: +sumFulf.toFixed(2),
    sumCarrier: +sumCarr.toFixed(2),
    sumPackaging: +sumPack.toFixed(2),
    sumReclassable: +(sumFulf + sumCarr).toFixed(2),
    orders,
  };
}

(async () => {
  const files = fs.readdirSync(DIR).filter(f => /^DOK\d+\.xlsx$/i.test(f)).sort();
  if (!files.length) { console.error('No DOK*.xlsx files found in ' + DIR); process.exit(1); }
  const out = [];
  for (const f of files) {
    try {
      const res = await parseFile(path.join(DIR, f));
      out.push(res);
      console.log(`${res.dok}  eff=${res.effectiveDate || '?'}  orders=${res.orderCount}  fulf=$${res.sumFulfilment}  carr=$${res.sumCarrier}  reclassable=$${res.sumReclassable}`);
    } catch (e) {
      console.error('ERR ' + f + ': ' + e.message);
    }
  }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log('\nWrote ' + OUT + ' (' + out.length + ' invoices)');
})();
