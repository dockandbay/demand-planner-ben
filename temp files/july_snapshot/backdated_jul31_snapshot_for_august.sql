-- Back-dated forecast snapshot for LIVE so DEMAND ▸ Analysis ▸ Accuracy can score AUGUST 2026.
-- Freezes the CURRENT forecast_outputs as a run dated 31-Jul-2026 (the lock heading into August).
-- NOTE: August is the current in-progress month — accuracy for it will only appear once August COMPLETES
-- (early September). This just puts the locked baseline in place now. Run once on live. Do NOT run twice.
BEGIN;
WITH run AS (
  INSERT INTO planner.forecast_runs (engine_version, run_at, horizon_start, horizon_end, notes)
  SELECT 'sku-snapshot', TIMESTAMPTZ '2026-07-31 23:59:00+00', min(month), max(month),
         'Back-dated end-July 2026 lock (captures August forecast for accuracy)'
  FROM planner.forecast_outputs
  RETURNING id
)
INSERT INTO planner.forecasts (run_id, level, subcategory, country, channel, sku, warehouse, month, units, method, reason)
SELECT (SELECT id FROM run), 'sku',
       coalesce(NULLIF(p.subcategory,''),'Uncategorised'),
       upper(split_part(fo.warehouse,'_',1)),
       CASE WHEN upper(fo.channel)='FBA' THEN 'FBA' WHEN upper(fo.channel)='B2B' THEN 'B2B'
            WHEN upper(fo.channel)='ZAL' THEN 'ZAL' ELSE 'DTC' END,
       fo.sku, fo.warehouse, fo.month, sum(fo.units), 'snapshot', 'backfill end-July lock'
FROM planner.forecast_outputs fo
LEFT JOIN planner.products p ON p.sku = fo.sku
GROUP BY coalesce(NULLIF(p.subcategory,''),'Uncategorised'),
         upper(split_part(fo.warehouse,'_',1)),
         CASE WHEN upper(fo.channel)='FBA' THEN 'FBA' WHEN upper(fo.channel)='B2B' THEN 'B2B'
              WHEN upper(fo.channel)='ZAL' THEN 'ZAL' ELSE 'DTC' END,
         fo.sku, fo.warehouse, fo.month;
COMMIT;
