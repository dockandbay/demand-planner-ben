-- 116: snapshot of the SKUs/qtys the supplier approved (set when they confirm the order in the portal).
-- The portal ORDER PLAN tab diffs the current plan against this to show "changes since you approved".
ALTER TABLE planner.purchase_orders ADD COLUMN IF NOT EXISTS approved_lines jsonb;
