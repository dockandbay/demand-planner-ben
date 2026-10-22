// AW27 tea towel design PDFs: monday asset (1-hour signed link) -> Supabase Storage + planner.portal_attachments (category 'product',
// keyed by the product ref) on the SANDBOX, linked to the timeline note of the monday update it came with. Idempotent by po + filename.
require('dotenv').config({ quiet: true });
const { Client } = require('pg'); const fs = require('fs'); const crypto = require('crypto');
if (/oolwklahstnvocaugryg/.test(process.env.DATABASE_URL || '') || /oolwklahstnvocaugryg/.test(process.env.SUPABASE_URL || '')) { console.error('REFUSING: points at LIVE'); process.exit(1); }
const SB = process.env.SUPABASE_URL.replace(/\/+$/, ''), KEY = process.env.SUPABASE_SERVICE_ROLE_KEY, BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'horizon-uploads';
const MAX = (Number(process.env.STORAGE_MAX_MB) || 50) * 1024 * 1024;
const rows = fs.readFileSync(process.argv[2], 'utf8').trim().split('\n').map(l => { const p = l.split('\t'); return { asset: p[0], upd: p[1], name: p[2], size: +p[3], at: p[4], by: p[5], url: p[6] }; });
const enc = p => p.split('/').map(encodeURIComponent).join('/');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }); await c.connect();
  const q = (s, p) => c.query(s, p).then(r => r.rows);
  const n = { uploaded: 0, skipped: 0, too_big: 0, linked: 0 };
  for (const r of rows) {
    const note = (await q(`SELECT id, po, attachment_id FROM planner.supplier_notes WHERE body LIKE '%(monday #'||$1||')' LIMIT 1`, [r.upd]))[0];
    if (!note) { console.log('no note for update', r.upd, r.name); continue; }
    if (r.url === 'TOO_BIG' || r.size > MAX) {
      const tag = '(monday file #' + r.asset + ')';
      if (!(await q(`SELECT 1 FROM planner.supplier_notes WHERE po=$1 AND body LIKE '%'||$2`, [note.po, tag])).length) {
        await q(`INSERT INTO planner.supplier_notes (po, author_email, author_kind, body, created_at, read_at) VALUES ($1,'monday import','internal',$2,$3::timestamptz,now())`,
          [note.po, '[monday] Design file ' + r.name + ' (' + Math.round(r.size / 1048576) + ' MB) is too big for HORIZON file storage (' + Math.round(MAX / 1048576) + ' MB limit). Open it on monday: https://dockbay.monday.com/protected_static/4785126/resources/' + r.asset + '/' + encodeURIComponent(r.name) + '\n' + tag, r.at]); }
      n.too_big++; continue; }
    let att = (await q(`SELECT id FROM planner.portal_attachments WHERE po=$1 AND filename=$2 AND category='product'`, [note.po, r.name]))[0];
    if (!att) {
      const res = await fetch(r.url); if (!res.ok) throw new Error('download ' + r.name + ' ' + res.status);
      const buf = Buffer.from(await res.arrayBuffer());
      const path = 'product/' + r.at.slice(0, 7) + '/' + crypto.randomUUID() + '-' + r.name.replace(/[^A-Za-z0-9._-]/g, '_').slice(-80);
      const up = await fetch(SB + '/storage/v1/object/' + BUCKET + '/' + enc(path), { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'content-type': 'application/pdf', 'x-upsert': 'true' }, body: buf });
      if (!up.ok) throw new Error('upload ' + r.name + ' ' + up.status + ' ' + (await up.text()).slice(0, 200));
      att = (await q(`INSERT INTO planner.portal_attachments (po, filename, mime, byte_size, uploaded_by, uploaded_at, category, uploader_kind, storage_path, is_latest, version)
        VALUES ($1,$2,'application/pdf',$3,$4,$5::timestamptz,'product','internal',$6,true,1) RETURNING id`, [note.po, r.name, buf.length, 'monday import (' + r.by + ')', r.at, path]))[0];
      n.uploaded++; console.log('uploaded', note.po, r.name, (buf.length / 1048576).toFixed(1) + ' MB');
    } else n.skipped++;
    if (!note.attachment_id) { await q(`UPDATE planner.supplier_notes SET attachment_id=$1 WHERE id=$2`, [att.id, note.id]); n.linked++; }
  }
  console.log(n); await c.end();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
