-- 305_erp_drift_approved.sql  (v28.007, Ben, 28-Sep-2026) — "ERP drift approved" sign-off on a purchase order.
-- Lines drift vs the Fulfil PO (qty per SKU) stays flagged in every Fulfil state, including processing / done where
-- Fulfil will not accept a line push. A user can tick "ERP drift approved" on the PO grid, which removes the action.
-- The approval carries a signature of the lines that were approved (Horizon lines + Fulfil mirror lines); if either
-- side changes afterwards the signature no longer matches and the drift is flagged again (approval lapses).
-- Idempotent, additive.
ALTER TABLE planner.purchase_orders
  ADD COLUMN IF NOT EXISTS erp_drift_approved_at  timestamptz,
  ADD COLUMN IF NOT EXISTS erp_drift_approved_by  text,
  ADD COLUMN IF NOT EXISTS erp_drift_approved_sig text;
