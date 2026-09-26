-- 199_forecast_changes.sql — DEMAND plan "R" record-of-change audit log.
-- One row per forecast change (manual edit, smoothing, target-recommendation apply, do-not-smooth toggle).
-- Keyed like forecast_notes: level|item|country|channel|month. Shown as the "R" rail indicator (click to view,
-- descending by date). Recording is always-on (cheap insert); the plan only loads it when the toggle is enabled.
CREATE TABLE IF NOT EXISTS planner.forecast_changes (
  id          bigserial PRIMARY KEY,
  level       text NOT NULL,                    -- 'sku' | 'subcat'
  item        text NOT NULL,                    -- sku code or subcategory name
  country     text NOT NULL,
  channel     text NOT NULL,
  month       text NOT NULL,                    -- 'YYYY_MM'
  actor       text,                             -- who (email; shortened in the UI)
  action      text NOT NULL,                    -- 'changed' | 'smoothed' | 'applied target recommendation' | 'locked' | 'unlocked'
  from_val    numeric,
  to_val      numeric,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS forecast_changes_key_idx     ON planner.forecast_changes (upper(country), upper(channel), level, item, month);
CREATE INDEX IF NOT EXISTS forecast_changes_created_idx ON planner.forecast_changes (created_at DESC);
