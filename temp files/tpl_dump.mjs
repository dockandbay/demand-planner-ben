import 'dotenv/config';
import pg from 'pg';
import { writeFileSync, mkdirSync } from 'fs';
const OUT = process.argv[2] || '/tmp/tpl';
mkdirSync(OUT, { recursive: true });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl:{rejectUnauthorized:false}, max:3 });
const rows = (await pool.query(`SELECT id, tpl, period, filename, content_type, byte_size FROM planner.tpl_invoice_files ORDER BY tpl, period, id`)).rows;
console.log('id\ttpl\tperiod\tsize\ttype\tfilename');
for (const r of rows) console.log([r.id,r.tpl,r.period,r.byte_size,r.content_type,r.filename].join('\t'));
// dump requested ids
const ids = (process.argv[3]||'').split(',').filter(Boolean).map(Number);
if (ids.length) {
  for (const id of ids) {
    const r = (await pool.query(`SELECT tpl,period,filename,content FROM planner.tpl_invoice_files WHERE id=$1`,[id])).rows[0];
    if (!r) { console.log('missing', id); continue; }
    const safe = `${id}_${r.tpl}_${r.period}_${r.filename}`.replace(/[^\w.\-]/g,'_');
    writeFileSync(`${OUT}/${safe}`, r.content);
    console.log('wrote', `${OUT}/${safe}`);
  }
}
await pool.end();
