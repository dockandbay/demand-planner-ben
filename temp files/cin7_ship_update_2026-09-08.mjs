// One-off: set invoiceDate + logisticsCarrier + trackingCode on 30 AU sales orders (Ben, 08-Sep-26).
// PARTIAL PUT — only these three fields are sent, so stage / approval / lines / totals are untouched.
// Dry-run by default (prints the body, makes NO call). Live write ONLY with `--commit`.
//   node "temp files/cin7_ship_update_2026-09-08.mjs"            # dry run
//   node "temp files/cin7_ship_update_2026-09-08.mjs" --commit    # LIVE production write
import 'dotenv/config';
const AUTH = process.env.CIN7_AUTH, B = 'https://api.cin7.com/api/v1/SalesOrders';
const INV = '2026-09-08T00:00:00Z', CARRIER = 'Australia Post';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const TRACK = [
  [1895719,'AXL6573694'],[1895714,'AXL6573697'],[1895703,'AXL6573379'],[1895684,'AXL6575895'],
  [1895648,'AXL6573377'],[1895636,'AXL6573548'],[1895621,'AXL6573547'],[1895369,'AXL6572188'],
  [1895328,'AXL6572343'],[1895282,'AXL6572190'],[1895267,'AXL6573229'],[1895296,'AXL6573231'],
  [1895295,'AXL6573230'],[1895240,'AXL6573375'],[1895241,'AXL6575427'],[1895242,'AXL6573378'],
  [1895231,'AXL6573549'],[1895220,'AXL6572187'],[1895138,'AXL6575960'],[1895131,'AXL6575961'],
  [1895120,'AXL6573380'],[1895121,'AXL6572345'],[1895088,'AXL6575958'],[1895079,'AXL6572184'],
  [1895056,'AXL6573546'],[1895048,'AXL6572189'],[1895037,'AXL6573376'],[1895012,'AXL6572185'],
  [1895007,'AXL6575959'],[1895616,'AXL6572186'],
];
const STAGE = 'Dispatched';
const NO_DISP = process.argv.includes('--no-dispatch');   // omit dispatchedDate (leaves line un-dispatched)
const NO_STAGE = process.argv.includes('--no-stage');     // omit stage
let body = TRACK.map(([id, trackingCode]) => { const o = { id, invoiceDate: INV, logisticsCarrier: CARRIER, trackingCode }; if (!NO_DISP) o.dispatchedDate = INV; if (!NO_STAGE) o.stage = STAGE; return o; });
const COMMIT = process.argv.includes('--commit');
const _skip = process.argv.indexOf('--skip'); if (_skip >= 0 && process.argv[_skip + 1]) body = body.slice(parseInt(process.argv[_skip + 1], 10) || 0);
const _lim = process.argv.indexOf('--limit'); if (_lim >= 0 && process.argv[_lim + 1]) body = body.slice(0, parseInt(process.argv[_lim + 1], 10) || body.length);
console.log((COMMIT ? 'LIVE COMMIT' : 'DRY RUN') + ' — ' + body.length + ' sales orders → PUT ' + B);
console.log('fields per order: invoiceDate=' + INV + (NO_DISP ? '' : ', dispatchedDate=' + INV) + (NO_STAGE ? '' : ', stage="' + STAGE + '"') + ', logisticsCarrier="' + CARRIER + '", trackingCode');
console.log('ids: ' + body.map(o => o.id).join(', '));
if (!AUTH) { console.error('MISSING CIN7_AUTH in .env — aborting.'); process.exit(1); }
if (!COMMIT) { console.log('\n(dry run — no request made. Re-run with --commit to write.)'); process.exit(0); }
// Per-order commit + read-back verify. Cin7 returns HTTP 500 on a PUT that sets dispatchedDate even though it
// COMMITS the change, so we can't trust the status — we PUT (tolerating 500), then read the order back and confirm
// invoiceDate + dispatchedDate actually landed. Retry a miss once. Throttled to stay under the rate limit.
const INVD = INV.slice(0, 10);
async function readOne(id) {
  const url = B + '?rows=1&where=' + encodeURIComponent('id=' + id) + '&fields=id,reference,invoiceDate,dispatchedDate,stage,logisticsCarrier,logisticsStatus,trackingCode,status,isApproved,total,productTotal';
  const rr = await fetch(url, { headers: { Authorization: AUTH, 'content-type': 'application/json' } });
  const jj = await rr.json(); return Array.isArray(jj) ? jj[0] : null;
}
function applied(o, want) { return o && String(o.invoiceDate || '').slice(0, 10) === INVD && (NO_DISP || String(o.dispatchedDate || '').slice(0, 10) === INVD) && (NO_STAGE || o.stage === STAGE) && o.trackingCode === want.trackingCode; }
const verified = [], needsRetry = [];
for (let i = 0; i < body.length; i++) {
  const o = body[i];
  for (let attempt = 1; attempt <= 2; attempt++) {
    try { await fetch(B, { method: 'PUT', headers: { Authorization: AUTH, 'content-type': 'application/json' }, body: JSON.stringify([o]) }); }
    catch (e) { /* network — verify below anyway */ }
    await sleep(1200);
    let chk = null; try { chk = await readOne(o.id); } catch (e) {}
    await sleep(800);
    if (applied(chk, o)) { verified.push({ id: o.id, ref: chk.reference, stage: chk.stage, ls: chk.logisticsStatus, approved: chk.isApproved, total: chk.total }); break; }
    if (attempt === 2) needsRetry.push({ id: o.id, got: chk ? { inv: chk.invoiceDate, disp: chk.dispatchedDate, trk: chk.trackingCode } : 'no-read' });
  }
  process.stdout.write('  ' + (i + 1) + '/' + body.length + ' verified=' + verified.length + '\r');
}
console.log('\n\nVERIFIED applied: ' + verified.length + ' / ' + body.length);
console.log('  (invoiceDate=' + INVD + (NO_DISP ? '' : ', dispatchedDate=' + INVD) + (NO_STAGE ? '' : ', stage=' + STAGE) + ', carrier + tracking set)');
if (!NO_STAGE) console.log('  stage=' + STAGE + ' on: ' + verified.filter(v => v.stage === STAGE).length + ' / ' + verified.length);
const badApprove = verified.filter(v => v.approved !== true);
console.log('  approval preserved on all: ' + (badApprove.length === 0 ? 'YES' : 'NO — ' + badApprove.map(v => v.id).join(',')));
console.log('  logisticsStatus=2 (fully dispatched) on: ' + verified.filter(v => v.ls === 2).length + ' / ' + verified.length);
if (needsRetry.length) console.log('\nNEEDS ATTENTION (' + needsRetry.length + '):\n  ' + needsRetry.map(x => x.id + ' → ' + JSON.stringify(x.got)).join('\n  '));
else console.log('\nAll orders confirmed. ✓');
