-- 122: Weather cache in Supabase (moved off Airtable). One row per city; forecast_json/history_json hold the
-- Open-Meteo payloads the DEMAND ▸ Actions ▸ Weather panel renders. Populated by the weather refresh job
-- (was a Google Apps Script → Airtable weather_cache; must be repointed to write here — see Diviyaj note).
CREATE TABLE IF NOT EXISTS planner.weather_cache (
  city          text PRIMARY KEY,
  country       text,
  lat           numeric,
  lng           numeric,
  forecast_json jsonb,   -- array of {date,tmax,tmin,precip,wc}
  history_json  jsonb,   -- object keyed YYYY_MM → monthly aggregate
  last_fetched  timestamptz,
  updated_at    timestamptz DEFAULT now()
);
