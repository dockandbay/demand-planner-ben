-- 329_app_health_kinds.sql  (v28.163, Ben): widen the App health log (migration 328) to the new capture types.
-- Browser: long_task (main-thread freezes >= 1s), api_failure (client-observed 5xx / 408 / 429 / network error / > 10s),
-- page_view (visits + active seconds per view). Server: etl_stale / etl_flat / etl_drop / data_lag (data freshness, from
-- runHealthChecks), integration_error (Fulfil / Xero / Flexport / DHL / BLADE / Anthropic / Resend / KV via _fetchT), sanity
-- (business sanity checks, server + browser), db_pool (pool waits, connect / query timeouts), slow_query (>= 2s, SQL text
-- with literals stripped), metric (daily snapshots for week-on-week compares) and red_alert (immediate alert emails; a
-- throttled alert is stored with meta.pending_alert = true and goes out with the next allowed health email).
-- Additive: only the kind CHECK is replaced (drop + recreate), plus one index. Safe to re-run.
ALTER TABLE planner.app_health_events DROP CONSTRAINT IF EXISTS app_health_events_kind_check;
ALTER TABLE planner.app_health_events ADD CONSTRAINT app_health_events_kind_check CHECK (kind IN (
  'slow_request','server_error','client_error','console_error','slow_view',
  'long_task','api_failure','page_view','etl_stale','etl_flat','etl_drop','data_lag','integration_error','sanity','db_pool','slow_query','metric','red_alert'));
-- "New since last deploy" groups errors by app_version (first-ever occurrence per message).
CREATE INDEX IF NOT EXISTS app_health_events_kind_ver_idx ON planner.app_health_events (kind, app_version);
-- Dedupe lookups (same kind + path within 24h) from runHealthChecks and red alerts.
CREATE INDEX IF NOT EXISTS app_health_events_kind_path_ts_idx ON planner.app_health_events (kind, path, ts);
