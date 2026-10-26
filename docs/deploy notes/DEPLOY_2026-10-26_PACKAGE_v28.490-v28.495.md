# HORIZON deploy package v28.490 → v28.495 (26-Oct-26)

**AT A GLANCE:** Ben's branch `review-fixes-2026-10-05` at `f99bdc13` (v28.495). Live `/api/version` before: **v28.489** (production `main` = `e0b013e4`). Production port: PR #17, branch `port/v28.495`, commit `26c28b2e` (author admin@dockandbay.com). Owner of production steps: Ben.

**STATUS 26-Oct-26: LIVE.** PR #17 merged by Ben (production `main` = `1b1f53ea`), CI runs 40302625512 (push) and 40302640572 (Run workflow) green, live `/api/version` = **v28.495**.

## What changed
- **v28.490** Health: a read that fails because the instance was just thawed is retried once; background work frozen by Vercel is counted, not logged as an error.
- **v28.491** Health: the false "n8n Flexport stale" alarm is retired (that flow is gone); slow first loads show a stage breakdown.
- **v28.492** BUY & MOVE ▸ Inventory ▸ Status Report: new "Sales orders (Fulfil)" column on backorder groups (SUG-0040). New POST `/api/inventory/backorder-orders` (read only, behind the login gate).
- **v28.493** File uploads up to 300 MB per file (staff app and supplier portal).
- **v28.494** POST `/api/cron/fba-report-import`: n8n posts the Amazon FBA inventory report (UK, US, AU) and HORIZON saves it like a manual Manage FBA upload. n8n flow `ZFmzekiXUrfa7Od7` built, switched OFF until tested on live.
- **v28.495** COGS: values more than 10% below supplier cost are raised to supplier cost (amber, "Raised to cost" filter). Nothing goes to Airtable until Email is pressed.

## Port notes
- `scripts/port/sync-ben.cjs` f7956094 → f99bdc13. One conflict in `server.mjs` (login gate block): production side kept; `/api/cron/fba-report-import` grafted INSIDE the secret-gated cron list (bracket rule respected).
- No new binary files in this range.
- benBase → `f99bdc13`. Checks: `scripts/checks/run-all.cjs` (login-gate: 20 cron paths proved), `npm test`, `tests/prebuild-race.cjs`: all pass.

## Migration, env, routes
- **No migration.**
- **No new env.** Set by Ben / Claude 26-Oct-26 before the deploy: Vercel Production `STORAGE_MAX_MB` = 300; Supabase bucket `horizon-uploads` file_size_limit = 300 MB (read back); Supabase project upload limit 300 MB (Ben, dashboard).
- **New cron / webhook routes: `/api/cron/fba-report-import`** (POST, x-webhook-secret, added to the secret-gated exemption in this port).

## Buy plan
No planning logic changed.

## Smoke checks after the deploy
1. `/api/version` = v28.495.
2. `POST /api/cron/fba-report-import` with no secret = 401.
3. Status Report backorder groups show the Sales orders column.
4. A file over 100 MB uploads (e.g. a product document).
5. Run the n8n flow once by hand; Manage FBA UK / US / AU show "n8n (Amazon SP-API ...)" as the importer.

## Deploy record
- 26-Oct-26: PR #17 opened, pre-deploy checks + regression tests green.
- 26-Oct-26: merged by Ben, production `main` = `1b1f53ea`. Live `/api/version` verified **v28.495**. Smoke: `POST /api/cron/fba-report-import` without a secret = 401 (gate holds).
