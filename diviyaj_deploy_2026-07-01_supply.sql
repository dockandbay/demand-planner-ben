-- =============================================================================
-- Diviyaj deploy — SUPPLY changes since early 2026-07-01 (HORIZON v25.83 → v25.119)
-- =============================================================================
-- Run against PRODUCTION (project ref oolwklahstnvocaugryg), schema `planner`.
-- Two schema/data migrations. Both are idempotent — safe to re-run.
--
-- Everything else shipped today (v25.83–v25.119) is app code only (server.mjs +
-- supply/inject.html + supply/portal-view.js) — no other schema changes.
--
-- Migrations included:
--   089_productions_57_78_active_confirm.sql  — productions 57–78 → ACTIVE + require confirmation
--   090_erp_compare_ignored.sql               — new table for the ERP COMPARE "ignore" list
--
-- NOT included here (handle separately):
--   po_client_master_update_2026-07-01.sql    — a ONE-OFF live DATA update (bulk PO client-data
--   from CSV; skips blanks, doesn't overwrite). It is intentionally not tracked in git. Run it
--   once on live if it hasn't been run yet; it is not a schema migration.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 089 — Set productions 57–78 to ACTIVE and require_supplier_confirmation = true.
--       Idempotent (re-running sets the same values). The prod_no ~ '^[0-9]+$'
--       guard keeps it safe against non-numeric prod_no values.
-- ---------------------------------------------------------------------------
UPDATE planner.prod_numbers
   SET status = 'ACTIVE',
       require_supplier_confirmation = true
 WHERE prod_no ~ '^[0-9]+$'
   AND prod_no::int BETWEEN 57 AND 78;

-- ---------------------------------------------------------------------------
-- 090 — "ignore" list for the ERP COMPARE report (SUPPLY ▸ BI & REPORTS ▸ ERP COMPARE).
--       Planner-owned table; ignoring a PO drops it from the active list + the
--       open-actions count, still shown under the report's "ignored" section.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS planner.erp_compare_ignored (
  po          text PRIMARY KEY,                 -- ERP PO number being ignored (matches erp_purchase_orders.po)
  ignored_by  text,                             -- who ignored it (session email / 'admin')
  ignored_at  timestamptz DEFAULT now()
);

COMMENT ON TABLE planner.erp_compare_ignored IS
  'PO numbers deliberately ignored on the ERP COMPARE report — excluded from the active list and the open-actions count, still shown under the report''s ignored section.';

COMMIT;
