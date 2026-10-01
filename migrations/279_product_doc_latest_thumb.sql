-- 279: PRODUCT split P3 — file audit trail + "latest version" pick + swatch inheritance (Ben 16-Sep-2026)
-- portal_attachments already carries uploaded_by / uploaded_at / version. Adds:
--   is_latest  — the admin-picked "main spec file" for a product (NULL everywhere = newest internal upload is latest)
--   thumb      — small PNG rendered in the ADMIN browser at upload (image resize / PDF page 1 via pdf.js); the product's
--                swatch falls back to the latest file's thumb when no swatch was uploaded (portal uploads never feed it)
ALTER TABLE planner.portal_attachments ADD COLUMN IF NOT EXISTS is_latest boolean;
ALTER TABLE planner.portal_attachments ADD COLUMN IF NOT EXISTS thumb bytea;
ALTER TABLE planner.portal_attachments ADD COLUMN IF NOT EXISTS thumb_mime text;
CREATE INDEX IF NOT EXISTS portal_attachments_product_latest ON planner.portal_attachments (po) WHERE category='product';
