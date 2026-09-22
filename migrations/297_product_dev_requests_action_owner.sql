-- 297_product_dev_requests_action_owner.sql
-- Action owner on a development request (Ben): whose court the ball is in — 'db' (D&B action), 'supplier' (supplier
-- action) or 'none' (approved / nothing outstanding). NULL = auto-derive from the latest sample / message / approval.
-- A manual value overrides the auto-derivation. Surfaced as a filter pill + a per-request badge on SAMPLING.
ALTER TABLE planner.product_dev_requests
  ADD COLUMN IF NOT EXISTS action_owner text;   -- NULL = auto | 'db' | 'supplier' | 'none'
