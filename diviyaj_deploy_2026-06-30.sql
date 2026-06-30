-- ============================================================================
-- diviyaj_deploy_2026-06-30.sql  —  SINGLE consolidated script for Diviyaj
-- ============================================================================
-- Apply to PRODUCTION Supabase (project ref oolwklahstnvocaugryg, planner schema). Run ONCE.
-- Scope: every DB migration committed in the LAST ~24 HOURS (planner app v25.49 -> v25.62):
--   084 (Samples feature), 085 (samples "change requested"), 086 (PO Packing & Labelling
--   + "Direct to Client details" approval), 087 (default Polybags / D&B Product barcodes /
--   D&B Carton labels to YES), 088 (performance index on purchase_orders.deposit_ref).
-- Picks up where diviyaj_deploy_2026-06-28.sql left off (that package covered 072–083).
-- WRAPPED IN ONE TRANSACTION (atomic: all-or-nothing). Every statement is idempotent
-- (CREATE TABLE/INDEX IF NOT EXISTS / ADD COLUMN IF NOT EXISTS), so it is safe to re-run.
--
-- Also wire (app/back-end, not DB — see HANDOVER.md):
--   • Samples: live /api/portal/sample-* endpoints + bootstrap `samples` array.
--   • Shipment freight charge: /api/portal/shipment-charge + /api/portal/shipment-charges/:ref.
--   • Direct to Client details: /api/portal/dtc-accept; portal bootstrap + admin purchase-orders
--     queries now also return pack_* and dtc_accepted_* (+ branch/country on the portal grid).
-- ============================================================================

BEGIN;

