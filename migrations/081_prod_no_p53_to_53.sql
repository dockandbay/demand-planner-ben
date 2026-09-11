-- 081_prod_no_p53_to_53.sql
-- Consolidate the "P53" production onto "53" to match the 140 POs that already use "53".
--
-- CONTEXT (why this exists):
--   • prod_numbers (config) had ONE row: prod_no = 'P53'.
--   • purchase_orders: 140 rows use prod_no = '53', only 2 use 'P53'.
--   • deposits + production_deposits were all keyed prod_no = 'P53'.
--   Result: the 140 "53" POs did NOT exact-match the config / deposit rollup
--   (deposit *money* was unaffected — that links by deposit_ref, not prod_no).
--
-- WHAT THIS CHANGES (prod_no key only):
--   1. prod_numbers   'P53' -> '53'   (collision-guarded: only if no '53' row already exists)
--   2. deposits       'P53' -> '53'
--   3. production_deposits 'P53' -> '53'
--
-- WHAT THIS DELIBERATELY DOES NOT TOUCH:
--   • deposits.reference strings  ('P53-UK-XR' …)         — human references / unaffected by prod_no
--   • prod_numbers.xero_account_code ('620.33 P53')       — the real Xero GL account label, NOT the prod key
--   • purchase_orders.prod_no for the 2 remaining 'P53' POs — Ben updates these manually (see note below)
--
-- *** DIVIYAJ — HANDLE CAREFULLY ON PROD ***
--   • prod_no on purchase_orders is fed by the n8n Airtable->Supabase sync (this app only sets it on
--     PO-create / rebalance). CONFIRM where the source "53" vs "P53" originates before/after applying —
--     if Airtable still carries 'P53' for any PO it may reappear on the next sync.
--   • Run inside the transaction below; verify the row counts in the final SELECTs match expectations
--     (≈ 1 prod_numbers row, 11 deposits, N production_deposits) before COMMIT.
--   • The 2 (Ben says ~3) leftover 'P53' POs are handled manually by Ben, not by this migration.

BEGIN;

-- 1. config record — guard against the unique(prod_no) constraint if a '53' row somehow exists
UPDATE planner.prod_numbers
   SET prod_no = '53'
 WHERE prod_no = 'P53'
   AND NOT EXISTS (SELECT 1 FROM planner.prod_numbers WHERE prod_no = '53');

-- 2. deposits (direct-entry table; not ERP-fed) — makes the production-level deposit rollup match the "53" POs
UPDATE planner.deposits
   SET prod_no = '53'
 WHERE prod_no = 'P53';

-- 3. production_deposits link table (PK = prod_no, supplier_name, deposit_ref) — no conflict, no '53' rows exist
UPDATE planner.production_deposits
   SET prod_no = '53'
 WHERE prod_no = 'P53';

-- ---- verification (review before COMMIT) ----
-- SELECT prod_no, xero_account_code FROM planner.prod_numbers WHERE prod_no IN ('53','P53');
-- SELECT prod_no, count(*) FROM planner.deposits            WHERE prod_no IN ('53','P53') GROUP BY prod_no;
-- SELECT prod_no, count(*) FROM planner.production_deposits WHERE prod_no IN ('53','P53') GROUP BY prod_no;
-- SELECT prod_no, count(*) FROM planner.purchase_orders     WHERE prod_no IN ('53','P53') GROUP BY prod_no;  -- expect the 2-3 'P53' until Ben fixes them

COMMIT;
