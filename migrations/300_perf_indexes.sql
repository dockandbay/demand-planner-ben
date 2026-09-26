-- 300_perf_indexes.sql  (v27.879, Ben)  — Supabase performance advisor pass, 24-Sep-2026
-- (a) covering indexes for the 14 foreign keys the advisor flagged as unindexed (planner schema);
-- (b) drop 4 exact-duplicate indexes (identical column, same table) — keeps the descriptively named one.
-- Idempotent and guarded: each index is only created when its table + column exist (the sandbox lacks
-- buy_plan.warehouse, prod has it). Safe to re-run. No data changes. No table drops here: the ~20 *_bak_* tables
-- the advisor lists are for Diviyaj to confirm dead before anything is dropped.

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT * FROM (VALUES
      ('buy_plan',                      'warehouse',          'buy_plan_warehouse_idx'),
      ('category_target_cover',         'warehouse',          'category_target_cover_warehouse_idx'),
      ('channel_countries',             'country_code',       'channel_countries_country_code_idx'),
      ('key_account_forecasts',         'warehouse',          'key_account_forecasts_warehouse_idx'),
      ('preorders',                     'warehouse',          'preorders_warehouse_idx'),
      ('product_dev_components',        'component_type_id',  'product_dev_components_component_type_idx'),
      ('product_dev_request_components','component_id',       'product_dev_request_components_component_idx'),
      ('product_dev_size_dimensions',   'approved_sample_id', 'product_dev_size_dimensions_approved_sample_idx'),
      ('product_dev_sizes',             'approved_sample_id', 'product_dev_sizes_approved_sample_idx'),
      ('product_inventory',             'warehouse',          'product_inventory_warehouse_idx'),
      ('product_sample_reject_reasons', 'reason_id',          'product_sample_reject_reasons_reason_idx'),
      ('product_target_cover_override', 'warehouse',          'product_target_cover_override_warehouse_idx'),
      ('subcategories',                 'category',           'subcategories_category_idx'),
      ('supplier_portal_users',         'supplier_id',        'supplier_portal_users_supplier_idx')
    ) AS v(tbl, col, idx)
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='planner' AND table_name=t.tbl AND column_name=t.col) THEN
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON planner.%I (%I)', t.idx, t.tbl, t.col);
    END IF;
  END LOOP;
END $$;

-- duplicate indexes (same table, same single column): keep one
DROP INDEX IF EXISTS planner.dtc_so_lines_soid_idx;      -- keep dtc_sales_order_lines_so (so_cin7_id)
DROP INDEX IF EXISTS planner.po_lines_po_idx;            -- keep purchase_order_lines_po (po)
DROP INDEX IF EXISTS planner.tpl_cin7_orders_con_idx;    -- keep tpl_cin7_orders_custorder (customer_order_no)
DROP INDEX IF EXISTS planner.tpl_cin7_orders_ref_idx;    -- keep tpl_cin7_orders_reference (reference)
