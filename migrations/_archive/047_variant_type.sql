-- 047_variant_type.sql — product variant type for the barcode grid (v20.216)
--
-- The BARCODES grid should only list MASTER products, not "set" (multipack / bundle) variants.
-- variant_type is a source-PIM field that wasn't previously extracted. POPULATE from the SKU_CHILD / Airtable
-- source (Diviyaj / n8n): values are 'MASTER' or 'set'. This migration only adds the column.
-- The barcodes query filters: coalesce(variant_type,'') NOT ILIKE 'set' (shows MASTER + un-typed, hides sets).
ALTER TABLE planner.sku_labels ADD COLUMN IF NOT EXISTS variant_type text;
