-- 038_supplier_multiple.sql — multi-supplier sourcing on the product master (v20.118)
--
-- A SKU can be made by more than one factory. main_supplier_final = the default/main supplier; supplier_multiple_all
-- = comma-separated list of all suppliers that can make it (e.g. "XR Textile,Lixin"). Loaded from SKU_CHILD
-- (n8n in prod; CSV in sandbox). Used by BUY PLAN → Purchase Orders to pick the supplier per SKU (default main,
-- override to any in the list).
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS main_supplier_final  text;
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS supplier_multiple_all text;
