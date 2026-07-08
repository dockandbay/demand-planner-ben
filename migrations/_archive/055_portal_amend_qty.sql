-- Supplier portal order-plan amendments: a proposed (amended) quantity per line, and SKUs the supplier
-- adds to the order (is_added). Both live on portal_line_costs alongside the submitted cost price.
ALTER TABLE planner.portal_line_costs ADD COLUMN IF NOT EXISTS amended_qty numeric;
ALTER TABLE planner.portal_line_costs ADD COLUMN IF NOT EXISTS is_added boolean DEFAULT false;
