-- ============================================================================
-- diviyaj_deploy_2026-07-01.sql  —  SINGLE consolidated script for Diviyaj
-- ============================================================================
-- Apply to PRODUCTION Supabase (project ref oolwklahstnvocaugryg, planner schema). Run ONCE.
-- Scope: SQL changes since diviyaj_deploy_2026-06-30.sql (which covered migrations 084–088).
--   089 — set productions 57–78 ACTIVE + require supplier confirmation (data update).
-- Wrapped in ONE transaction. Idempotent (re-running sets the same values).
--
-- NOTE: the app work since 06-30 (forecast-accuracy KPI + manual snapshot, gzip, lazy portal cards,
-- PO grid/filter UI, picker paste fix) needs NO schema migration — it reuses existing tables.
-- The forecast snapshot writes to existing planner.forecast_runs / planner.forecasts at runtime.
-- ============================================================================

BEGIN;

-- ───────────────────────────────────────────────────────────────────────────
-- 089_productions_57_78_active_confirm.sql
-- ───────────────────────────────────────────────────────────────────────────
UPDATE planner.prod_numbers
   SET status = 'ACTIVE',
       require_supplier_confirmation = true
 WHERE prod_no ~ '^[0-9]+$'
   AND prod_no::int BETWEEN 57 AND 78;

COMMIT;

-- Verify (expect 22 rows, all active + req):
--   SELECT count(*) total,
--          count(*) FILTER (WHERE status='ACTIVE') active,
--          count(*) FILTER (WHERE require_supplier_confirmation) req
--     FROM planner.prod_numbers
--    WHERE prod_no ~ '^[0-9]+$' AND prod_no::int BETWEEN 57 AND 78;
