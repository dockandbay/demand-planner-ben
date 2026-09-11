-- 107_preship_not_required.sql
-- "Not required" tick for the pre-shipment documents requirement (ASN / FBA barcodes / IDN labels) per PO.
-- When true, the overdue exception/action is suppressed for that PO.
ALTER TABLE planner.purchase_orders ADD COLUMN IF NOT EXISTS preship_not_required boolean DEFAULT false;
