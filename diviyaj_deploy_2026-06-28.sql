-- ============================================================================
-- diviyaj_deploy_2026-06-28.sql  —  SINGLE consolidated script for Diviyaj
-- ============================================================================
-- Apply to PRODUCTION Supabase (project ref oolwklahstnvocaugryg, planner schema). Run ONCE.
-- Scope: every DB migration committed in the LAST ~36 HOURS (planner app v20.351 -> v20.405):
--   072,073,074,075,076,077,078,079,080,082,083.
--   *** 081 (P53->53) is OMITTED — SUPERSEDED by 083, which covers P53 and every other Pnn. ***
-- WRAPPED IN ONE TRANSACTION (atomic: all-or-nothing). Every section is idempotent (IF NOT EXISTS /
-- guarded), so this is safe to run even if some of 072-080 were already applied with earlier deploys.
-- Older migrations (062-071) are assumed already on prod / per HANDOVER.md.
--
-- NOT INCLUDED: sandbox-only ERP-mirror cleanups for two voided test POs (prod erp_purchase_orders is
--   n8n-synced from Cin7). CAVEAT: purchase_orders.prod_no is n8n Airtable-fed — fix the Airtable source
--   after this runs or P-prefixed values reappear on the next sync.
--
-- BEFORE COMMIT you may run the verification SELECTs noted in the 083 section, plus the optional P66
-- manual-merge at the very bottom (outside the transaction).
-- ============================================================================

BEGIN;

