-- 119: supplier cost fields on planner.products.
-- `cost`     — general/default unit cost (FOB) for a SKU.
-- `cost_lx`  — Lixin's price (supplier code LX).
-- `cost_xr`  — XR Textile's price (supplier code XR).
-- Convention: a supplier's price column is  cost_<lowercased suppliers.code>  — so future suppliers just need
-- a matching cost_<code> column here and the order-plan price fallback picks it up automatically.
-- The ORDER PLAN uses these to default a line's Est. cost when the line has no cost_price:
--   coalesce(line.cost_price, products.cost_<supplier code>, products.cost)
-- Seeded once from Airtable sku_child (SKU_CHILD-WORKING). ⚠ n8n must map these + size_long going forward.
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS cost    numeric;
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS cost_lx numeric;
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS cost_xr numeric;
-- size_long already exists (migration 095) but is empty on live — n8n must sync it from sku_child too.
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS size_long text;
