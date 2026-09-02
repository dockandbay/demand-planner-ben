import 'dotenv/config';
import fs from 'fs';
import pg from 'pg';
const raw = fs.readFileSync('/Users/bm/.claude/projects/-Users-bm-Documents-CLAUDE-horizon-demand-and-supply-planner/1af9c0e7-e5c6-46d9-972e-cf1913767b9c/tool-results/mcp-claude_ai_Supabase-execute_sql-1788323163493.txt','utf8');
const outer = JSON.parse(raw);            // {result: "...text with [{\"seed\":...}]..."}
const txt = outer.result;
const i = txt.indexOf('[{"seed"');
const end = txt.lastIndexOf(']');
const arr = JSON.parse(txt.slice(i, end+1));
const sql = arr[0].seed;
fs.writeFileSync('temp files/dtc_seed.sql', sql);
console.log('seed SQL length:', sql.length, '| ; count', (sql.match(/;/g)||[]).length);
const c = new pg.Client({connectionString: process.env.DATABASE_URL}); await c.connect();
await c.query('BEGIN');
try { await c.query(sql); await c.query('COMMIT'); console.log('SEED APPLIED OK'); }
catch(e){ await c.query('ROLLBACK'); console.error('SEED FAILED:', e.message); await c.end(); process.exit(1); }
const chk = await c.query(`SELECT
  (SELECT count(*) FROM planner.purchase_orders WHERE branch IN ('Direct to Client','UK B2B JLEW','UK B2B NEXT') AND coalesce(status,'') NOT ILIKE '%complete%' AND coalesce(status,'') NOT ILIKE '%cancel%' AND coalesce(status,'') NOT ILIKE '%void%') po_open,
  (SELECT count(*) FROM planner.purchase_order_lines WHERE po IN (SELECT po FROM planner.purchase_orders WHERE branch IN ('Direct to Client','UK B2B JLEW','UK B2B NEXT'))) po_lines_dtc,
  (SELECT count(*) FROM planner.dtc_sales_orders WHERE NOT is_void AND dispatched_date IS NULL) so_open,
  (SELECT count(*) FROM planner.dtc_sales_order_lines) so_lines`);
console.log('sandbox now:', JSON.stringify(chk.rows[0]));
await c.end();
