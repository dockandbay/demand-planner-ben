-- 271_po_client_fba_fields.sql
-- SUG-0041 (zera@, 2026-09-11): per-PO Client/FBA delivery-contact fields, shown under
-- "Final delivery address" on the PO ▸ Client/FBA tab. Additive, nullable text columns; no backfill.
ALTER TABLE planner.purchase_orders
  ADD COLUMN IF NOT EXISTS po_consignee         text,
  ADD COLUMN IF NOT EXISTS po_contact_person    text,
  ADD COLUMN IF NOT EXISTS po_contact_number    text,
  ADD COLUMN IF NOT EXISTS po_freight_forwarder text;
