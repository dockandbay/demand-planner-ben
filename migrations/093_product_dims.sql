-- 093_product_dims.sql
-- Product/pack/carton dimensions & weights per SKU (UK + US), sourced from Airtable SKU_CHILD.
-- Added to planner.products (keyed by sku). All numeric; units: cm for dims, kg for weights.
-- NOTE: sku_labels already holds abbreviated carton dims (uk_carton_l/w/h/wt); these are the
-- longer-named authoritative fields on the product master. FBA download still reads sku_labels
-- unless/until rewired.

ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS uk_prod_width numeric;
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS us_prod_width numeric;
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS uk_prod_height numeric;
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS us_prod_height numeric;
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS us_prod_length numeric;
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS uk_prod_length numeric;
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS uk_pack_width numeric;
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS us_pack_width numeric;
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS us_pack_height numeric;
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS us_pack_length numeric;
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS uk_pack_height numeric;
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS uk_pack_length numeric;
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS uk_prod_weight numeric;
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS us_prod_weight numeric;
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS uk_carton_width numeric;
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS uk_carton_height numeric;
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS uk_carton_length numeric;
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS uk_carton_weight numeric;
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS us_carton_width numeric;
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS us_carton_height numeric;
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS us_carton_length numeric;
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS us_carton_weight numeric;
