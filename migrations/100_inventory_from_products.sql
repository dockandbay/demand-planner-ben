-- 100_inventory_from_products.sql
-- Re-source on-hand inventory from planner.products.inventory_* columns instead of the
-- legacy planner.product_inventory table. The products columns are the fresher, live
-- (Airtable/n8n-fed) source and additionally carry us_awd + uk/us_nongrs.
--
-- Design:
--   * safe_int(text)         — defensive text->int (blanks/junk -> 0; handles negatives/decimals).
--   * v_product_inventory    — unpivots the 9 plain warehouses into the SAME (sku, warehouse,
--                              available) long shape the old table had, so every existing
--                              aggregation keeps identical semantics; only the source changes.
--   * AWD (inventory_us_awd) is NOT unpivoted here — it stays a dedicated pool added onto US-FBA
--     cover in the buy logic (avoids double-counting). NonGRS stays display-only (read directly).
--   * The old planner.product_inventory TABLE is left in place (now unused by the app) and can be
--     dropped on live once verified.

CREATE OR REPLACE FUNCTION planner.safe_int(t text) RETURNS int
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT CASE WHEN t ~ '^-?[0-9]+(\.[0-9]+)?$' THEN round(t::numeric)::int ELSE 0 END;
$$;

CREATE OR REPLACE VIEW planner.v_product_inventory AS
SELECT p.sku,
       w.warehouse,
       planner.safe_int(w.raw) AS available
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
) AS w(warehouse, raw);
