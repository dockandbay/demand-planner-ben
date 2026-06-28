-- ============================================================================
-- diviyaj_deploy_2026-06-28.sql  —  SINGLE consolidated script for Diviyaj
-- ============================================================================
-- Apply to PRODUCTION Supabase (project ref oolwklahstnvocaugryg, `planner` schema).
-- Bundles every schema + data change added since the last handoff — covers planner app v20.401–v20.405.
-- Idempotent and transaction-wrapped. Run ONCE. Review the verification SELECTs before COMMIT.
--
-- CONTENTS
--   1) Migration 082 — add `starred` to purchase_orders + shipments (⭐ Focus/favourite toggle).
--   2) Migration 083 — streamline prod_no to the canonical NUMERIC form (strip leading "P") and
--      backfill the missing prod_numbers reference from the Xero account code.
--      *** SUPERSEDES migration 081 (P53→53). Do NOT run 081 — 083 covers P53 and every other Pnn. ***
--
-- NOT INCLUDED (intentionally):
--   • The sandbox-only ERP-mirror cleanups for two voided test POs (PO-57AULX4 / PO-57AUXR1).
--     Production `erp_purchase_orders` is n8n-synced from Cin7, so no manual edit is needed there.
--
-- CAVEAT (financial / sync): `purchase_orders.prod_no` is n8n Airtable→Supabase sync-fed. After running,
--   fix the Airtable source so "P"-prefixed prod_no values don't reappear on the next sync.
-- ============================================================================

BEGIN;

-- ============================================================
-- 1) Migration 082 — ⭐ Focus / favourite star (additive, idempotent)
-- ============================================================
ALTER TABLE planner.purchase_orders ADD COLUMN IF NOT EXISTS starred boolean NOT NULL DEFAULT false;
ALTER TABLE planner.shipments       ADD COLUMN IF NOT EXISTS starred boolean NOT NULL DEFAULT false;

-- ============================================================
-- 2) Migration 083 — streamline prod_no → numeric + Xero backfill (supersedes 081)
-- ============================================================
-- Part A — transactional tables (no UNIQUE on prod_no → safe bulk strip). Strips a leading "P"/"p"
--          only when followed by a digit, so non-production markers like "AU" are left alone.
UPDATE planner.purchase_orders     SET prod_no = regexp_replace(prod_no, '^[Pp]', '') WHERE prod_no ~ '^[Pp][0-9]';
UPDATE planner.deposits            SET prod_no = regexp_replace(prod_no, '^[Pp]', '') WHERE prod_no ~ '^[Pp][0-9]';
UPDATE planner.production_deposits SET prod_no = regexp_replace(prod_no, '^[Pp]', '') WHERE prod_no ~ '^[Pp][0-9]';

-- Part B — prod_numbers (UNIQUE prod_no). Two guarded steps; any leftover collision is left in place
--          and surfaced by the verification query for a manual merge (see section 3).
-- B1. Backfill prod_no from the Xero code where the reference is missing ("620.26 P46" -> "46"),
--     only when that numeric prod_no doesn't already exist.
UPDATE planner.prod_numbers pn
   SET prod_no = regexp_replace(pn.xero_account_code, '^.*[Pp]([0-9]+).*$', '\1')
 WHERE pn.prod_no IS NULL
   AND pn.xero_account_code ~ '[Pp][0-9]+'
   AND NOT EXISTS (SELECT 1 FROM planner.prod_numbers x
                    WHERE x.prod_no = regexp_replace(pn.xero_account_code, '^.*[Pp]([0-9]+).*$', '\1'));
-- B2. Strip the leading "P" from populated prod_no ("P48" -> "48"), only when the numeric twin
--     doesn't already exist (avoids the UNIQUE violation; the duplicate is flagged in section 3).
UPDATE planner.prod_numbers pn
   SET prod_no = regexp_replace(pn.prod_no, '^[Pp]', '')
 WHERE pn.prod_no ~ '^[Pp][0-9]'
   AND NOT EXISTS (SELECT 1 FROM planner.prod_numbers x
                    WHERE x.prod_no = regexp_replace(pn.prod_no, '^[Pp]', ''));

-- ---- Verification (run these and review BEFORE COMMIT) ----
-- Any "P"-prefixed prod_no left = a genuine collision needing a manual merge (see section 3):
--   SELECT 'prod_numbers' t, prod_no FROM planner.prod_numbers   WHERE prod_no ~ '^[Pp][0-9]'
--   UNION ALL SELECT 'purchase_orders', prod_no FROM planner.purchase_orders WHERE prod_no ~ '^[Pp][0-9]'
--   UNION ALL SELECT 'deposits', prod_no FROM planner.deposits   WHERE prod_no ~ '^[Pp][0-9]';
-- prod_numbers still missing a reference (expect none after B1):
--   SELECT prod_no, xero_account_code, status FROM planner.prod_numbers WHERE prod_no IS NULL ORDER BY xero_account_code;
-- Sandbox dry-run result for reference: 0 P-prefixed in purchase_orders/deposits, NULL prod_numbers all
-- backfilled, ONE leftover collision: duplicate 'P66' (see section 3).

COMMIT;

-- ============================================================
-- 3) OPTIONAL manual merge — duplicate P66 (review, then run if it applies)
-- ============================================================
-- After section 2, prod_numbers may hold BOTH an active 'P66' (no Xero code) AND a '66' (Xero '620.46 P66').
-- Inspect, then keep one as '66'. Recommended (UNCOMMENT + adjust after checking the two rows):
--   -- carry the active status onto the '66' row, then drop the 'P66' duplicate:
--   UPDATE planner.prod_numbers SET status = 'ACTIVE' WHERE prod_no = '66';
--   DELETE FROM planner.prod_numbers WHERE prod_no = 'P66';
--
-- NOTE: prod_no '55.0326' and 'AU' are intentionally left untouched (not Pnn productions).
