// v28.603: one-off import of the "B2B - Direct to Client Forecast" sheet into CLIENT > B2B forecast.
// The server has no Google Sheets access, so export the tab B2B_DIRECT_FORECAST as CSV (File > Download > CSV) or copy
// columns C..O into a .tsv file, then:
//   node scripts/import-b2b-forecast.mjs <file>                       preview: rows, skipped, flagged dates, GBP values
//   node scripts/import-b2b-forecast.mjs <file> --apply --url <HORIZON base url> [--replace]
// --apply posts to /api/client/b2b-forecast/import on a HORIZON you can reach without the login gate (local or sandbox).
// On production use CLIENT > B2B forecast > Import from sheet (admin), which runs the same import.
import fs from 'node:fs';
import { b2bParseSheet, b2bSplitText, b2bCalc, b2bDateSuspect } from '../lib/b2b_forecast.mjs';

const args = process.argv.slice(2), file = args.find(a => !a.startsWith('--'));
if (!file) { console.error('usage: node scripts/import-b2b-forecast.mjs <csv|tsv> [--apply --url <base>] [--replace]'); process.exit(1); }
let text = fs.readFileSync(file, 'utf8');
// A full-tab CSV export starts at column A: drop columns A and B so the cells line up with C..O.
const cells = b2bSplitText(text).map(r => (/^client$/i.test(String(r[2] || '').trim()) || r.length >= 15 ? r.slice(2) : r));
const hdr = cells.findIndex(r => /^client$/i.test(String(r[0] || '').trim()));
const P = b2bParseSheet(hdr >= 0 ? cells.slice(hdr) : cells);
const fx = { 2026: { USD: 1.344789, EUR: 1.154638, AUD: 1.9, CAD: 1.855467 }, 2027: { USD: 1.344789, EUR: 1.154638, AUD: 1.9, CAD: 1.855467 } };   // preview only; the server uses CONFIG > Exchange rates
const today = new Date().toISOString().slice(0, 10);
console.log(`Rows to import: ${P.rows.length} (${P.rows.filter(r => r.bucket).length} buckets). Skipped: ${P.skipped.length}`);
P.skipped.forEach(s => console.log(`  skipped line ${s.line}: ${s.why}${s.client ? ' (' + s.client + ')' : ''}`));
P.flagged.forEach(r => console.log(`  check dates, line ${r.line} ${r.client_label}: ${(r.import_flags || []).map(f => f.field + ' "' + f.raw + '"').concat([r.order_date, r.ship_date].concat(r.payments.map(p => p.due_date)).filter(b2bDateSuspect)).join(', ')}`));
let wb = 0, hz = 0; for (const r of P.rows) { const c = b2bCalc(r, fx, null, today); const old = r.currency === 'USD' ? r.value_source / 1.883 : r.currency === 'EUR' ? r.value_source / 1.873 : null;
  if (old != null && c.value_gbp != null) { wb += old; hz += c.value_gbp; } }
console.log(`USD + EUR rows: workbook £${Math.round(wb).toLocaleString('en-GB')} vs HORIZON (preview rates) £${Math.round(hz).toLocaleString('en-GB')}`);
if (args.includes('--apply')) {
  const ui = args.indexOf('--url'), base = ui >= 0 ? args[ui + 1] : null; if (!base) { console.error('--apply needs --url'); process.exit(1); }
  const tsv = (hdr >= 0 ? cells.slice(hdr) : cells).map(r => r.slice(0, 13).map(x => String(x == null ? '' : x).replace(/[\t\n]/g, ' ')).join('\t')).join('\n');
  const res = await fetch(base.replace(/\/$/, '') + '/api/client/b2b-forecast/import', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: tsv, apply: true, replace: args.includes('--replace') }) });
  const j = await res.json().catch(() => ({ error: 'HTTP ' + res.status })); console.log(j.error ? 'Import refused: ' + j.error : `Imported ${j.imported} rows. Unmatched clients: ${(j.summary.unmatched_clients || []).length}`);
  if (j.error) process.exit(1);
}
