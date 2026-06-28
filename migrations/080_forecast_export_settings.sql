-- 080: per-country forecast-export settings — the email address each country's forecast CSV is sent to
-- (used by the "email forecast" / "email all countries" feature). DriveHQ FTP creds live in env, not here.

CREATE TABLE IF NOT EXISTS planner.forecast_export_settings (
  country     text PRIMARY KEY,
  email       text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- seed the known markets (emails filled in via the UI)
INSERT INTO planner.forecast_export_settings (country) VALUES ('UK'),('US'),('EU'),('AU'),('CA')
  ON CONFLICT (country) DO NOTHING;
