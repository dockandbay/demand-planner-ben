-- 141: snapshot of the SKUs/qtys a supplier approved on a sample request.
-- Stamped on accept; kept when the lines later change (which sets change_requested=true) so the portal can
-- diff current vs approved and highlight exactly what changed for re-confirmation. Mirrors purchase_orders.approved_lines.
ALTER TABLE planner.sample_requests
  ADD COLUMN IF NOT EXISTS approved_lines jsonb;
