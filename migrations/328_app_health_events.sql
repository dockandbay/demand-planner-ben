-- 328_app_health_events.sql  (v28.159, Ben): persistent health log behind CONFIG ▸ Admin ▸ Health log + the weekly health email.
-- Server rows: slow requests (>= HZ_SLOW_MS) and every 5xx, aggregated in memory per (kind, method, path, status) and flushed in
-- ONE multi-row INSERT (count = occurrences in that flush window, ms = the max seen). Browser rows: window.onerror,
-- unhandledrejection, console.error and slow view loads (> 3s) from the staff shell and both portals (POST /api/health/client-events).
-- Retention: rows older than 60 days are purged by POST /api/cron/health-weekly. Additive only (new table). Safe to re-run.
CREATE TABLE IF NOT EXISTS planner.app_health_events (
  id          bigserial PRIMARY KEY,
  ts          timestamptz NOT NULL DEFAULT now(),
  kind        text NOT NULL CHECK (kind IN ('slow_request','server_error','client_error','console_error','slow_view')),
  source      text NOT NULL DEFAULT 'server' CHECK (source IN ('server','staff','portal','client_portal')),
  path        text,              -- API path (server) or view hash (browser)
  method      text,
  status      int,
  ms          int,               -- request duration (max within the flush window) or view load time
  message     text,
  stack       text,
  user_email  text,
  app_version text,
  user_agent  text,
  count       int NOT NULL DEFAULT 1,
  meta        jsonb
);
CREATE INDEX IF NOT EXISTS app_health_events_ts_idx ON planner.app_health_events (ts);
CREATE INDEX IF NOT EXISTS app_health_events_kind_ts_idx ON planner.app_health_events (kind, ts);
