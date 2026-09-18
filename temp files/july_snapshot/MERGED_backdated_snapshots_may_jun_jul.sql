-- Back-dated forecast snapshots for LIVE — enables DEMAND ▸ Analysis ▸ Accuracy for JUNE, JULY (and AUGUST once it completes).
-- Creates three runs from the CURRENT forecast_outputs, each dated the end of the prior month:
--   31-May-2026 -> scores June   |   30-Jun-2026 -> scores July   |   31-Jul-2026 -> scores August (after Aug completes)
-- Run ONCE on live. If you already ran any of the individual scripts, do NOT also run this (avoid duplicate runs).
BEGIN;

-- end-May lock (June): run dated 2026-05-31
WITH run AS (
  INSERT INTO planner.forecast_runs (engine_version, run_at, horizon_start, horizon_end, notes)
  SELECT 'sku-snapshot', TIMESTAMPTZ '2026-05-31 23:59:00+00', min(month), max(month), 'Back-dated end-May lock (June)'
  FROM planner.forecast_outputs RETURNING id)
INSERT INTO planner.forecasts (run_id, level, subcategory, country, channel, sku, warehouse, month, units, method, reason)
SELECT (SELECT id FROM run), 'sku', coalesce(NULLIF(p.subcategory,''),'Uncategorised'),
       upper(split_part(fo.warehouse,'_',1)),
       CASE WHEN upper(fo.channel)='FBA' THEN 'FBA' WHEN upper(fo.channel)='B2B' THEN 'B2B' WHEN upper(fo.channel)='ZAL' THEN 'ZAL' ELSE 'DTC' END,
       fo.sku, fo.warehouse, fo.month, sum(fo.units), 'snapshot', 'backfill'
FROM planner.forecast_outputs fo LEFT JOIN planner.products p ON p.sku = fo.sku
GROUP BY coalesce(NULLIF(p.subcategory,''),'Uncategorised'), upper(split_part(fo.warehouse,'_',1)),
         CASE WHEN upper(fo.channel)='FBA' THEN 'FBA' WHEN upper(fo.channel)='B2B' THEN 'B2B' WHEN upper(fo.channel)='ZAL' THEN 'ZAL' ELSE 'DTC' END,
         fo.sku, fo.warehouse, fo.month;

-- end-June lock (July): run dated 2026-06-30
WITH run AS (
  INSERT INTO planner.forecast_runs (engine_version, run_at, horizon_start, horizon_end, notes)
  SELECT 'sku-snapshot', TIMESTAMPTZ '2026-06-30 23:59:00+00', min(month), max(month), 'Back-dated end-June lock (July)'
  FROM planner.forecast_outputs RETURNING id)
INSERT INTO planner.forecasts (run_id, level, subcategory, country, channel, sku, warehouse, month, units, method, reason)
SELECT (SELECT id FROM run), 'sku', coalesce(NULLIF(p.subcategory,''),'Uncategorised'),
       upper(split_part(fo.warehouse,'_',1)),
       CASE WHEN upper(fo.channel)='FBA' THEN 'FBA' WHEN upper(fo.channel)='B2B' THEN 'B2B' WHEN upper(fo.channel)='ZAL' THEN 'ZAL' ELSE 'DTC' END,
       fo.sku, fo.warehouse, fo.month, sum(fo.units), 'snapshot', 'backfill'
FROM planner.forecast_outputs fo LEFT JOIN planner.products p ON p.sku = fo.sku
GROUP BY coalesce(NULLIF(p.subcategory,''),'Uncategorised'), upper(split_part(fo.warehouse,'_',1)),
         CASE WHEN upper(fo.channel)='FBA' THEN 'FBA' WHEN upper(fo.channel)='B2B' THEN 'B2B' WHEN upper(fo.channel)='ZAL' THEN 'ZAL' ELSE 'DTC' END,
         fo.sku, fo.warehouse, fo.month;

-- end-July lock (August): run dated 2026-07-31
WITH run AS (
  INSERT INTO planner.forecast_runs (engine_version, run_at, horizon_start, horizon_end, notes)
  SELECT 'sku-snapshot', TIMESTAMPTZ '2026-07-31 23:59:00+00', min(month), max(month), 'Back-dated end-July lock (August)'
  FROM planner.forecast_outputs RETURNING id)
INSERT INTO planner.forecasts (run_id, level, subcategory, country, channel, sku, warehouse, month, units, method, reason)
SELECT (SELECT id FROM run), 'sku', coalesce(NULLIF(p.subcategory,''),'Uncategorised'),
       upper(split_part(fo.warehouse,'_',1)),
       CASE WHEN upper(fo.channel)='FBA' THEN 'FBA' WHEN upper(fo.channel)='B2B' THEN 'B2B' WHEN upper(fo.channel)='ZAL' THEN 'ZAL' ELSE 'DTC' END,
       fo.sku, fo.warehouse, fo.month, sum(fo.units), 'snapshot', 'backfill'
FROM planner.forecast_outputs fo LEFT JOIN planner.products p ON p.sku = fo.sku
GROUP BY coalesce(NULLIF(p.subcategory,''),'Uncategorised'), upper(split_part(fo.warehouse,'_',1)),
         CASE WHEN upper(fo.channel)='FBA' THEN 'FBA' WHEN upper(fo.channel)='B2B' THEN 'B2B' WHEN upper(fo.channel)='ZAL' THEN 'ZAL' ELSE 'DTC' END,
         fo.sku, fo.warehouse, fo.month;

COMMIT;
