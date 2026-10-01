#!/usr/bin/env node
// SANDBOX ONLY — wipe every PRODUCT-development row and seed the P1+ fixture (Ben 16-Sep-26: sandbox PRODUCT data is
// disposable; live PRODUCT tables are empty). Re-runnable. Uses .env DATABASE_URL (= sandbox). Refuses to run against
// the live project ref. Run: node scripts/dev/seed_product_fixture.cjs
require('dotenv').config({ quiet: true });
const { Client } = require('pg');
const url = process.env.DATABASE_URL || '';
if (/oolwklahstnvocaugryg/.test(url)) { console.error('REFUSING: DATABASE_URL points at LIVE'); process.exit(2); }
const BY = 'ben@dockandbay.com';
(async () => {
  const c = new Client({ connectionString: url }); await c.connect();
  const sup = async name => (await c.query(`SELECT id, name, coalesce(code,'') code FROM planner.suppliers WHERE name=$1`, [name])).rows[0] || { id: null, name, code: name.slice(0, 2).toUpperCase() };
  const ctype = async name => (await c.query(`SELECT id, coalesce(default_supplier,'') ds, coalesce(sampling_mode,'sampled') sm FROM planner.component_types WHERE name=$1`, [name])).rows[0];
  await c.query('BEGIN');
  // ── wipe (order matters for FKs; notes/attachments keyed by product ref) ──
  const refs = (await c.query(`SELECT ref FROM planner.product_dev_items`)).rows.map(r => r.ref);
  await c.query(`DELETE FROM planner.sample_request_dev_samples WHERE dev_sample_id IN (SELECT id FROM planner.product_dev_samples)`);
  await c.query(`DELETE FROM planner.product_dev_size_dimensions`);
  await c.query(`DELETE FROM planner.product_dev_samples`);
  await c.query(`DELETE FROM planner.product_dev_request_components`);
  await c.query(`DELETE FROM planner.product_dev_requests`);
  await c.query(`DELETE FROM planner.product_dev_components`);
  await c.query(`DELETE FROM planner.product_dev_sizes`);
  await c.query(`DELETE FROM planner.product_dev_change_log`);
  if (refs.length) { await c.query(`DELETE FROM planner.supplier_notes WHERE po = ANY($1)`, [refs]); await c.query(`DELETE FROM planner.portal_attachments WHERE po = ANY($1) AND category IN ('product','product-docs','specs')`, [refs]); }
  await c.query(`DELETE FROM planner.product_dev_items`);
  console.log('wiped', refs.length, 'products');
  // ── products ──
  const cats = {}; (await c.query(`SELECT category, coalesce(code,'') code FROM planner.categories`)).rows.forEach(r => { cats[r.category] = r.code; });
  const code = cat => cats[cat] || cat.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
  async function product(p) {
    const ref = (p.custom ? 'CUST' : p.season) + '-' + code(p.category) + '-' + p.colour.toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 14);
    const r = await c.query(`INSERT INTO planner.product_dev_items (ref, type, season, category, category_code, seq_in_group, colour_name, bulk_colour_name, description, status, created_by, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,1,$6,$7,$8,'in_development',$9, now()-($10||' days')::interval, now()-($11||' days')::interval) RETURNING id, ref`,
      [ref, p.custom ? 'Custom Order' : 'Product Development', p.custom ? null : p.season, p.category, code(p.category), p.colour, p.bulk || null, p.desc, BY, String(p.ageDays || 20), String(p.updDays || 3)]);
    const id = r.rows[0].id; const sizes = {};
    for (let i = 0; i < p.sizes.length; i++) { const s = await c.query(`INSERT INTO planner.product_dev_sizes (item_id, size_label, approval_status, sort) VALUES ($1,$2,'pending',$3) RETURNING id`, [id, p.sizes[i], i]); sizes[p.sizes[i]] = s.rows[0].id; }
    const comps = {};
    for (let i = 0; i < p.components.length; i++) { const nm = p.components[i]; const ct = await ctype(nm); const dim = { 'Product body': 'product', 'Box': 'packaging', 'Care label': 'labels', 'Hang tag': 'labels', 'Polybag': 'polybag' }[nm] || ('comp:' + nm.toLowerCase().replace(/\W+/g, '-'));
      const cr = await c.query(`INSERT INTO planner.product_dev_components (item_ref, component_type_id, name, supplier, sampling_mode, sort, dimension) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`, [ref, ct ? ct.id : null, nm, ct && ct.ds ? ct.ds : null, ct ? ct.sm : 'sampled', i, dim]); comps[nm] = cr.rows[0].id;
      for (const sl of Object.keys(sizes)) await c.query(`INSERT INTO planner.product_dev_size_dimensions (size_id, dimension, required, approval_status) VALUES ($1,$2,true,'pending')`, [sizes[sl], dim]); }
    await c.query(`INSERT INTO planner.supplier_notes (po, author_email, author_kind, body, created_at) VALUES ($1,$2,'internal',$3, now()-($4||' days')::interval)`, [ref, BY, 'ben@ created a new product development item', String(p.ageDays || 20)]);
    return { id, ref, sizes, comps };
  }
  async function request(prod, q) {
    const s = await sup(q.supplier); const ref = prod.ref + '-' + (s.code || 'XX');
    const r = await c.query(`INSERT INTO planner.product_dev_requests (ref, item_id, supplier_id, supplier_name, supplier_code, stage, approval_method, recipient_countries, dev_start, size_ids, internal_stakeholders, notify_emails, created_by, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::date,$10,$11::jsonb,$12::jsonb,$13, now()-($14||' days')::interval, now()-($15||' days')::interval) RETURNING id`,
      [ref, prod.id, s.id, s.name, s.code, q.stage, q.approval || 'samples', q.country || 'UK', q.devStart || null, (q.sizes || []).map(sl => prod.sizes[sl]).filter(Boolean), JSON.stringify(q.stakeholders || [BY]), JSON.stringify(q.notify || []), BY, String(q.ageDays || 15), String(q.updDays || 2)]);
    const rid = r.rows[0].id;
    for (const nm of q.components) await c.query(`INSERT INTO planner.product_dev_request_components (request_id, component_id) VALUES ($1,$2)`, [rid, prod.comps[nm]]);
    await c.query(`UPDATE planner.product_dev_components SET supplier=$2 WHERE id = ANY($1) AND coalesce(supplier,'')=''`, [q.components.map(n => prod.comps[n]), s.name]);
    await c.query(`INSERT INTO planner.supplier_notes (po, author_email, author_kind, body, created_at) VALUES ($1,$2,'internal',$3, now()-($4||' days')::interval)`, [prod.ref, BY, 'ben@ created development request ' + ref + ' for ' + s.name + ' — ' + q.components.join(', '), String(q.ageDays || 15)]);
    let v = 0;
    for (const sm of (q.samples || [])) { v++; const dim = q.components.length === 1 ? ({ 'Product body': 'product', 'Box': 'packaging', 'Care label': 'labels' }[q.components[0]] || 'product') : 'product';
      const sr = await c.query(`INSERT INTO planner.product_dev_samples (item_ref, version, sample_date, colour_verified, quality_verified, description, created_by, dimension, sampled_aspects, sample_sizes, supplier_status, not_shipped, request_id, received_at, created_at)
        VALUES ($1,$2, (now()-($3||' days')::interval)::date, true, true, $4, $5, $6, $7, $8, 'in_development', false, $9, CASE WHEN $10::text IS NULL THEN NULL ELSE now()-($10||' days')::interval END, now()-($3||' days')::interval) RETURNING id`,
        [prod.ref, v, String(sm.daysAgo), sm.desc || ('Sample ' + v), s.name, dim, q.components.map(n => ({ 'Product body': 'product', 'Box': 'packaging', 'Care label': 'labels' }[n] || 'comp:' + prod.comps[n])), Object.keys(prod.sizes), rid, sm.receivedDaysAgo == null ? null : String(sm.receivedDaysAgo)]);
      await c.query(`INSERT INTO planner.supplier_notes (po, author_email, author_kind, body, created_at) VALUES ($1,$2,'supplier',$3, now()-($4||' days')::interval)`, [prod.ref, 'factory@' + s.code.toLowerCase() + '.test', s.name + ' submitted sample v' + v + (sm.desc ? ' — ' + sm.desc : ''), String(sm.daysAgo)]);
      if (sm.feedback) await c.query(`INSERT INTO planner.supplier_notes (po, author_email, author_kind, body, created_at) VALUES ($1,$2,'internal',$3, now()-($4||' days')::interval)`, [prod.ref, BY, 'Feedback on ' + prod.ref + '_v' + v + ' · ' + q.components[0] + ': ' + sm.feedback, String(Math.max(0, sm.daysAgo - 2))]); }
    return { id: rid, ref };
  }
  const towel = await product({ season: 'SS27', category: 'Towel - Beach', colour: 'Classic Blue', bulk: 'Classic Blue', desc: 'Cabana stripe beach towel, new SS27 colourway', sizes: ['L', 'XL'], components: ['Product body', 'Box', 'Care label', 'Polybag'], ageDays: 40, updDays: 1 });
  await request(towel, { supplier: 'ACME Ltd', components: ['Product body'], sizes: ['L', 'XL'], stage: 'sample_in_review', country: 'UK', devStart: '2026-08-05', ageDays: 38, updDays: 1,
    samples: [{ daysAgo: 35, receivedDaysAgo: 30, desc: 'first strike-off', feedback: 'Blue reads too purple against 19-4052 TCX; hem stitching good.' }, { daysAgo: 14, receivedDaysAgo: 13, desc: 'colour corrected', feedback: 'Colour approved. Label print slightly light.' }, { daysAgo: 3, desc: 'label reprint', receivedDaysAgo: null }] });
  await request(towel, { supplier: 'XR Textile', components: ['Product body'], sizes: ['L'], stage: 'sample_development', country: 'UK', ageDays: 9, updDays: 9, samples: [] });
  await request(towel, { supplier: 'MQ Print (Sherry)', components: ['Box', 'Care label'], stage: 'approved', country: 'UK', ageDays: 36, updDays: 12, samples: [{ daysAgo: 30, receivedDaysAgo: 26, desc: 'box + care label set', feedback: 'Approved as is.' }] });
  const hair = await product({ season: 'SS27', category: 'Hair Wrap', colour: 'Lovely Hair', desc: 'Microfibre hair wrap, seasonal print', sizes: ['One size'], components: ['Product body', 'Hang tag'], ageDays: 12, updDays: 4 });
  await request(hair, { supplier: 'Lixin', components: ['Product body'], stage: 'sample_development', country: 'UK', ageDays: 10, updDays: 4, samples: [{ daysAgo: 4, receivedDaysAgo: null, desc: 'v1 in transit' }] });
  const cool = await product({ custom: true, category: 'Cooling', colour: 'NEXT Brown', desc: 'Custom cooling towel for NEXT', sizes: ['MD'], components: ['Product body'], ageDays: 25, updDays: 6 });
  await request(cool, { supplier: 'Bright Eagle (Rebecca)', components: ['Product body'], stage: 'approved', approval: 'photo', country: 'UK', ageDays: 24, updDays: 6, samples: [{ daysAgo: 20, receivedDaysAgo: 18, desc: 'photo approval', feedback: 'Approved from photos.' }] });
  await c.query('COMMIT');
  const n = await c.query(`SELECT (SELECT count(*) FROM planner.product_dev_items) items, (SELECT count(*) FROM planner.product_dev_requests) requests, (SELECT count(*) FROM planner.product_dev_request_components) req_comps, (SELECT count(*) FROM planner.product_dev_samples) samples, (SELECT count(*) FROM planner.product_dev_components) components, (SELECT count(*) FROM planner.product_dev_sizes) sizes`);
  console.log('seeded', JSON.stringify(n.rows[0]));
  console.log((await c.query(`SELECT ref FROM planner.product_dev_items ORDER BY ref`)).rows.map(r => r.ref).join('  |  '));
  console.log((await c.query(`SELECT ref, stage FROM planner.product_dev_requests ORDER BY ref`)).rows.map(r => r.ref + ' ' + r.stage).join('  |  '));
  await c.end();
})().catch(e => { console.error('FIXTURE FAILED:', e.message); process.exit(1); });
