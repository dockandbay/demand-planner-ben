// Batch 2 (Ben, 08-Sep-26): invoiceDate=today + Australia Post carrier + trackingCode on 5 AU orders (by ref → id).
// Invoice-only — NO dispatchedDate / stage (line stays un-dispatched). Per-order PUT + read-back verify (Cin7 can
// 500-but-commit, so we trust the read-back, not the status). Dry-run by default; live only with --commit.
import 'dotenv/config';
const AUTH = process.env.CIN7_AUTH, B = 'https://api.cin7.com/api/v1/SalesOrders';
const INV = '2026-09-08T00:00:00Z', INVD = INV.slice(0, 10), CARRIER = 'Australia Post';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ORDERS = [ // ref, id, trackingCode
  ['AU-141773', 1895742, 'AXL6573696'], ['AU-141774', 1895784, 'AXL6576019'],
  ['AU-141775', 1895815, 'AXL6576017'], ['AU-141776', 1895814, 'AXL6576018'],
  ['AU-141777', 1895817, 'AXL6576020'],
];
const COMMIT = process.argv.includes('--commit');
if (!AUTH) { console.error('MISSING CIN7_AUTH'); process.exit(1); }
console.log((COMMIT ? 'LIVE COMMIT' : 'DRY RUN') + ' — ' + ORDERS.length + ' orders → invoiceDate=' + INVD + ', carrier="' + CARRIER + '", trackingCode (no dispatch/stage)');
ORDERS.forEach(([ref, id, trk]) => console.log('  ' + ref + '  id=' + id + '  trk=' + trk));
if (!COMMIT) { console.log('\n(dry run — no request made. Re-run with --commit.)'); process.exit(0); }
async function readOne(id) {
  const url = B + '?rows=1&where=' + encodeURIComponent('id=' + id) + '&fields=id,reference,invoiceDate,dispatchedDate,stage,logisticsCarrier,trackingCode,isApproved,total';
  const jj = await (await fetch(url, { headers: { Authorization: AUTH, 'content-type': 'application/json' } })).json();
  return Array.isArray(jj) ? jj[0] : null;
}
const verified = [], needsRetry = [];
for (let i = 0; i < ORDERS.length; i++) {
  const [ref, id, trk] = ORDERS[i];
  const payload = [{ id, invoiceDate: INV, logisticsCarrier: CARRIER, trackingCode: trk }];
  for (let attempt = 1; attempt <= 2; attempt++) {
    try { await fetch(B, { method: 'PUT', headers: { Authorization: AUTH, 'content-type': 'application/json' }, body: JSON.stringify(payload) }); } catch (e) {}
    await sleep(1200);
    let c = null; try { c = await readOne(id); } catch (e) {}
    await sleep(800);
    if (c && String(c.invoiceDate || '').slice(0, 10) === INVD && c.trackingCode === trk && c.logisticsCarrier === CARRIER) {
      verified.push({ ref, id, stage: c.stage, disp: String(c.dispatchedDate || '').slice(0, 10) || null, approved: c.isApproved }); break;
    }
    if (attempt === 2) needsRetry.push({ ref, id, got: c ? { inv: c.invoiceDate, trk: c.trackingCode } : 'no-read' });
  }
  process.stdout.write('  ' + (i + 1) + '/' + ORDERS.length + ' verified=' + verified.length + '\r');
}
console.log('\n\nVERIFIED: ' + verified.length + ' / ' + ORDERS.length + '  (invoiceDate=' + INVD + ', carrier + tracking)');
verified.forEach(v => console.log('  ' + v.ref + ' (id ' + v.id + ') stage=' + v.stage + ' dispatchedDate=' + v.disp + ' approved=' + v.approved));
console.log('approval preserved on all: ' + (verified.every(v => v.approved === true) ? 'YES' : 'NO'));
if (needsRetry.length) console.log('\nNEEDS ATTENTION:\n  ' + needsRetry.map(x => x.ref + ' ' + x.id + ' → ' + JSON.stringify(x.got)).join('\n  '));
else console.log('All confirmed. ✓');
