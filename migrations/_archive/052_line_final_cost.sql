-- PO PLAN order plan: D&B "final" agreed cost price per line, alongside the supplier-submitted actual_cost.
-- This is the value that would eventually push to Cin7/Fulfil (gated). Lives on the same portal_line_costs row.
ALTER TABLE planner.portal_line_costs ADD COLUMN IF NOT EXISTS final_cost numeric;
