-- 342_app_health_instance_cron.sql  (v28.231, Ben): widen the App health log kind CHECK (migrations 328 / 329 / 331) with two kinds from
-- the 09-Oct-26 health review:
--   instance : 'instance thaw' (the Vercel instance resumed after a freeze; meta.max_gap_ms) and 'instance cold start' (meta.init_ms,
--              first_path). Every server row also carries meta.instance (no schema change).
--   cron_run : every scheduler hit (/api/cron/*, /api/data-cache/invalidate, /api/tracking/poll): count, max ms, status per route per hour.
-- Additive: only the kind CHECK is replaced (drop + recreate). Safe to re-run. Until it is applied the server stores these two kinds as
-- 'metric' rows with meta.kind set (it retries the batch that way on a CHECK violation), so deploying the code first loses nothing.
ALTER TABLE planner.app_health_events DROP CONSTRAINT IF EXISTS app_health_events_kind_check;
ALTER TABLE planner.app_health_events ADD CONSTRAINT app_health_events_kind_check CHECK (kind IN (
  'slow_request','server_error','client_error','console_error','slow_view',
  'long_task','api_failure','page_view','etl_stale','etl_flat','etl_drop','data_lag','integration_error','sanity','db_pool','slow_query','metric','red_alert',
  'dead_click','instance','cron_run'));
