-- 287: supplier "accepted" workflow for product development requests (Ben 18-Sep).
-- A supplier accepts the development assignment for a product (grain = whole product: accepting sets it on every
-- request that supplier holds for the item). Admin sees the status on the SAMPLING grid + request detail; the
-- supplier sees an open action until accepted. Mirrors the PO-confirm pattern (supplier_confirmed_at) — plain
-- acknowledgement, no gating of sample submission. Rollback-safe (IF NOT EXISTS).
ALTER TABLE planner.product_dev_requests
  ADD COLUMN IF NOT EXISTS supplier_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS supplier_accepted_by  text;
