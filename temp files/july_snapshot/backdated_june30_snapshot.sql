-- Back-dated forecast snapshot for LIVE so DEMAND ▸ Analysis ▸ Accuracy can score JULY 2026.
-- The accuracy report reads planner.forecast_runs + planner.forecasts (the "Take forecast snapshot" store),
-- picking, for each completed month, the most recent run taken BEFORE that month started. Live has no run
-- before July, so July is unscored. This freezes the CURRENT forecast_outputs as a run dated 30-Jun-2026
-- (captures July + forward). Run once on live. Safe/idempotent-ish: creates ONE new run each time it's run,
-- so DO NOT run twice (or delete the extra run afterward).
BEGIN;
WITH run AS (
  INSERT INTO planner.forecast_runs (engine_version, run_at, horizon_start, horizon_end, notes)
  SELECT 'sku-snapshot', TIMESTAMPTZ '2026-06-30 23:59:00+00', min(month), max(month),
         'Back-dated end-June 2026 lock (captures July forecast for accuracy)'
  FROM planner.forecast_outputs
  RETURNING id
)
INSERT INTO planner.forecasts (run_id, level, subcategory, country, channel, sku, warehouse, month, units, method, reason)
SELECT (SELECT id FROM run), 'sku',
       coalesce(NULLIF(p.subcategory,''),'Uncategorised'),
       upper(split_part(fo.warehouse,'_',1)),
       CASE WHEN upper(fo.channel)='FBA' THEN 'FBA' WHEN upper(fo.channel)='B2B' THEN 'B2B'
            WHEN upper(fo.channel)='ZAL' THEN 'ZAL' ELSE 'DTC' END,
       fo.sku, fo.warehouse, fo.month, sum(fo.units), 'snapshot', 'backfill end-June lock'
FROM planner.forecast_outputs fo
LEFT JOIN planner.products p ON p.sku = fo.sku
GROUP BY coalesce(NULLIF(p.subcategory,''),'Uncategorised'),
         upper(split_part(fo.warehouse,'_',1)),
         CASE WHEN upper(fo.channel)='FBA' THEN 'FBA' WHEN upper(fo.channel)='B2B' THEN 'B2B'
              WHEN upper(fo.channel)='ZAL' THEN 'ZAL' ELSE 'DTC' END,
         fo.sku, fo.warehouse, fo.month;
COMMIT;
-- After running, DEMAND ▸ Analysis ▸ Accuracy will score July once the data cache refreshes.
