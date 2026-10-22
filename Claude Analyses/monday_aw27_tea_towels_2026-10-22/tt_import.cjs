// AW27 tea towels: monday.com board 8740719024 (Supplier - Lixin, AW27 > Tea Towels) -> HORIZON PRODUCT (SANDBOX ONLY).
// Idempotent: items by ref, requests by ref, samples by "(monday #id)" in description, notes by "(monday #id)" in body.
require('dotenv').config({ quiet: true });
const { Client } = require('pg'); const fs = require('fs');
const DATA = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const DRY = process.argv.includes('--dry');
if (/oolwklahstnvocaugryg/.test(process.env.DATABASE_URL || '')) { console.error('REFUSING: DATABASE_URL points at LIVE'); process.exit(1); }
const LIVE_ITEMS = [  // copied from live (read-only query 22-Oct-26)
  ['AW27-TEATO-CHRISTMAS','Christmas',null,'set of three xmas tea towels',9,'libby@dockandbay.com'],
  ['AW27-TEATO-PANTRYPARTY','PANTRY PARTY','PANTRY PARTY','TEA TOWEL PRINT',7,'sofia@dockandbay.com'],
  ['AW27-TEATO-TOOHOTTOHANDLE','TOO HOT TO HANDLE',null,'ALL OVER PRINT TEA TOWEL',3,'sofia@dockandbay.com'],
  ['TEATWL-MD-BRNCHC','BRUNCH CLUB','BRUNCH CLUB','TEA TOWEL PRINT',4,'sofia@dockandbay.com'],
  ['TEATWL-MD-GUDGRW','GOOD TO GROW','GOOD TO GROW','TEA TOWEL WAITROSE',2,'sofia@dockandbay.com'],
  ['TEATWL-MD-HOTVIN','HOT OFF THE VINE','HOT OFF THE VINE','TEA TOWEL PRINT',1,'sofia@dockandbay.com'],
  ['TEATWL-MD-KIWCOOL','KIWI COOLER','KIWI COOLER','STRIPE TEA TOWEL CORE',6,'sofia@dockandbay.com'],
  ['TEATWL-MD-MATCLB','MORNING MATCHA CLUB','MORNING MATCHA CLUB','TEA TOWEL COLLAB',8,'sofia@dockandbay.com'],
  ['TEATWL-MD-RASPRIPLE','RASPBERRY RIPPLE','RASPBERRY RIPPLE','STRIPE TEA TOWEL CORE',5,'sofia@dockandbay.com'],
];
const NEW_NAMES = { 'AW27-TEATO-DUOBLUGRNCHK':'DUO BLUE/GREEN CHECK','AW27-TEATO-DUOPNKYELCHK':'DUO PINK/YELLOW CHECK','AW27-TEATO-NEONCHKRED':'NEON CHECK RED','AW27-TEATO-NEONCHKPINK':'NEON CHECK PINK','AW27-TEATO-GRNPNKSTRIPE':'GREEN/PINK STRIPE','AW27-TEATO-GRNBLUSTRIPE':'GREEN/BLUE STRIPE' };
const EMAIL = { 'Sofia Jahn':'sofia@dockandbay.com', 'Libby Allen':'libby@dockandbay.com', jack:'jack.zhang@lixintex.com.cn' };
const STAGE = s => s === 'In Review' ? 'sample_in_review' : 'sample_development';
const RANK = { sample_development: 0, sample_in_review: 1 };
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }); await c.connect();
  const q = (s, p) => c.query(s, p).then(r => r.rows);
  const sup = (await q(`SELECT id, name, code FROM planner.suppliers WHERE name='Lixin'`))[0]; if (!sup) throw new Error('no Lixin supplier');
  const n = { items: 0, comps: 0, reqs: 0, samples: 0, notes: 0 };
  await c.query('BEGIN');
  try {
    // 1) items: the 9 live tea towels + 6 new ones for unmatched monday designs
    let seq = 10;
    const want = LIVE_ITEMS.map(x => ({ ref: x[0], colour: x[1], bulk: x[2], desc: x[3], seq: x[4], by: x[5] }))
      .concat(Object.entries(NEW_NAMES).map(([ref, nm]) => ({ ref, colour: nm, bulk: null, desc: 'TEA TOWEL (imported from monday)', seq: seq++, by: 'monday import' })));
    for (const it of want) {
      const r = await q(`INSERT INTO planner.product_dev_items (ref, type, season, category, category_code, seq_in_group, colour_name, bulk_colour_name, description, status, created_by)
        VALUES ($1,'Product Development','AW27','Tea Towel','TEATO',$2,$3,$4,$5,'in_development',$6) ON CONFLICT (ref) DO NOTHING RETURNING id`, [it.ref, it.seq, it.colour, it.bulk, it.desc, it.by]);
      n.items += r.length;
    }
    const items = {}; (await q(`SELECT id, ref FROM planner.product_dev_items WHERE ref = ANY($1)`, [want.map(x => x.ref)])).forEach(r => { items[r.ref] = r.id; });
    // group designs by target item
    const by = {}; DATA.forEach(d => { const ref = d.target.replace(/^NEW:/, ''); (by[ref] = by[ref] || []).push(d); });
    for (const ref of Object.keys(items)) {
      const designs = by[ref] || [];
      if (!designs.length && ref !== 'AW27-TEATO-CHRISTMAS') continue;
      // 2) component: Core Product (Lixin)
      let comp = (await q(`SELECT id FROM planner.product_dev_components WHERE item_ref=$1 AND name='Core Product'`, [ref]))[0];
      if (!comp) { comp = (await q(`INSERT INTO planner.product_dev_components (item_ref, name, supplier, sampling_mode, sort) VALUES ($1,'Core Product','Lixin','sampled',1) RETURNING id`, [ref]))[0]; n.comps++; }
      // 3) request to Lixin, DRAFT
      const stage = designs.reduce((a, d) => RANK[STAGE(d.status)] > RANK[a] ? STAGE(d.status) : a, 'sample_development');
      const ukau = designs.some(d => d.updates.some(u => /UK and AUS/.test(u.text))) || ref === 'AW27-TEATO-CHRISTMAS';
      const devStart = designs.length ? designs.map(d => d.created.slice(0, 10)).sort()[0] : null;
      const rref = ref + '-LX';
      let rq = (await q(`SELECT id FROM planner.product_dev_requests WHERE ref=$1`, [rref]))[0];
      if (!rq) { rq = (await q(`INSERT INTO planner.product_dev_requests (ref, item_id, supplier_id, supplier_name, supplier_code, stage, approval_method, recipient_countries, dev_start, notes, created_by, send_status)
          VALUES ($1,$2,$3,'Lixin',$4,$5,'samples',$6,$7::date,$8,'monday import','draft') RETURNING id`,
          [rref, items[ref], sup.id, sup.code || 'LX', stage, ukau ? 'UK,AU' : 'UK', devStart, designs.length ? 'Imported from monday.com (Supplier - Lixin board, AW27 > Tea Towels): ' + designs.map(d => d.name).join(', ') : null]))[0]; n.reqs++; }
      await q(`INSERT INTO planner.product_dev_request_components (request_id, component_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [rq.id, comp.id]);
      // 4) sample versions: one per design that has a sample date (ordered by date, then name)
      const withSample = designs.filter(d => d.sample_date).sort((a, b) => a.sample_date.localeCompare(b.sample_date) || a.name.localeCompare(b.name));
      let ver = (await q(`SELECT coalesce(max(version),0) v FROM planner.product_dev_samples WHERE item_ref=$1`, [ref]))[0].v;
      for (const d of withSample) {
        const tag = '(monday #' + d.monday_id + ')';
        if ((await q(`SELECT 1 FROM planner.product_dev_samples WHERE item_ref=$1 AND description LIKE '%'||$2||'%'`, [ref, tag])).length) continue;
        const asparagus = /ASPARAGUS/.test(d.name);
        const received = d.status === 'In Review' ? d.sample_date : (asparagus ? '2026-10-20' : null);
        await q(`INSERT INTO planner.product_dev_samples (item_ref, version, sample_date, description, dimension, sample_sizes, request_id, received_at, supplier_status, created_by)
          VALUES ($1,$2,$3::date,$4,'product','{}',$5,$6::timestamptz,'in_development','monday import')`,
          [ref, ++ver, d.sample_date, d.name + (asparagus ? ' (sent in the 12-Oct DHL parcel 55 5591 5875; Libby confirmed received 20-Oct)' : '') + ' ' + tag, rq.id, received]);
        n.samples++;
      }
      // 5) timeline: every monday update + reply, original author and time, already read (history, not new actions)
      for (const d of designs) for (const u of d.updates) for (const m of [u].concat(u.replies || [])) {
        const tag = '(monday #' + m.id + ')';
        if ((await q(`SELECT 1 FROM planner.supplier_notes WHERE po=$1 AND body LIKE '%'||$2`, [ref, tag])).length) continue;
        const kind = m.who === 'jack' ? 'supplier' : 'internal';
        await q(`INSERT INTO planner.supplier_notes (po, supplier_id, author_email, author_kind, body, created_at, read_at) VALUES ($1,$2,$3,$4,$5,$6::timestamptz,now())`,
          [ref, sup.id, EMAIL[m.who] || null, kind, '[monday · ' + d.name + '] ' + m.text.trim() + '\n' + tag, m.at]);
        n.notes++;
      }
    }
    if (DRY) { await c.query('ROLLBACK'); console.log('DRY RUN (rolled back)', n); } else { await c.query('COMMIT'); console.log('COMMITTED', n); }
  } catch (e) { await c.query('ROLLBACK'); console.error('FAILED, rolled back:', e.message); process.exit(1); }
  await c.end();
})();