-- ───────────────────────────────────────────────────────────────────────────
-- 084_samples.sql — Samples feature
-- Sample requests (+ SKU lines), a shared timeline (sample_notes), and a generic supplier_charges
-- table covering BOTH sample and shipment charges. Accepting a charge posts an Other Payment
-- (planner.deposits with is_deposit=false) against the supplier.
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS planner.sample_requests (
  id                bigserial PRIMARY KEY,
  ref               text UNIQUE,                          -- human ref, e.g. SR-1043 (server sets on create)
  supplier_id       bigint REFERENCES planner.suppliers(id),
  supplier_name     text,
  recipient_company text,
  first_name        text,
  last_name         text,
  address_line1     text,
  address_line2     text,
  city              text,
  region            text,
  postcode          text,
  country           text,
  phone             text,
  completion_date_required     date,
  purpose           text[],                               -- sales | product | photography | marketing | operations
  notes             text,
  status            text NOT NULL DEFAULT 'open',         -- open | complete | cancelled
  accepted_at       timestamptz,                          -- supplier accepted the request
  supplier_expected_completion date,                      -- supplier's expected completion date
  tracking_code     text,
  carrier           text,
  created_by        text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sample_requests_supplier ON planner.sample_requests(supplier_id);
CREATE INDEX IF NOT EXISTS idx_sample_requests_status   ON planner.sample_requests(status);

CREATE TABLE IF NOT EXISTS planner.sample_request_lines (
  id          bigserial PRIMARY KEY,
  sample_id   bigint NOT NULL REFERENCES planner.sample_requests(id) ON DELETE CASCADE,
  sku         text NOT NULL,
  qty         integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sample_lines_sample ON planner.sample_request_lines(sample_id);

CREATE TABLE IF NOT EXISTS planner.sample_notes (
  id           bigserial PRIMARY KEY,
  sample_id    bigint NOT NULL REFERENCES planner.sample_requests(id) ON DELETE CASCADE,
  author_kind  text NOT NULL DEFAULT 'internal',          -- internal | supplier
  author_email text,
  body         text NOT NULL,
  read_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sample_notes_sample ON planner.sample_notes(sample_id);

CREATE TABLE IF NOT EXISTS planner.supplier_charges (
  id               bigserial PRIMARY KEY,
  source_type      text NOT NULL,                         -- 'sample' | 'shipment'
  source_ref       text NOT NULL,                         -- sample_requests.ref OR shipments.shipment_ref
  supplier_name    text,
  freight_cost     numeric DEFAULT 0,
  product_cost     numeric DEFAULT 0,
  description      text,
  status           text NOT NULL DEFAULT 'pending',       -- pending | accepted | rejected
  other_payment_id bigint,                                -- planner.deposits.id created on accept (is_deposit=false)
  created_by       text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  accepted_at      timestamptz
);
CREATE INDEX IF NOT EXISTS idx_supplier_charges_src    ON planner.supplier_charges(source_type, source_ref);
CREATE INDEX IF NOT EXISTS idx_supplier_charges_status ON planner.supplier_charges(status);

-- ───────────────────────────────────────────────────────────────────────────
-- 085_sample_change_requested.sql — Samples "Change requested" workflow.
-- SKUs/qty change AFTER acceptance flags the request for re-acceptance. Cleared on (re-)accept.
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE planner.sample_requests
  ADD COLUMN IF NOT EXISTS change_requested boolean NOT NULL DEFAULT false;

-- ───────────────────────────────────────────────────────────────────────────
-- 086_po_packing_labelling.sql — Packing & Labelling on a PO (Client/FBA tab) +
-- supplier "Direct to Client details" approval. Editing any pack_* field after approval clears
-- the approval (app-level, in the PO patch handler) so the supplier re-approves.
-- ───────────────────────────────────────────────────────────────────────────
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
  ADD COLUMN IF NOT EXISTS dtc_accepted_at       timestamptz,
  ADD COLUMN IF NOT EXISTS dtc_accepted_by       text;

-- ───────────────────────────────────────────────────────────────────────────
-- 087_pack_default_yes.sql — default the standard D&B packing to YES (Polybags, D&B Product
-- barcodes, D&B Carton labels). New POs default to true; existing UNTOUCHED POs are initialised
-- to Yes (only rows with no packing content yet — safe to re-run, never overrides edited POs).
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE planner.purchase_orders
  ALTER COLUMN pack_polybags     SET DEFAULT true,
  ALTER COLUMN pack_dnb_barcodes SET DEFAULT true,
  ALTER COLUMN pack_dnb_carton   SET DEFAULT true;

UPDATE planner.purchase_orders
   SET pack_polybags = true, pack_dnb_barcodes = true, pack_dnb_carton = true
 WHERE NOT pack_polybags AND NOT pack_dnb_barcodes AND NOT pack_rfid_barcodes
   AND NOT pack_dnb_carton AND NOT pack_client_carton
   AND coalesce(pack_polybags_notes,'')='' AND coalesce(pack_dnb_barcodes_notes,'')=''
   AND coalesce(pack_rfid_barcodes_notes,'')='' AND coalesce(pack_dnb_carton_notes,'')=''
   AND coalesce(pack_client_carton_notes,'')='' AND coalesce(pack_pallet_notes,'')=''
   AND coalesce(pack_other_notes,'')='';

-- ───────────────────────────────────────────────────────────────────────────
-- 088_po_deposit_ref_index.sql — PERFORMANCE. Index purchase_orders(deposit_ref): the PO grid calc
-- computes deposit availability with a per-row correlated subquery over purchase_orders by deposit_ref;
-- without this index that is a full seq scan per PO (O(n^2)). Cuts the supply-plan PO query ~45%.
-- ───────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS po_deposit_ref_idx ON planner.purchase_orders(deposit_ref);

COMMIT;

-- Verify (optional):
--   SELECT to_regclass('planner.sample_requests'), to_regclass('planner.supplier_charges');
--   SELECT column_name FROM information_schema.columns
--    WHERE table_schema='planner' AND table_name='purchase_orders'
--      AND (column_name LIKE 'pack\_%' OR column_name LIKE 'dtc\_%') ORDER BY 1;
