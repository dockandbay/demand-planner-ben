import 'dotenv/config';
import pg from 'pg';
const FROM = process.argv[2], TO = process.argv[3], DO = process.argv[4] === 'go';
if (!FROM || !TO) { console.error('usage: <FROM> <TO> [go]'); process.exit(1); }
const url = process.env.DATABASE_URL || '';
if (/oolwklahstnvocaugryg/.test(url)) { console.error('REFUSING: DATABASE_URL points at LIVE'); process.exit(1); }
const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
const tables = [
  ['planner.suppliers','name'],['planner.purchase_orders','supplier_name'],['planner.deposits','supplier_name'],
  ['planner.supplier_portal_users','supplier_name'],['planner.sample_requests','supplier_name'],
  ['planner.supplier_charges','supplier_name'],['planner.quality_docs','supplier_name'],['planner.payment_runs','supplier_name'],
  ['planner.production_deposits','supplier_name'],['planner.erp_purchase_orders','supplier_name'],['planner.products','main_supplier_final'],
];
const c = await pool.connect();
try {
  await c.query('BEGIN');
  for (const [t, col] of tables) {
    const ex = (await c.query(`SELECT to_regclass($1) r`, [t])).rows[0].r; if (!ex) { console.log(`  ${t}: (absent — skipped)`); continue; }
    if (DO) { const r = await c.query(`UPDATE ${t} SET ${col}=$1 WHERE ${col}=$2`, [TO, FROM]); if (r.rowCount) console.log(`  ${t}.${col}: ${r.rowCount} updated`); }
    else { const r = await c.query(`SELECT count(*)::int n FROM ${t} WHERE ${col}=$1`, [FROM]); if (r.rows[0].n) console.log(`  ${t}.${col}: ${r.rows[0].n} would change`); }
  }
  if (DO) { await c.query('COMMIT'); console.log(`COMMITTED: "${FROM}" -> "${TO}"`); }
  else { await c.query('ROLLBACK'); console.log(`DRY RUN (add "go" to apply)`); }
} catch (e) { await c.query('ROLLBACK'); console.error('ERROR (rolled back):', e.message); }
finally { c.release(); await pool.end(); }
