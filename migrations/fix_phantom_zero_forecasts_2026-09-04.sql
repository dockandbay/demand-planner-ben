-- ONE-OFF DATA FIX (not a schema migration) — clear PHANTOM zero forecasts on new SET SKUs.
--
-- Root cause (fixed in code v27.437): buildSkuChanges persisted a dirty SKU×month whose computed value was null
-- as units=0. New sets dirtied by a subcat smoothing (before they had a share) got an all-zero forecast_outputs
-- baked in; that saved 0 then wins over the auto-forecast in skuMonthlyMap and permanently suppresses it.
--
-- This clears the 0-valued review_ui rows ONLY for in-scope SET SKUs with NO sales history whose review_ui rows
-- are ENTIRELY zero (so we never touch a set that has any real saved forecast). After this, those sets auto-forecast
-- from the subcategory Sets% pool again.
--
-- ⚠ BUY-AFFECTING: unblocks ~25 new sets on live (1,966 zero rows) → their components enter the buy. Diviyaj to run.

DELETE FROM planner.forecast_outputs f
WHERE f.source = 'review_ui' AND f.units = 0
  AND f.sku IN (
    SELECT p.sku FROM planner.products p
    WHERE p.variant_type = 'SET' AND p.in_planning_scope = true
      AND coalesce((SELECT sum(a.units) FROM planner.sales_actuals a WHERE a.sku = p.sku), 0) = 0
      AND NOT EXISTS (SELECT 1 FROM planner.forecast_outputs g WHERE g.sku = p.sku AND g.source = 'review_ui' AND g.units <> 0)
  );
