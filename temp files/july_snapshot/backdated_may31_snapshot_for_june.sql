-- Back-dated forecast snapshot for LIVE so DEMAND ▸ Analysis ▸ Accuracy can score JUNE 2026.
-- Freezes the CURRENT forecast_outputs as a run dated 31-May-2026 (the lock heading into June).
-- buildLockedFc picks, per completed month, the most recent run BEFORE that month: this run scores June;
-- the separate 30-Jun run scores July. Run once on live (in addition to the 30-Jun snapshot). Do NOT run twice.
BEGIN;
WITH run AS (
  INSERT INTO planner.forecast_runs (engine_version, run_at, horizon_start, horizon_end, notes)
  SELECT 'sku-snapshot', TIMESTAMPTZ '2026-05-31 23:59:00+00', min(month), max(month),
         'Back-dated end-May 2026 lock (captures June forecast for accuracy)'
  FROM planner.forecast_outputs
  RETURNING id
)
INSERT INTO planner.forecasts (run_id, level, subcategory, country, channel, sku, warehouse, month, units, method, reason)
SELECT (SELECT id FROM run), 'sku',
       coalesce(NULLIF(p.subcategory,''),'Uncategorised'),
       upper(split_part(fo.warehouse,'_',1)),
       CASE WHEN upper(fo.channel)='FBA' THEN 'FBA' WHEN upper(fo.channel)='B2B' THEN 'B2B'
            WHEN upper(fo.channel)='ZAL' THEN 'ZAL' ELSE 'DTC' END,
       fo.sku, fo.warehouse, fo.month, sum(fo.units), 'snapshot', 'backfill end-May lock'
FROM planner.forecast_outputs fo
LEFT JOIN planner.products p ON p.sku = fo.sku
GROUP BY coalesce(NULLIF(p.subcategory,''),'Uncategorised'),
         upper(split_part(fo.warehouse,'_',1)),
         CASE WHEN upper(fo.channel)='FBA' THEN 'FBA' WHEN upper(fo.channel)='B2B' THEN 'B2B'
              WHEN upper(fo.channel)='ZAL' THEN 'ZAL' ELSE 'DTC' END,
         fo.sku, fo.warehouse, fo.month;
COMMIT;
