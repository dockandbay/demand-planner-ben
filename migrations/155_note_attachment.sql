-- 155_note_attachment.sql
-- Link supplier_notes to the file they announce, so "Supplier uploaded a file…" timeline
-- entries carry a downloadable attachment (product samples + product documents).
ALTER TABLE planner.supplier_notes ADD COLUMN IF NOT EXISTS attachment_id bigint;

-- Backfill existing sample-file upload notes (category='product_sample', po='PSAMPLE-'||sample.id).
UPDATE planner.supplier_notes n SET attachment_id = a.id
FROM planner.product_dev_samples s, planner.portal_attachments a
WHERE n.attachment_id IS NULL
  AND n.body LIKE 'Supplier uploaded a file to sample v%'
  AND s.item_ref = n.po
  AND a.category = 'product_sample' AND a.po = 'PSAMPLE-' || s.id
  AND ('Supplier uploaded a file to sample v' || s.version || ': ' || a.filename) = n.body;

-- Backfill existing product-document upload notes (category='product', po=ref).
UPDATE planner.supplier_notes n SET attachment_id = a.id
FROM planner.portal_attachments a
WHERE n.attachment_id IS NULL
  AND n.body LIKE 'Supplier uploaded a document: %'
  AND a.category = 'product' AND a.po = n.po
  AND ('Supplier uploaded a document: ' || a.filename) = n.body;
