-- *** EXECUTED ON LIVE 08-Sep-26 by Claude on Ben's explicit authorisation ("You can proceed to make these changes to live"). ***
-- Result: backup 90,968 rows / 688 SKUs (FBA 31,193 · DTC 38,511 · B2B 21,264); deleted 90,968; live now 88,851 rows,
-- 7,336 zero rows remain (not candidates), 207 smoothing rows intact, remaining candidates 0. Rollback: rollbacks/ROLLBACK_2026-09-08_disc_zero_purge.sql
-- DIVIYAJ: do NOT run this again (the CREATE TABLE would fail on the existing backup table anyway).

-- Purge of sweep-written ZERO forecast overrides on discontinued SKUs (live). FOR DIVIYAJ, ONLY AFTER BEN'S EXPLICIT GO.
-- Background: until v27.554 the DEMAND Auto sweep (recalcDiscontinued) wrote units=0 overrides for every month after a
-- SKU's discontinue date. Under the run-off allocator (v27.534+) those zeros suppress the stock-driven run-off forecast
-- (the TOWLB-COLLAB-LG-UNO symptom) and, for seasonal SKUs, wipe the next season's demand. Removing them lets the
-- allocator compute run-off from stock again and restores seasonal demand.
-- Live sizing on 08-Sep-26 (read-only): 90,968 candidate rows / 688 SKUs (FBA 31,193 · DTC 38,511 · B2B 21,264),
-- all source 'review_ui', months 2026-09 to 2028-12. 7,336 other zero rows are NOT touched (not disc, or before disc).
-- Sandbox rehearsal (6,709 rows / 270 SKUs, stale copy): buy plan UK +10,060 units, US +3,250, EU/AU/CA unchanged,
-- concentrated in TOWLB-SUM seasonal SKUs whose next-season demand the zeros had killed. Expect a larger move on live.
-- Rule: only rows with units=0, on a SKU with a discontinue date for that warehouse's country, month strictly after that
-- date, and not the 07-Sep FBA smoothing script rows. Backup first; counts must match; rollback below.

BEGIN;

CREATE TABLE planner.forecast_outputs_bak_20260908_disc_zero_purge AS
WITH disc AS (
  SELECT sku, 'uk' co, nullif(trim(discontinue_date_final),'') d FROM planner.products
  UNION ALL SELECT sku, 'us', nullif(trim(discontinue_date_final),'') FROM planner.products
  UNION ALL SELECT sku, 'eu', nullif(trim(discontinue_date_final),'') FROM planner.products
  UNION ALL SELECT sku, 'au', nullif(trim(discontinue_date_au_final),'') FROM planner.products
  UNION ALL SELECT sku, 'ca', nullif(trim(discontinue_date_ca),'') FROM planner.products
), dd AS (
  SELECT sku, co, CASE WHEN d ~ '^\d{4}-\d{2}-\d{2}' THEN d::date END dt FROM disc WHERE d IS NOT NULL
)
SELECT f.*
FROM planner.forecast_outputs f
JOIN dd ON dd.sku = f.sku AND dd.co = split_part(f.warehouse, '_', 1)
WHERE f.units = 0 AND dd.dt IS NOT NULL AND f.month > dd.dt
  AND coalesce(f.source, '') <> 'script_fba_smooth_2026-09-07';

-- expect ~90,968 (re-check before running; the count moves as the team edits forecasts)
SELECT count(*) AS backed_up FROM planner.forecast_outputs_bak_20260908_disc_zero_purge;

DELETE FROM planner.forecast_outputs f
USING planner.forecast_outputs_bak_20260908_disc_zero_purge k
WHERE k.sku = f.sku AND k.warehouse = f.warehouse AND k.channel = f.channel AND k.month = f.month;
-- the DELETE row count must equal backed_up; if not, ROLLBACK.

COMMIT;

-- Verify: zero remaining candidates
-- (re-run the SELECT count(*) from the CTE above against planner.forecast_outputs; expect 0)

-- ROLLBACK (any time; unique key (sku, warehouse, channel, month) protects against duplicates):
-- INSERT INTO planner.forecast_outputs SELECT * FROM planner.forecast_outputs_bak_20260908_disc_zero_purge
--   ON CONFLICT (sku, warehouse, channel, month) DO NOTHING;
-- Keep the backup table until Ben says otherwise.
