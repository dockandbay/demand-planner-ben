-- 148: Per-size SKU mapping + approved sample version, on planner.product_dev_sizes.
--
-- A planner SKU is size + colour specific, so the mapping is per size (each approved size of an approved colourway
-- maps to one planner.products SKU). approved_sample_id records which submitted sample version (product_dev_samples)
-- was signed off for that size.
--
-- mapped_sku:          the planner.products.sku this approved size maps to (free text; validated against products UI-side)
-- approved_sample_id:  fk → planner.product_dev_samples(id); which sample version is approved for this size
--
-- Both nullable; safe + idempotent.
ALTER TABLE planner.product_dev_sizes ADD COLUMN IF NOT EXISTS mapped_sku text;
ALTER TABLE planner.product_dev_sizes ADD COLUMN IF NOT EXISTS approved_sample_id bigint
  REFERENCES planner.product_dev_samples(id) ON DELETE SET NULL;
