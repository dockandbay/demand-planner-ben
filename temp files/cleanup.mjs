import 'dotenv/config';
import pg from 'pg';
const LIVE_POS = ["PO-1712952A","PO-1678119","PO-57DILLARDS-XRJULY","PO-1845589","PO-57DILLARDS-LXJULY","PO-DILLARDS-3222503005","PO-1881859","PO-1881862","PO-1881865","PO-57EXCESS-S","PO-1845586","PO-56UKLX3-BUNDLE","PO-1842654","PO-1881864","PO-1802892","PO-57UKLX-GOLDSEAL","PO-1725132-JL-HW","PO-57UKBL-GOLDSEAL","PO-1678113-XR-NEXT-HW","PO-57UKBE-GOLDSEAL","PO-1700657-XR-NEXT-HW","PO-1678119-LX-NEXT-HW","PO-57UKWK-GOLDSEAL","PO-1700649-LX-NEXT-HW"];
const LIVE_SOS = "1824060,1801879,1727664,1722900,1698886,1837585,1867127,1867126,1867125,1867124,1867123,1867122,1867121,1867120,1867119,1867118,1867117,1867116,1867115,1867114,1867113,1867111,1867110,1864504,1860936,1837841,1868964,1866861,1848178,1837562,1676755,1891138,1890021,1867112,1837800".split(",").map(Number);
const DTC = ['Direct to Client','UK B2B JLEW','UK B2B NEXT'];
const c = new pg.Client({connectionString: process.env.DATABASE_URL}); await c.connect();
await c.query('BEGIN');
try {
  // stale open DTC POs = open DTC-branch POs not in live's 24
  const stalePo = (await c.query(`SELECT po FROM planner.purchase_orders WHERE branch = ANY($1)
    AND coalesce(status,'') NOT ILIKE '%complete%' AND coalesce(status,'') NOT ILIKE '%cancel%' AND coalesce(status,'') NOT ILIKE '%void%'
    AND NOT (po = ANY($2))`, [DTC, LIVE_POS])).rows.map(r=>r.po);
  await c.query(`DELETE FROM planner.purchase_order_lines WHERE po = ANY($1)`, [stalePo]);
  await c.query(`DELETE FROM planner.purchase_orders WHERE po = ANY($1)`, [stalePo]);
  // stale open SOs = open dtc_sales_orders not in live's 35
  const staleSo = (await c.query(`SELECT cin7_id FROM planner.dtc_sales_orders WHERE NOT is_void AND dispatched_date IS NULL AND NOT (cin7_id = ANY($1))`, [LIVE_SOS])).rows.map(r=>r.cin7_id);
  await c.query(`DELETE FROM planner.dtc_sales_order_lines WHERE so_cin7_id = ANY($1)`, [staleSo]);
  await c.query(`DELETE FROM planner.dtc_sales_orders WHERE cin7_id = ANY($1)`, [staleSo]);
  await c.query('COMMIT');
  console.log('removed stale open POs:', stalePo.length, '| stale open SOs:', staleSo.length);
} catch(e){ await c.query('ROLLBACK'); console.error('CLEANUP FAILED:', e.message); await c.end(); process.exit(1); }
const chk = await c.query(`SELECT
  (SELECT count(*) FROM planner.purchase_orders WHERE branch = ANY($1) AND coalesce(status,'') NOT ILIKE '%complete%' AND coalesce(status,'') NOT ILIKE '%cancel%' AND coalesce(status,'') NOT ILIKE '%void%') po_open,
  (SELECT count(*) FROM planner.dtc_sales_orders WHERE NOT is_void AND dispatched_date IS NULL) so_open`, [DTC]);
console.log('sandbox now (should be 24 / 35):', JSON.stringify(chk.rows[0]));
await c.end();
