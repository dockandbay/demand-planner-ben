-- 331_app_health_dead_click.sql  (v28.179, Ben): widen the App health log kind CHECK (migrations 328 / 329) with dead_click:
-- a press on a nav item (left rail, view toggles, L2 / L3 tabs) after which neither the route nor the active nav item changed and
-- no loading panel appeared within 1.5 s. Aggregated in the browser (count per view + label), like long_task.
-- Additive: only the kind CHECK is replaced (drop + recreate). Safe to re-run. Until it is applied the server drops dead_click
-- rows (it retries the batch without them on a CHECK violation), so deploying the code first loses nothing else.
ALTER TABLE planner.app_health_events DROP CONSTRAINT IF EXISTS app_health_events_kind_check;
ALTER TABLE planner.app_health_events ADD CONSTRAINT app_health_events_kind_check CHECK (kind IN (
  'slow_request','server_error','client_error','console_error','slow_view',
  'long_task','api_failure','page_view','etl_stale','etl_flat','etl_drop','data_lag','integration_error','sanity','db_pool','slow_query','metric','red_alert',
  'dead_click'));
