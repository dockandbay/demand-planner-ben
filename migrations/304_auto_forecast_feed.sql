-- 304_auto_forecast_feed.sql  (v28.002, Ben, 26-Sep-2026) — persisted BUY-PLAN FEED snapshots for the Auto Forecast engine.
-- The buy plan only exists in the browser (artifact BP engine). The Auto Forecast "Buy plan" engine phases the browser's
-- per-subcategory × market × arrival-month buys into cash. To let a server-side export (Google Sheets, v28.001) produce
-- the SAME numbers as the screen, the browser posts its feed here whenever it builds one (Auto Forecast report open,
-- and hourly while any HORIZON tab is open). The export phases the newest snapshot with the live prices / terms / leads.
-- Idempotent, additive. Snapshots are pruned to the newest 30 by the writer.
CREATE TABLE IF NOT EXISTS planner.auto_forecast_feed (
  id           bigserial PRIMARY KEY,
  computed_at  timestamptz NOT NULL DEFAULT now(),
  computed_by  text,                        -- user email (auth proxy) or null on the sandbox
  app_version  text,                        -- client build that produced it
  row_count    integer NOT NULL DEFAULT 0,
  units_total  bigint  NOT NULL DEFAULT 0,
  rows         jsonb   NOT NULL DEFAULT '[]'::jsonb   -- [{subcat, mkt, m:'YYYY-MM', units}]
);
CREATE INDEX IF NOT EXISTS auto_forecast_feed_at_idx ON planner.auto_forecast_feed (computed_at DESC);
