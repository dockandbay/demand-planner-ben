-- 272_key_account_client_fba_fields.sql
-- Ben (2026-09-14): store the SUG-0041 PO Client/FBA delivery-contact fields on the key account too,
-- so they default onto a PO when the key account is applied (reuse when adding a client).
-- Mirrors purchase_orders.po_consignee / po_contact_person / po_contact_number / po_freight_forwarder (mig 271).
ALTER TABLE planner.key_accounts
  ADD COLUMN IF NOT EXISTS consignee         text,
  ADD COLUMN IF NOT EXISTS contact_person    text,
  ADD COLUMN IF NOT EXISTS contact_number    text,
  ADD COLUMN IF NOT EXISTS freight_forwarder text;
