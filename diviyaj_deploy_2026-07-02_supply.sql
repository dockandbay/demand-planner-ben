-- =============================================================================
-- Diviyaj deploy — SUPPLY schema changes since your last migration (v25.128)
-- Covers HORIZON v25.129 → v25.155.  Date: 2026-07-02.
-- =============================================================================
-- Run against PRODUCTION (project ref oolwklahstnvocaugryg), schema `planner`.
-- TWO schema migrations. Both idempotent — safe to re-run.
--
-- Everything else shipped in v25.129–v25.155 is app code only (server.mjs +
-- supply/inject.html + artifact_v16.7.html) — no other schema changes.
--
-- Migrations included:
--   091_invoice_processed_date.sql — purchase_orders.invoice_processed_date column + auto-stamp trigger.
--     Powers the "< $500 orders → 0% deposits, due on invoice/ship date" default (v25.138).
--   092_key_accounts.sql — key_accounts table + purchase_orders.dtc_custom / dtc_key_account.
--     Powers Key Accounts (config) + Direct-to-Client tags/badges/filters (v25.149).
--
-- NOTE: the one-off po_client_master_update_2026-07-01.sql (bulk PO client data, gitignored) is separate —
-- run it once on live if not already done; it is not a schema migration.
-- =============================================================================

BEGIN;

-- 091 — invoice_processed_date + auto-stamp trigger
ALTER TABLE planner.purchase_orders
  ADD COLUMN IF NOT EXISTS invoice_processed_date date;

COMMENT ON COLUMN planner.purchase_orders.invoice_processed_date IS
  'Date the final supplier invoice was processed (entered/approved). Payment-due anchor for small POs (< $500). Null until a final invoice is recorded. Auto-stamped by trg_stamp_invoice_processed.';

CREATE OR REPLACE FUNCTION planner.stamp_invoice_processed_date() RETURNS trigger AS $$
BEGIN
  IF NEW.supplier_invoice_total IS NOT NULL THEN
    NEW.invoice_processed_date := coalesce(NEW.invoice_processed_date, current_date);
  ELSE
    NEW.invoice_processed_date := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_stamp_invoice_processed ON planner.purchase_orders;
CREATE TRIGGER trg_stamp_invoice_processed
  BEFORE INSERT OR UPDATE OF supplier_invoice_total ON planner.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION planner.stamp_invoice_processed_date();

-- 092 — Key accounts + Direct-to-Client tags
CREATE TABLE IF NOT EXISTS planner.key_accounts (
  id serial PRIMARY KEY, name text UNIQUE NOT NULL,
  pack_polybags boolean, pack_polybags_notes text,
  pack_dnb_barcodes boolean, pack_dnb_barcodes_notes text,
  pack_rfid_barcodes boolean, pack_rfid_barcodes_notes text,
  pack_dnb_carton boolean, pack_dnb_carton_notes text,
  pack_client_carton boolean, pack_client_carton_notes text,
  pack_pallet_notes text, pack_other_notes text,
  client_requirements text, address text,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
ALTER TABLE planner.purchase_orders
  ADD COLUMN IF NOT EXISTS dtc_custom      boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS dtc_key_account boolean DEFAULT false;

COMMIT;
