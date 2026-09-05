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

## Preorders / key-account forecasts — now Supabase-fed (v25.657)
The DEMAND buy plan now reads **preorders** and **key-account orders** from Supabase via the new
`GET /api/preorders-ka` (tables `planner.preorders` + `planner.key_account_forecasts`). The client-side
Airtable-MCP refresh (`mcpListRecords` + `PKA_TABLES`) was **removed** — so **all Airtable MCP is now gone
from the app** (weather + preorders + key accounts).

- The two tables already held the current Airtable data (loaded 2026-06-10 from the same source; count-matched
  119 preorders / 66 key-account rows). `loaded_at` refreshed to now in sandbox.
- **Action for Diviyaj:** enact the **Airtable → Supabase n8n flow** for these two tables so they stay current
  going forward (it hadn't run since 2026-06-10). Source: base `appT5GoPc8M3iEDdh`,
  preorder table `tblxucncnqkzOBpPQ` → `planner.preorders (reference,sku,warehouse,ship_date,quantity)`;
  key-account table `tblwVIyFEfRGxf4RK` → `planner.key_account_forecasts (client,sku,warehouse,ship_date,quantity)`.
  Field maps: preorder ref=`fldxBU4CAkykNPucG` sku=`fldJRniVfgUhaYSNX` wh=`fldwuaxMcBzOEsWK6` date=`fld1ALUE3nWkPduFt`
  qty=`fldVn7Z0HCuJwgV48`; ka client=`fldsojBjYt62TiiKW` sku=`fldFMZIrBeSym6tMJ` wh=`fldIQSP7DekMKS4rI`
  date=`fldCnj645uhMASM9i` qty=`fldGOy9IJLO0mIRMN`.
