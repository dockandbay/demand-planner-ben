import 'dotenv/config';
import pg from 'pg';
// parse DATABASE_URL (password may contain special chars) — use as-is
const CONN = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString: CONN, ssl:{rejectUnauthorized:false}, max:3 });
const q = (s,p)=>pool.query(s,p).then(r=>r.rows);
try {
  // 1. what tables exist
  const files = await q(`SELECT tpl, period, count(*) n, sum(byte_size) bytes FROM planner.tpl_invoice_files GROUP BY 1,2 ORDER BY 1,2`).catch(e=>({err:e.message}));
  console.log('=== tpl_invoice_files (tpl,period,count) ===');
  console.log(JSON.stringify(files,null,1));
  const lineCols = await q(`SELECT column_name FROM information_schema.columns WHERE table_schema='planner' AND table_name='tpl_invoice_lines' ORDER BY ordinal_position`);
  console.log('=== tpl_invoice_lines columns ===', lineCols.map(r=>r.column_name).join(', '));
  const lc = await q(`SELECT count(*) FROM planner.tpl_invoice_lines`).catch(e=>({err:e.message}));
  console.log('=== tpl_invoice_lines row count ===', JSON.stringify(lc));
  // 2. aggregate order costs by tpl
  const agg = await q(`
    SELECT tpl,
      count(*) FILTER (WHERE cost_type='order') AS order_lines,
      count(DISTINCT coalesce(cin7_order,sales_order_ref)) FILTER (WHERE cost_type='order') AS distinct_orders,
      round(sum(amount) FILTER (WHERE cost_type='order')::numeric,2) AS order_amount,
      round(sum(amount) FILTER (WHERE cost_type='storage')::numeric,2) AS storage_amount,
      round(sum(amount) FILTER (WHERE cost_type='other')::numeric,2) AS other_amount,
      min(period) minp, max(period) maxp
    FROM planner.tpl_invoice_lines GROUP BY tpl ORDER BY tpl`).catch(e=>({err:e.message}));
  console.log('=== order cost aggregate by tpl ===');
  console.log(JSON.stringify(agg,null,1));
} catch(e){ console.error('FATAL', e.message); }
await pool.end();
