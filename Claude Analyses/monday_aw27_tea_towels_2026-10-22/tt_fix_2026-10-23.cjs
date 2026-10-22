// 23-Oct-26 (Ben: "some comments are duplicated on products and incorrect ... some sample versions are the same dates and must be merged").
// SANDBOX ONLY. Clears the monday-imported samples + timeline notes of the 4 items that got several designs, moves the Retro Check / Basket
// PDFs to their own items, then re-run tt_import.cjs (one version per date, merged duplicate notes) and tt_files.cjs (re-links the PDFs).
require('dotenv').config({ quiet: true });
const { Client } = require('pg');
if (/oolwklahstnvocaugryg/.test(process.env.DATABASE_URL || '')) { console.error('REFUSING: DATABASE_URL points at LIVE'); process.exit(1); }
const REFS = ['AW27-TEATO-PANTRYPARTY', 'TEATWL-MD-HOTVIN', 'TEATWL-MD-MATCLB', 'TEATWL-MD-GUDGRW'];
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }); await c.connect();
  const q = (s, p) => c.query(s, p).then(r => r.rows);
  await c.query('BEGIN');
  try {
    const ids = (await q(`SELECT id FROM planner.product_dev_samples WHERE item_ref = ANY($1) AND created_by='monday import'`, [REFS])).map(r => r.id);
    for (const [t, col] of [['sample_request_dev_samples', 'dev_sample_id'], ['product_dev_sizes', 'approved_sample_id'], ['product_dev_size_dimensions', 'approved_sample_id'], ['product_sample_aspect_feedback', 'sample_id']]) {
      const n = (await q(`SELECT count(*)::int n FROM planner.${t} WHERE ${col} = ANY($1)`, [ids]))[0].n; if (n) throw new Error(t + ' references ' + n + ' of these samples: stop'); }
    const s = await c.query(`DELETE FROM planner.product_dev_samples WHERE id = ANY($1)`, [ids]);
    const nt = await c.query(`DELETE FROM planner.supplier_notes WHERE po = ANY($1) AND body LIKE '%(monday %'`, [REFS]);
    const a1 = await c.query(`UPDATE planner.portal_attachments SET po='AW27-TEATO-RETROCHECK' WHERE po='AW27-TEATO-PANTRYPARTY' AND filename LIKE '%RETRO SUPER MARKET CHECK%'`);
    const a2 = await c.query(`UPDATE planner.portal_attachments SET po='AW27-TEATO-RETROBASKET' WHERE po='AW27-TEATO-PANTRYPARTY' AND filename LIKE '%RETRO SUPER MARKET BASKET%'`);
    const rq = await c.query(`UPDATE planner.product_dev_requests SET notes='Imported from monday.com (Supplier - Lixin board, AW27 > Tea Towels): RETRO SUPER MARKET FOODS PINK, RETRO SUPER MARKET FOODS BLUE' WHERE ref='AW27-TEATO-PANTRYPARTY-LX'`);
    await c.query('COMMIT');
    console.log({ samples_deleted: s.rowCount, notes_deleted: nt.rowCount, pdfs_moved: a1.rowCount + a2.rowCount, request_note: rq.rowCount });
  } catch (e) { await c.query('ROLLBACK'); console.error('FAILED, rolled back:', e.message); process.exit(1); }
  await c.end();
})();
