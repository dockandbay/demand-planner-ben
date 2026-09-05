-- 073: ASN numbers on a PO (#10) — comma-separated Advanced Shipping Notice numbers entered on the new
-- PURCHASE ORDERS ▸ Shipments sub-tab (used for iFulfillment inbound / pallet labelling).

ALTER TABLE planner.purchase_orders
  ADD COLUMN IF NOT EXISTS asn_numbers text;
