-- 086: Packing & Labelling requirements on a PO (Client/FBA tab) + a supplier "accept Direct to
-- Client details" approval. D&B fills these in on SUPPLY ▸ Purchase Orders ▸ CLIENT/FBA; the supplier
-- sees them read-only on the portal PO card's "Direct to Client details" tab and approves them. Editing
-- any packing field after approval clears the approval (app-level), so the supplier re-approves.

ALTER TABLE planner.purchase_orders
  ADD COLUMN IF NOT EXISTS pack_polybags         boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pack_polybags_notes   text,
  ADD COLUMN IF NOT EXISTS pack_dnb_barcodes     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pack_dnb_barcodes_notes text,
  ADD COLUMN IF NOT EXISTS pack_rfid_barcodes    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pack_rfid_barcodes_notes text,
  ADD COLUMN IF NOT EXISTS pack_dnb_carton       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pack_dnb_carton_notes text,
  ADD COLUMN IF NOT EXISTS pack_client_carton    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pack_client_carton_notes text,
  ADD COLUMN IF NOT EXISTS pack_pallet_notes     text,
  ADD COLUMN IF NOT EXISTS pack_other_notes      text,
  ADD COLUMN IF NOT EXISTS dtc_accepted_at       timestamptz,   -- supplier approved the Direct to Client details
  ADD COLUMN IF NOT EXISTS dtc_accepted_by       text;
