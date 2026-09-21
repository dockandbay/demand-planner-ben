// TEST: fully dispatch the LINE ITEMS of one sales order (set qtyShipped = qty per line → Cin7 records the
// shipment + creates stock movements). Header fields kept as before. LIVE on --commit; dry-run otherwise.
//   node "temp files/cin7_dispatch_line_test.mjs" <id>           # dry run (shows what would be sent)
//   node "temp files/cin7_dispatch_line_test.mjs" <id> --commit  # LIVE
import 'dotenv/config';
const AUTH = process.env.CIN7_AUTH, B = 'https://api.cin7.com/api/v1/SalesOrders';
const INV = '2026-09-08T00:00:00Z', CARRIER = 'Australia Post', STAGE = 'Dispatched';
const TRACK = { 1895719:'AXL6573694',1895714:'AXL6573697',1895703:'AXL6573379',1895684:'AXL6575895',1895648:'AXL6573377',1895636:'AXL6573548',1895621:'AXL6573547',1895369:'AXL6572188',1895328:'AXL6572343',1895282:'AXL6572190',1895267:'AXL6573229',1895296:'AXL6573231',1895295:'AXL6573230',1895240:'AXL6573375',1895241:'AXL6575427',1895242:'AXL6573378',1895231:'AXL6573549',1895220:'AXL6572187',1895138:'AXL6575960',1895131:'AXL6575961',1895120:'AXL6573380',1895121:'AXL6572345',1895088:'AXL6575958',1895079:'AXL6572184',1895056:'AXL6573546',1895048:'AXL6572189',1895037:'AXL6573376',1895012:'AXL6572185',1895007:'AXL6575959',1895616:'AXL6572186' };
const id = parseInt(process.argv[2], 10);
const COMMIT = process.argv.includes('--commit');
if (!id) { console.error('usage: node cin7_dispatch_line_test.mjs <id> [--commit]'); process.exit(1); }
if (!AUTH) { console.error('MISSING CIN7_AUTH'); process.exit(1); }
const read = async () => (await (await fetch(B + '?rows=1&where=' + encodeURIComponent('id=' + id), { headers: { Authorization: AUTH, 'content-type': 'application/json' } })).json())[0];
const o = await read();
console.log('order ' + id + ' (' + o.reference + ') — stage=' + o.stage + ' logisticsStatus=' + o.logisticsStatus + ' lines=' + (o.lineItems || []).length);
(o.lineItems || []).forEach(l => console.log('  ' + l.code + '  qty=' + l.qty + '  qtyShipped(before)=' + l.qtyShipped + '  stockMovements=' + (l.stockMovements || []).length));
// Build line payload: keep identity fields, set qtyShipped = qty (and uomQtyShipped = uomQtyOrdered).
const lineItems = (o.lineItems || []).map(l => ({
  id: l.id, productId: l.productId, productOptionId: l.productOptionId, code: l.code, name: l.name,
  option1: l.option1, option2: l.option2, option3: l.option3, qty: l.qty, unitPrice: l.unitPrice,
  unitCost: l.unitCost, discount: l.discount, uomQtyOrdered: l.uomQtyOrdered, uomQtyShipped: l.uomQtyOrdered,
  qtyShipped: l.qty, taxRate: l.taxRate, stockControl: l.stockControl,
}));
const payload = [{ id, invoiceDate: INV, dispatchedDate: INV, stage: STAGE, logisticsCarrier: CARRIER, trackingCode: TRACK[id] || o.trackingCode, lineItems }];
if (!COMMIT) { console.log('\nDRY RUN — would PUT:\n' + JSON.stringify(payload, null, 2).slice(0, 1400)); process.exit(0); }
const r = await fetch(B, { method: 'PUT', headers: { Authorization: AUTH, 'content-type': 'application/json' }, body: JSON.stringify(payload) });
console.log('\nPUT HTTP ' + r.status + ' — ' + (await r.text()).slice(0, 200));
await new Promise(x => setTimeout(x, 1500));
const o2 = await read();
console.log('\nAFTER: stage=' + o2.stage + ' logisticsStatus=' + o2.logisticsStatus);
(o2.lineItems || []).forEach(l => console.log('  ' + l.code + '  qty=' + l.qty + '  qtyShipped(after)=' + l.qtyShipped + '  stockMovements=' + (l.stockMovements || []).length));
