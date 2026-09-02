import 'dotenv/config';
import fs from 'fs';
import pg from 'pg';
let sql = fs.readFileSync('temp files/dtc_seed.sql','utf8');
sql = sql.replace(
  '(id,po_sku,po,sku,qty) SELECT (SELECT coalesce(max(id),0) FROM planner.purchase_order_lines)+row_number() over(), v.po_sku, v.po, v.sku, v.qty',
  '(po_sku,po,sku,qty) SELECT v.po_sku, v.po, v.sku, v.qty');
sql = sql.replace(
  '(id,so_cin7_id,code,name,qty) SELECT (SELECT coalesce(max(id),0) FROM planner.dtc_sales_order_lines)+row_number() over(), v.so, v.code, v.name, v.qty',
  '(so_cin7_id,code,name,qty) SELECT v.so::bigint, v.code, v.name, v.qty');
const fix = `SELECT setval(pg_get_serial_sequence('planner.purchase_order_lines','id'), (SELECT coalesce(max(id),1) FROM planner.purchase_order_lines));
SELECT setval(pg_get_serial_sequence('planner.dtc_sales_order_lines','id'), (SELECT coalesce(max(id),1) FROM planner.dtc_sales_order_lines));
`;
sql = fix + sql;
const c = new pg.Client({connectionString: process.env.DATABASE_URL}); await c.connect();
await c.query('BEGIN');
try { await c.query(sql); await c.query('COMMIT'); console.log('SEED APPLIED OK'); }
catch(e){ await c.query('ROLLBACK'); console.error('SEED FAILED:', e.message); await c.end(); process.exit(1); }
const chk = await c.query(`SELECT
  (SELECT count(*) FROM planner.purchase_orders WHERE branch IN ('Direct to Client','UK B2B JLEW','UK B2B NEXT') AND coalesce(status,'') NOT ILIKE '%complete%' AND coalesce(status,'') NOT ILIKE '%cancel%' AND coalesce(status,'') NOT ILIKE '%void%') po_open,
  (SELECT count(*) FROM planner.purchase_order_lines WHERE po IN (SELECT po FROM planner.purchase_orders WHERE branch IN ('Direct to Client','UK B2B JLEW','UK B2B NEXT'))) po_lines_dtc,
  (SELECT count(*) FROM planner.dtc_sales_orders WHERE NOT is_void AND dispatched_date IS NULL) so_open,
  (SELECT count(*) FROM planner.dtc_sales_order_lines WHERE so_cin7_id IN (SELECT cin7_id FROM planner.dtc_sales_orders WHERE NOT is_void AND dispatched_date IS NULL)) so_lines_open`);
console.log('sandbox now:', JSON.stringify(chk.rows[0]));
await c.end();
