// Sandbox-only migration applier. Reads DATABASE_URL from .env (Ben's sandbox, ref mgqrcupazffvpzpeuxzt).
// Standing permission to alter the sandbox (memory: apply-sandbox-migrations-locally). Never prints the password.
const fs = require('fs'), path = require('path');
const env = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
const url = (env.match(/^DATABASE_URL=(.*)$/m) || [])[1].trim().replace(/^["']|["']$/g, '');
const { Client } = require('pg');
const file = process.argv[2];
(async () => {
  const c = new Client({ connectionString: url });
  await c.connect();
  await c.query(fs.readFileSync(file, 'utf8'));
  const r = await c.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='planner' AND table_name='carrier_tracking' ORDER BY ordinal_position`);
  console.log('APPLIED', path.basename(file));
  console.log('carrier_tracking:', r.rows.map(x => `${x.column_name}:${x.data_type}`).join(', ') || '(not created)');
  await c.end();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
