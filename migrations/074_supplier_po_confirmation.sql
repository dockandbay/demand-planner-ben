-- 074: Supplier PO confirmation workflow — the supplier reviews the order (SKUs / quantities / dates) and
-- formally confirms it from the portal. Stored on the PO so the admin can see confirmation status + chase.

ALTER TABLE planner.purchase_orders
  ADD COLUMN IF NOT EXISTS supplier_confirmed_at  timestamptz,
  ADD COLUMN IF NOT EXISTS supplier_confirmed_by  text;
