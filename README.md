# Dock & Bay — Demand Planner (rehost)

Ben's v16.7 forecasting artefact, rehosted on owned infrastructure: the same single-file
HTML tool, served by a small Express app that injects **live data from Supabase** at request
time (replacing the baked-in JSON + manual upload), and saves forecast edits back to Supabase.

- **Live:** https://dock-bay-demand-planner.vercel.app (access-key gated)
- **Stack:** Express (`server.mjs`) → Vercel serverless (`api/index.mjs`) · Postgres/Supabase `planner` schema
- **Reads:** DATA, FC_CURRENT, FC_OUTPUTS, _SKU_RAW, CATS_META, SUBS_META, BI_RULES, PROD_CONST — all injected live
- **Writes:** `/api/save-forecasts` (subcategory) + `/api/save-sku-forecasts` (SKU) → `planner.forecast_inputs` / `forecast_outputs`

## Run locally
```
npm install
# .env needs DATABASE_URL (Supabase). No PLANNER_KEY locally = open (gate only fires in prod).
node server.mjs   # http://localhost:8124
```

## Deploy
`vercel deploy --prod` — env: `DATABASE_URL`, `PLANNER_KEY` (production). On Vercel the app uses
Supabase's transaction pooler (6543); locally the session pooler (5432).

## Notes
- `artifact_v16.7.html` is Ben's built artefact (the UI/engine) — we inject data into it, not edit it.
- AI features (the in-artefact Claude calls) require an Anthropic API key wired via a server-side proxy (todo).
