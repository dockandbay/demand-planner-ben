-- 276_storage_paths.sql
-- Large-file uploads (> ~3MB) go direct to Supabase Storage instead of base64-through-the-function → Postgres bytea,
-- to clear Vercel's ~4.5MB serverless request-body cap. Each file-bearing table gains a nullable `storage_path`:
--   • storage_path IS NULL  → file bytes live in the existing bytea/text column, as before (unchanged; no data migration)
--   • storage_path IS NOT NULL → bytes live in the `horizon-uploads` Storage bucket at that object key; the bytea/text col is NULL
-- The three byte columns that were NOT NULL are relaxed so a Storage-backed row can leave them empty.
-- Idempotent: safe to re-run. No backfill — existing rows keep their inline bytes and serve exactly as before.

ALTER TABLE planner.portal_attachments    ADD COLUMN IF NOT EXISTS storage_path text;
ALTER TABLE planner.quality_docs          ADD COLUMN IF NOT EXISTS storage_path text;
ALTER TABLE planner.payment_remittances   ADD COLUMN IF NOT EXISTS storage_path text;
ALTER TABLE planner.product_specs         ADD COLUMN IF NOT EXISTS storage_path text;
ALTER TABLE planner.edi_project_files     ADD COLUMN IF NOT EXISTS storage_path text;
ALTER TABLE planner.tpl_invoice_files     ADD COLUMN IF NOT EXISTS storage_path text;
ALTER TABLE planner.xero_compare_snapshot ADD COLUMN IF NOT EXISTS storage_path text;

-- Relax NOT NULL on the byte columns so a Storage-backed row can have null bytes (the other tables' cols are already nullable).
ALTER TABLE planner.edi_project_files ALTER COLUMN data    DROP NOT NULL;
ALTER TABLE planner.quality_docs      ALTER COLUMN data    DROP NOT NULL;
ALTER TABLE planner.tpl_invoice_files ALTER COLUMN content DROP NOT NULL;
