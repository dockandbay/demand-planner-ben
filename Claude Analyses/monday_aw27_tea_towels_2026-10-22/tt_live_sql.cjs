// 27-Oct-26: the same import as tt_import.cjs, written as ONE SQL script for live (run through the Supabase connection; the live write
// connection string was refused). Everything is looked up by reference and guarded (ON CONFLICT / NOT EXISTS), so a re-run adds nothing.
// Usage: node tt_live_sql.cjs tt_data.json > tt_live.sql   (wrap in BEGIN ... ROLLBACK for a dry run)
const fs = require('fs'); const DATA = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const src = fs.readFileSync(__dirname + '/tt_import.cjs', 'utf8');
const LIVE_ITEMS = eval(src.match(/const LIVE_ITEMS = (\[[\s\S]*?\n\]);/)[1]);
const NEW_NAMES = eval('(' + src.match(/const NEW_NAMES = (\{[\s\S]*?\});/)[1] + ')');
const EMAIL = { 'Sofia Jahn':'sofia@dockandbay.com', 'Libby Allen':'libby@dockandbay.com', jack:'jack.zhang@lixintex.com.cn' };
const STAGE = s => s === 'In Review' ? 'sample_in_review' : 'sample_development', RANK = { sample_development: 0, sample_in_review: 1 };
const L = v => v == null ? 'NULL' : "'" + String(v).replace(/'/g, "''") + "'";
const out = []; const P = s => out.push(s);
const SUP = `(SELECT id FROM planner.suppliers WHERE name='Lixin')`;
let seq = 10;
const want = LIVE_ITEMS.map(x => ({ ref: x[0], colour: x[1], bulk: x[2], desc: x[3], seq: x[4], by: x[5] }))
  .concat(Object.entries(NEW_NAMES).map(([ref, nm]) => ({ ref, colour: nm, bulk: null, desc: 'TEA TOWEL (imported from monday)', seq: seq++, by: 'monday import' })));
for (const it of want) P(`INSERT INTO planner.product_dev_items (ref, type, season, category, category_code, seq_in_group, colour_name, bulk_colour_name, description, status, created_by) VALUES (${L(it.ref)},'Product Development','AW27','Tea Towel','TEATO',${it.seq},${L(it.colour)},${L(it.bulk)},${L(it.desc)},'in_development',${L(it.by)}) ON CONFLICT (ref) DO NOTHING;`);
const by = {}; DATA.forEach(d => { const ref = d.target.replace(/^NEW:/, ''); (by[ref] = by[ref] || []).push(d); });
for (const it of want) { const ref = it.ref, designs = by[ref] || [];
  if (!designs.length && ref !== 'AW27-TEATO-CHRISTMAS') continue;
  P(`INSERT INTO planner.product_dev_components (item_ref, name, supplier, sampling_mode, sort) SELECT ${L(ref)},'Core Product','Lixin','sampled',1 WHERE NOT EXISTS (SELECT 1 FROM planner.product_dev_components WHERE item_ref=${L(ref)} AND name='Core Product');`);
  const stage = designs.reduce((a, d) => RANK[STAGE(d.status)] > RANK[a] ? STAGE(d.status) : a, 'sample_development');
  const ukau = designs.some(d => d.updates.some(u => /UK and AUS/.test(u.text))) || ref === 'AW27-TEATO-CHRISTMAS';
  const devStart = designs.length ? designs.map(d => d.created.slice(0, 10)).sort()[0] : null, rref = ref + '-LX';
  P(`INSERT INTO planner.product_dev_requests (ref, item_id, supplier_id, supplier_name, supplier_code, stage, approval_method, recipient_countries, dev_start, notes, created_by, send_status) SELECT ${L(rref)}, (SELECT id FROM planner.product_dev_items WHERE ref=${L(ref)}), s.id, 'Lixin', coalesce(s.code,'LX'), ${L(stage)}, 'samples', ${L(ukau ? 'UK,AU' : 'UK')}, ${devStart ? L(devStart) + '::date' : 'NULL'}, ${L(designs.length ? 'Imported from monday.com (Supplier - Lixin board, AW27 > Tea Towels): ' + designs.map(d => d.name).join(', ') : null)}, 'monday import', 'draft' FROM planner.suppliers s WHERE s.name='Lixin' AND NOT EXISTS (SELECT 1 FROM planner.product_dev_requests WHERE ref=${L(rref)});`);
  P(`INSERT INTO planner.product_dev_request_components (request_id, component_id) SELECT r.id, c.id FROM planner.product_dev_requests r, planner.product_dev_components c WHERE r.ref=${L(rref)} AND c.item_ref=${L(ref)} AND c.name='Core Product' ON CONFLICT DO NOTHING;`);
  const withSample = designs.filter(d => d.sample_date).sort((a, b) => a.sample_date.localeCompare(b.sample_date) || a.name.localeCompare(b.name));
  const rounds = []; withSample.forEach(d => { const r = rounds.find(x => x.date === d.sample_date); if (r) r.ds.push(d); else rounds.push({ date: d.sample_date, ds: [d] }); });
  for (const r of rounds) { const asp = r.ds.some(d => /ASPARAGUS/.test(d.name)), rec = r.ds.some(d => d.status === 'In Review') ? r.date : (asp ? '2026-10-20' : null);
    const desc = r.ds.map(d => d.name).join(' + ') + (asp ? ' (sent in the 12-Oct DHL parcel 55 5591 5875; Libby confirmed received 20-Oct)' : '') + ' ' + r.ds.map(d => '(monday #' + d.monday_id + ')').join(' ');
    P(`INSERT INTO planner.product_dev_samples (item_ref, version, sample_date, description, dimension, sample_sizes, request_id, received_at, supplier_status, created_by) SELECT ${L(ref)}, (SELECT coalesce(max(version),0)+1 FROM planner.product_dev_samples WHERE item_ref=${L(ref)}), ${L(r.date)}::date, ${L(desc)}, 'product', '{}', (SELECT id FROM planner.product_dev_requests WHERE ref=${L(rref)}), ${rec ? L(rec) + '::timestamptz' : 'NULL'}, 'in_development', 'monday import' WHERE NOT EXISTS (SELECT 1 FROM planner.product_dev_samples WHERE item_ref=${L(ref)} AND description LIKE ${L('%(monday #' + r.ds[0].monday_id + ')%')});`); }
  const PDF = /AW27_TEATWL-[^\n]*?\.pdf/g, notesBy = [];
  for (const d of designs) for (const u of d.updates) for (const m of [u].concat(u.replies || [])) {
    const key = m.who + '|' + m.text.replace(PDF, '{pdf}').replace(/\s+/g, ' ').trim();
    let g = notesBy.find(x => x.key === key); if (!g) notesBy.push(g = { key, who: m.who, text: m.text.trim(), at: m.at, names: [], ids: [], pdfs: [] });
    if (!g.names.includes(d.name)) g.names.push(d.name); g.ids.push(m.id); (m.text.match(PDF) || []).forEach(p => { if (!g.pdfs.includes(p)) g.pdfs.push(p); }); if (m.at < g.at) g.at = m.at; }
  for (const g of notesBy) { const kind = g.who === 'jack' ? 'supplier' : 'internal';
    const text = g.pdfs.length > 1 ? g.text.replace(PDF, '\u0000').replace('\u0000', g.pdfs.join('\n')).replace(/\u0000/g, '') : g.text;
    const body = '[monday · ' + g.names.join(', ') + '] ' + text + '\n' + g.ids.map(i => '(monday #' + i + ')').join(' ');
    P(`INSERT INTO planner.supplier_notes (po, supplier_id, author_email, author_kind, body, created_at, read_at) SELECT ${L(ref)}, ${SUP}, ${L(EMAIL[g.who] || null)}, ${L(kind)}, ${L(body)}, ${L(g.at)}::timestamptz, now() WHERE NOT EXISTS (SELECT 1 FROM planner.supplier_notes WHERE po=${L(ref)} AND body LIKE ${L('%(monday #' + g.ids[0] + ')%')});`); } }
process.stdout.write(out.join('\n') + '\n');
