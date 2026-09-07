-- ROLLBACK for the 08-Sep-26 purge of sweep-written zero overrides on discontinued SKUs (live, executed by Claude on
-- Ben's explicit authorisation, 08-Sep-26). 90,968 rows / 688 SKUs were deleted from planner.forecast_outputs after being
-- copied to planner.forecast_outputs_bak_20260908_disc_zero_purge. Live after purge: 88,851 rows (was 179,819),
-- 7,336 zero rows left, 207 script_fba_smooth rows untouched, TOWLB-COLLAB-LG-UNO uk_fba still 19 / 5 / 18.
-- Restores every deleted row; the unique key (sku, warehouse, channel, month) makes it safe to re-run.
INSERT INTO planner.forecast_outputs
SELECT * FROM planner.forecast_outputs_bak_20260908_disc_zero_purge
ON CONFLICT (sku, warehouse, channel, month) DO NOTHING;
-- expect 90,968 inserted (fewer if the team has since saved a forecast on one of those cells; those keep the newer value).
-- Keep the backup table until Ben says otherwise.
