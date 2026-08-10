-- 207: PRODUCT ▸ PLAN — "Type" master-data field on product dev items.
-- Options: "Product Development" (default) | "Custom Order".
ALTER TABLE planner.product_dev_items ADD COLUMN IF NOT EXISTS type text DEFAULT 'Product Development';
UPDATE planner.product_dev_items SET type = 'Product Development' WHERE type IS NULL OR btrim(type) = '';
