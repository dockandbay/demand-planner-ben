-- 070: Order Plan exception approvals — persist sign-off for the two new exception types, mirroring
-- partial_carton_approved. Both default false (un-approved = flagged for review).
--   supplier_risk_approved  — line ordered against a PO whose supplier isn't in the SKU's allowed
--                             multi-supplier list (products.supplier_multiple_all).
--   discontinue_approved    — line's arrive (delivery) date is after the SKU's discontinue date
--                             (per-destination: AU/CA specific, else final).

ALTER TABLE planner.purchase_order_lines
  ADD COLUMN IF NOT EXISTS supplier_risk_approved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS discontinue_approved   boolean NOT NULL DEFAULT false;
