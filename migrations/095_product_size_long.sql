-- 095_product_size_long.sql
-- Adds size_long — a human-readable size description (e.g. "Extra Large (200x90cm)", "Small (100x50\"")")
-- to planner.products. Source of truth is Airtable sku_child.size_long; the n8n sync must map that field
-- into planner.products (alongside the other product dims from migration 093). Consumed by the SKUs query
-- and the ORDER PLAN XLSX export ("Size (long)" column).
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS size_long text;

-- One-off backfill of the current values (SKU,size_long) is provided separately as
-- 095_product_size_long_seed.sql (generated from SKU_CHILD-NEW FIELDS.csv). Ongoing values come from n8n.
