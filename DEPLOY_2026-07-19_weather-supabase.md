# Deploy note — Weather off Airtable → Supabase (+ preorder/key-account confirm)

## What changed (v25.656)
- **New table**: `planner.weather_cache` — migration `migrations/122_weather_cache.sql`. **Run on live.**
  Columns: `city (PK), country, lat, lng, forecast_json jsonb, history_json jsonb, last_fetched, updated_at`.
- **New endpoint**: `GET /api/weather` → `{ cities: [...] }` from that table (server.mjs).
- **Client** (`artifact_v16.7.html`): the DEMAND ▸ Actions ▸ Weather panel now reads `/api/weather`
  instead of calling Airtable via the Anthropic MCP. `fetchWeatherCacheViaMCP()` was rewired (name kept)
  and the Airtable-MCP call was removed.

## ⚠️ Action required for weather to work on live
The weather cache is refreshed every ~12h by a **Google Apps Script (`fetchWeatherCache.gs`)** that pulls
Open-Meteo and writes the **Airtable** `weather_cache` table (base `appT5GoPc8M3iEDdh`, table `tblkKbSyt42bUxIs0`).
**That job must be repointed to write `planner.weather_cache` in Supabase instead** (via n8n, or update the GAS
to upsert Supabase). Field mapping is 1:1 (city/country/lat/lng/forecast_json/history_json/last_fetched).
Until it runs against Supabase, the panel will show "No weather data cached yet."

- The 14 cities are: London, Manchester, Paris, Marseille, Berlin, Munich, New York, Los Angeles, Chicago,
  Houston, Miami, Sydney, Melbourne, Brisbane.
- Sandbox currently has a single seeded London row (smoke test); the pipeline populates the full set on first run.
- `forecast_json` = array of `{date,tmax,tmin,precip,wc}`; `history_json` = object keyed `YYYY_MM` →
  `{warmDays,hotDays,wetDays,heatWaves,totalPrecip,avgTmax}`.

## Please confirm (preorders / key-account forecasts)
The DEMAND app still refreshes **preorders** and **key-account orders** client-side via Airtable MCP
(`mcpListRecords`). Ben believes these already live in Supabase (`planner.preorders`,
`planner.key_account_forecasts`) and are n8n-fed. **Please confirm n8n keeps those tables current.** Once
confirmed, we'll drop the client Airtable-MCP refresh too (left in place for now to avoid data loss).
