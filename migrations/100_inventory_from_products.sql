-- 100_inventory_from_products.sql
-- Re-source on-hand inventory from planner.products.inventory_* columns instead of the legacy
-- planner.product_inventory table (fresher, live/Airtable-fed, carries us_awd + uk/us_nongrs).
--
-- Also normalises the inventory_* columns to numeric: the 3pl/fba/awd columns were stored as text;
-- the nongrs columns were already numeric. After this, ALL inventory fields are numeric.
--
-- Design:
--   * v_product_inventory unpivots the 9 plain warehouses into the SAME (sku, warehouse, available)
--     long shape the old table had, so every existing aggregation keeps identical semantics.
--   * AWD (inventory_us_awd) is NOT unpivoted here — it stays a dedicated pool added onto US-FBA
--     cover in the buy logic (avoids double-counting). NonGRS stays display-only (read directly).
--   * The old planner.product_inventory TABLE is left in place (now unused) and can be dropped on
--     live once verified.
--
-- Safe to run even if an earlier version of this migration already ran: it drops/recreates the view
-- and function. Data is verified junk-free on both sandbox and live (defensive cast anyway: any
-- non-numeric/blank text -> NULL).

-- (1) Drop the view first (columns can't be re-typed while a view depends on them).
DROP VIEW IF EXISTS planner.v_product_inventory;
DROP FUNCTION IF EXISTS planner.safe_int(text);

-- (2) Convert the 10 text inventory columns to numeric.
ALTER TABLE planner.products
  ALTER COLUMN inventory_uk_3pl TYPE numeric USING (CASE WHEN inventory_uk_3pl ~ '^-?[0-9]+(\.[0-9]+)?$' THEN inventory_uk_3pl::numeric END),
  ALTER COLUMN inventory_us_3pl TYPE numeric USING (CASE WHEN inventory_us_3pl ~ '^-?[0-9]+(\.[0-9]+)?$' THEN inventory_us_3pl::numeric END),
  ALTER COLUMN inventory_eu_3pl TYPE numeric USING (CASE WHEN inventory_eu_3pl ~ '^-?[0-9]+(\.[0-9]+)?$' THEN inventory_eu_3pl::numeric END),
  ALTER COLUMN inventory_au_3pl TYPE numeric USING (CASE WHEN inventory_au_3pl ~ '^-?[0-9]+(\.[0-9]+)?$' THEN inventory_au_3pl::numeric END),
  ALTER COLUMN inventory_uk_fba TYPE numeric USING (CASE WHEN inventory_uk_fba ~ '^-?[0-9]+(\.[0-9]+)?$' THEN inventory_uk_fba::numeric END),
  ALTER COLUMN inventory_us_fba TYPE numeric USING (CASE WHEN inventory_us_fba ~ '^-?[0-9]+(\.[0-9]+)?$' THEN inventory_us_fba::numeric END),
  ALTER COLUMN inventory_eu_fba TYPE numeric USING (CASE WHEN inventory_eu_fba ~ '^-?[0-9]+(\.[0-9]+)?$' THEN inventory_eu_fba::numeric END),
  ALTER COLUMN inventory_au_fba TYPE numeric USING (CASE WHEN inventory_au_fba ~ '^-?[0-9]+(\.[0-9]+)?$' THEN inventory_au_fba::numeric END),
  ALTER COLUMN inventory_ca_fba TYPE numeric USING (CASE WHEN inventory_ca_fba ~ '^-?[0-9]+(\.[0-9]+)?$' THEN inventory_ca_fba::numeric END),
  ALTER COLUMN inventory_us_awd TYPE numeric USING (CASE WHEN inventory_us_awd ~ '^-?[0-9]+(\.[0-9]+)?$' THEN inventory_us_awd::numeric END);

-- (3) Recreate the view; columns are numeric now, so read them directly.
CREATE VIEW planner.v_product_inventory AS
SELECT p.sku,
       w.warehouse,
       coalesce(w.qty, 0)::int AS available
FROM planner.products p
CROSS JOIN LATERAL (VALUES
  ('uk_3pl', p.inventory_uk_3pl),
  ('us_3pl', p.inventory_us_3pl),
  ('eu_3pl', p.inventory_eu_3pl),
  ('au_3pl', p.inventory_au_3pl),
  ('uk_fba', p.inventory_uk_fba),
  ('us_fba', p.inventory_us_fba),
  ('eu_fba', p.inventory_eu_fba),
  ('au_fba', p.inventory_au_fba),
  ('ca_fba', p.inventory_ca_fba)
) AS w(warehouse, qty);
