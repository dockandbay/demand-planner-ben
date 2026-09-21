const fs = require('fs');
const path = require('path');
const env = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
const m = env.match(/^DATABASE_URL=(.*)$/m);
const url = m ? m[1].trim().replace(/^["']|["']$/g,'') : null;
const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: url });
  await c.connect();
  for (const t of ['sample_requests','shipments','app_settings','carrier_tracking']) {
    const r = await c.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='planner' AND table_name=$1 ORDER BY ordinal_position`, [t]);
    console.log(`\n=== ${t} (${r.rows.length} cols) ===`);
    console.log(r.rows.map(x=>`${x.column_name}:${x.data_type}`).join(', ') || '(table does not exist)');
  }
  const pk = await c.query(`SELECT a.attname FROM pg_index i JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=ANY(i.indkey) WHERE i.indrelid='planner.shipments'::regclass AND i.indisprimary`);
  console.log('\nshipments PK:', pk.rows.map(x=>x.attname).join(',') || '(none)');
  await c.end();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
