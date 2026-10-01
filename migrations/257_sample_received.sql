-- 257: PRODUCT samples — "received" mark on a sample shipment (SR).
--
-- When the product team marks a shipped sample request as RECEIVED, every product linked to that request
-- (via its SKU lines mapping to product sizes, or via dev-samples on the request) auto-advances its stage to
-- "sample_in_review" (forward-only — never moves a product backwards or overrides a D&B decision). Handled in the
-- app/server; this column is the received mark + date.

ALTER TABLE planner.sample_requests
  ADD COLUMN IF NOT EXISTS received_at timestamptz;
