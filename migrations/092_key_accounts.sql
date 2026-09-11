-- 092 — Key Accounts table + Direct-to-Client tags on purchase_orders
-- A key account is a client whose packing/labelling, client requirements and delivery address are stored
-- once and defaulted onto a PO's Direct-to-Client details when that client is selected. POs also carry two
-- Direct-to-Client tags (custom / key account) surfaced as badges + filters on the DIRECT TO CLIENT report.

CREATE TABLE IF NOT EXISTS planner.key_accounts (
  id                        serial PRIMARY KEY,
  name                      text UNIQUE NOT NULL,
  -- packing & labelling (mirrors the PO fields)
  pack_polybags             boolean, pack_polybags_notes      text,
  pack_dnb_barcodes         boolean, pack_dnb_barcodes_notes  text,
  pack_rfid_barcodes        boolean, pack_rfid_barcodes_notes text,
  pack_dnb_carton           boolean, pack_dnb_carton_notes    text,
  pack_client_carton        boolean, pack_client_carton_notes text,
  pack_pallet_notes         text,
  pack_other_notes          text,
  client_requirements       text,
  address                   text,
  created_at                timestamptz DEFAULT now(),
  updated_at                timestamptz DEFAULT now()
);

COMMENT ON TABLE planner.key_accounts IS
  'Client key accounts — stored packing/labelling, client requirements and delivery address, defaulted onto a PO''s Direct-to-Client details when the client is selected.';

ALTER TABLE planner.purchase_orders
  ADD COLUMN IF NOT EXISTS dtc_custom      boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS dtc_key_account boolean DEFAULT false;

COMMENT ON COLUMN planner.purchase_orders.dtc_custom      IS 'Direct-to-Client tag: bespoke / one-off client order (badge + report filter).';
COMMENT ON COLUMN planner.purchase_orders.dtc_key_account IS 'Direct-to-Client tag: order for a stored key account (badge + report filter; auto-set when a key account is picked).';
