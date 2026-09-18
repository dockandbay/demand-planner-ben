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

BEGIN;

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
