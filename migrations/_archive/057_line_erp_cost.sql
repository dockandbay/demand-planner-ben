-- ERP push now tracks cost price too (not just qty). erp_cost mirrors the last-pushed cost; a line is
-- "pending to ERP" when qty <> erp_qty OR cost_price <> erp_cost. Seed erp_cost = cost_price so existing
-- lines start in sync (only future accepted changes flag as pending).
ALTER TABLE planner.purchase_order_lines ADD COLUMN IF NOT EXISTS erp_cost numeric;
UPDATE planner.purchase_order_lines SET erp_cost = cost_price WHERE erp_cost IS NULL;
