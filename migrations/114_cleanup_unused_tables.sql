-- 114_cleanup_unused_tables.sql
-- Streamlining: drop unused app tables + dated backup snapshots. Diviyaj to run on live once satisfied
-- the backups aren't needed for rollback. All DROP ... IF EXISTS so it's safe to re-run.
--
-- NOT included on purpose:
--   * planner.product_inventory -- ORPHANED (v_product_inventory now unpivots planner.products.inventory_*,
--     so nothing reads product_inventory), BUT n8n still WRITES to it. Retire the n8n step FIRST, then drop
--     the table separately -- otherwise the next sync errors.
--   * The empty-but-referenced feature tables (sample_notes, shipment_notes, portal_attachments,
--     supplier_charges, manufacturing_accept, key_accounts, erp_compare_ignored, payment_run_meta,
--     production_deposits, demand_action_state) -- empty only because unused so far; keep.

BEGIN;

-- Dead app tables (0 rows, 0 code references) --------------------------------------------------------
DROP TABLE IF EXISTS planner.buy_plan;             -- buy plan is computed client-side; never persisted (Ben confirmed)
DROP TABLE IF EXISTS planner.inventory_snapshots;  -- legacy; no rows, no code refs
DROP TABLE IF EXISTS planner.prepack_bom;          -- legacy; no rows, no code refs

-- Dated backup snapshots (created during ERP cleanup / product refresh / migration prep) -------------
DROP TABLE IF EXISTS planner.erp_purchase_orders_bak_20260626;
DROP TABLE IF EXISTS planner.suppliers_bak_20260626;
DROP TABLE IF EXISTS planner.po55ukxr2_bak_20260626;
DROP TABLE IF EXISTS planner.erp_lines_pruned_20260626;
DROP TABLE IF EXISTS planner.erp_purchase_order_lines_bak_20260626;
DROP TABLE IF EXISTS planner.purchase_order_lines_bak_20260626;
DROP TABLE IF EXISTS planner.z_products_bak_20260708;
DROP TABLE IF EXISTS planner.z_products_bak_20260710;
DROP TABLE IF EXISTS planner.z_product_countries_bak_20260710;

COMMIT;
