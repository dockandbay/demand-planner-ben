-- PO PLAN order-plan accept workflow: D&B confirms a supplier's submitted change (cost / amended qty / added SKU).
-- A line is "unconfirmed" when it has a submission and confirmed_at is null or older than the last submission.
ALTER TABLE planner.portal_line_costs ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;