-- ====================================================================
-- 072_client_fba_tab.sql
-- ====================================================================
-- 072: Client/FBA tab (#12) — a client deadline date on the PO, and a category on attachments so
-- client/FBA documents are kept separate from supplier invoice docs (both live in portal_attachments).

ALTER TABLE planner.purchase_orders
  ADD COLUMN IF NOT EXISTS client_deadline_date date;

ALTER TABLE planner.portal_attachments
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'invoice';   -- 'invoice' (supplier) | 'client' (Client/FBA tab)

-- ====================================================================
-- 073_po_asn_numbers.sql
-- ====================================================================
-- 073: ASN numbers on a PO (#10) — comma-separated Advanced Shipping Notice numbers entered on the new
-- PURCHASE ORDERS ▸ Shipments sub-tab (used for iFulfillment inbound / pallet labelling).

ALTER TABLE planner.purchase_orders
  ADD COLUMN IF NOT EXISTS asn_numbers text;

-- ====================================================================
-- 074_supplier_po_confirmation.sql
-- ====================================================================
-- 074: Supplier PO confirmation workflow — the supplier reviews the order (SKUs / quantities / dates) and
-- formally confirms it from the portal. Stored on the PO so the admin can see confirmation status + chase.

ALTER TABLE planner.purchase_orders
  ADD COLUMN IF NOT EXISTS supplier_confirmed_at  timestamptz,
  ADD COLUMN IF NOT EXISTS supplier_confirmed_by  text;

-- ====================================================================
-- 075_shipment_notes.sql
-- ====================================================================
-- 075: Shipment Plan timeline — per-shipment notes/timeline, written from both the admin (SUPPLY ▸ Shipments
-- ▸ Shipment Plan) and the supplier portal (SHIPMENT PLAN tab). Keyed on the master shipment ref.

CREATE TABLE IF NOT EXISTS planner.shipment_notes (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  shipment_ref text NOT NULL,
  author_kind  text NOT NULL DEFAULT 'internal',   -- 'internal' (D&B) | 'supplier'
  author_email text,
  body         text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shipment_notes_ref_idx ON planner.shipment_notes (shipment_ref, created_at);

-- ====================================================================
-- 076_shipment_escalated.sql
-- ====================================================================
-- 076: Shipment escalation — an ESCALATED toggle on a shipment (set from the supplier portal Shipment Plan or
-- the admin Shipments grid). Shows as a column + filter on SUPPLY ▸ Shipments and raises an Action while escalated.

ALTER TABLE planner.shipments
  ADD COLUMN IF NOT EXISTS escalated     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS escalated_at  timestamptz;

-- ====================================================================
-- 077_prod_require_confirmation.sql
-- ====================================================================
-- 077: Per-production "require supplier confirmation" flag. When TRUE, the supplier-confirmation workflow is
-- active for every PO in that production (the portal asks the supplier to confirm SKUs/qty/dates, and an
-- unconfirmed order raises an action). Defaults to FALSE so all CURRENT productions start with the workflow OFF;
-- future productions can be flipped to TRUE to switch it on.

ALTER TABLE planner.prod_numbers
  ADD COLUMN IF NOT EXISTS require_supplier_confirmation boolean NOT NULL DEFAULT false;

-- ====================================================================
-- 078_shipment_notes_read.sql
-- ====================================================================
-- 078: read/unread on shipment timeline notes (mirrors supplier_notes.read_at). A supplier-authored note shows
-- as "new" on the admin SUPPLY ▸ Shipments grid until an internal user marks it read; an unread counter shows
-- on the shipment row. read_at NULL = unread.

ALTER TABLE planner.shipment_notes
  ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- ====================================================================
-- 079_shipment_supplier_created.sql
-- ====================================================================
-- 079: flag shipments that a supplier created from the portal (by submitting carrier/tracking on a PO with no
-- shipment). These raise a "Supplier created new shipment" action so the planner reviews the new shipment.

ALTER TABLE planner.shipments
  ADD COLUMN IF NOT EXISTS supplier_created_at timestamptz,
  ADD COLUMN IF NOT EXISTS supplier_created_by text;

-- ====================================================================
-- 080_forecast_export_settings.sql
-- ====================================================================
-- 080: per-country forecast-export settings — the email address each country's forecast CSV is sent to
-- (used by the "email forecast" / "email all countries" feature). DriveHQ FTP creds live in env, not here.

CREATE TABLE IF NOT EXISTS planner.forecast_export_settings (
  country     text PRIMARY KEY,
  email       text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- seed the known markets (emails filled in via the UI)
INSERT INTO planner.forecast_export_settings (country) VALUES ('UK'),('US'),('EU'),('AU'),('CA')
  ON CONFLICT (country) DO NOTHING;

-- ====================================================================
-- 082_po_shipment_starred.sql
-- ====================================================================
-- 082_po_shipment_starred.sql
-- "Focus / favourite" star toggle on Purchase Orders and Shipments.
-- Adds a shared, persistent boolean flag. Toggled from the SUPPLY ▸ Purchase Orders and
-- SUPPLY ▸ Shipments grids; the "⭐ Focus" filter shows only starred + active (non-complete) items.
-- Shared across the team and every device (DB-backed, not per-browser). Idempotent.

ALTER TABLE planner.purchase_orders ADD COLUMN IF NOT EXISTS starred boolean NOT NULL DEFAULT false;
ALTER TABLE planner.shipments       ADD COLUMN IF NOT EXISTS starred boolean NOT NULL DEFAULT false;

-- ====================================================================
-- 083_streamline_prod_no.sql
-- ====================================================================
-- 083_streamline_prod_no.sql
-- Streamline ALL production numbers to the canonical NUMERIC form (strip the leading "P"),
-- and backfill the missing prod_numbers reference from the Xero account code.
--
-- *** SUPERSEDES migration 081 (P53 -> 53). 083 covers P53 AND every other Pnn — run 083, NOT 081. ***
--
-- Why (sandbox state at time of writing):
--   • purchase_orders.prod_no is mostly numeric ("46","54",…) but has "P"-prefixed stragglers
--     (P53×2, P54×14, P55×2, P60×2) that SPLIT productions in two ("P54" and "54").
--   • deposits.prod_no is entirely "P"-prefixed (P19..P56).
--   • Many prod_numbers rows have prod_no = NULL with the production buried in the Xero account
--     code (e.g. "620.26 P46"), so those productions (46 = 141 POs) never link to their Xero account.
--
-- *** DIVIYAJ — HANDLE CAREFULLY (financial / Xero mapping). Run inside the transaction; review the
--     verification SELECTs before COMMIT. NOTE: purchase_orders.prod_no is n8n Airtable->Supabase
--     sync-fed — fix the Airtable source too, or the "P"-prefixed POs return on the next sync. ***
--
-- Xero account-code STRINGS (e.g. "620.26 P46") are intentionally left unchanged — they are the real
-- Xero GL account labels; the production reference is the (now numeric) prod_no, and the Xero export
-- join is already P-insensitive.


-- ── Part A — transactional tables (no UNIQUE on prod_no → safe bulk strip). Strips a leading "P"/"p"
--             only when followed by a digit, so non-production markers like "AU" are left alone. Idempotent.
UPDATE planner.purchase_orders     SET prod_no = regexp_replace(prod_no, '^[Pp]', '') WHERE prod_no ~ '^[Pp][0-9]';
UPDATE planner.deposits            SET prod_no = regexp_replace(prod_no, '^[Pp]', '') WHERE prod_no ~ '^[Pp][0-9]';
UPDATE planner.production_deposits SET prod_no = regexp_replace(prod_no, '^[Pp]', '') WHERE prod_no ~ '^[Pp][0-9]';

-- ── Part B — prod_numbers (UNIQUE prod_no). Two guarded steps; any leftover collision is left in place
--             and surfaced by the verification query for a manual merge (rather than auto-deleting rows).

-- B1. Backfill prod_no from the Xero code where the reference is missing ("620.26 P46" -> "46"),
--     but only when that numeric prod_no doesn't already exist.
UPDATE planner.prod_numbers pn
   SET prod_no = regexp_replace(pn.xero_account_code, '^.*[Pp]([0-9]+).*$', '\1')
 WHERE pn.prod_no IS NULL
   AND pn.xero_account_code ~ '[Pp][0-9]+'
   AND NOT EXISTS (SELECT 1 FROM planner.prod_numbers x
                    WHERE x.prod_no = regexp_replace(pn.xero_account_code, '^.*[Pp]([0-9]+).*$', '\1'));

-- B2. Strip the leading "P" from populated prod_no ("P48" -> "48"), only when the numeric twin
--     doesn't already exist (avoids the UNIQUE violation; the duplicate is flagged below).
UPDATE planner.prod_numbers pn
   SET prod_no = regexp_replace(pn.prod_no, '^[Pp]', '')
 WHERE pn.prod_no ~ '^[Pp][0-9]'
   AND NOT EXISTS (SELECT 1 FROM planner.prod_numbers x
                    WHERE x.prod_no = regexp_replace(pn.prod_no, '^[Pp]', ''));

-- ── Verification (review before COMMIT) ──
-- 1) Any "P"-prefixed prod_no left anywhere = a genuine collision needing a manual merge:
--    SELECT 'prod_numbers' t, prod_no FROM planner.prod_numbers   WHERE prod_no ~ '^[Pp][0-9]'
--    UNION ALL SELECT 'purchase_orders', prod_no FROM planner.purchase_orders WHERE prod_no ~ '^[Pp][0-9]'
--    UNION ALL SELECT 'deposits', prod_no FROM planner.deposits   WHERE prod_no ~ '^[Pp][0-9]';
-- 2) prod_numbers still missing a reference:
--    SELECT prod_no, xero_account_code, status FROM planner.prod_numbers WHERE prod_no IS NULL ORDER BY xero_account_code;
--
-- KNOWN MANUAL ITEMS (sandbox at time of writing):
--   • P66 exists twice — an ACTIVE row (prod_no 'P66', no Xero code) and a CLOSED row ('620.46 P66').
--     B1 makes the closed row '66'; B2 then leaves the active row as 'P66'. Decide which to keep as
--     '66' (and which Xero code it carries), merge, and delete the other.
--   • prod_no '55.0326' and 'AU' are intentionally untouched (not Pnn productions).

COMMIT;

-- ============================================================
-- OPTIONAL manual merge — duplicate P66 (run AFTER COMMIT, only if it applies)
-- ============================================================
-- After 083, prod_numbers may hold BOTH an active 'P66' (no Xero code) AND a '66' (Xero '620.46 P66').
-- Inspect, then keep one as '66'. Example (UNCOMMENT + adjust after checking the two rows):
--   UPDATE planner.prod_numbers SET status='ACTIVE' WHERE prod_no='66';
--   DELETE FROM planner.prod_numbers WHERE prod_no='P66';
