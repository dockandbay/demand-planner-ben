# HORIZON deploy package v28.503 (26-Oct-26)

**AT A GLANCE:** Ben's branch `review-fixes-2026-10-05` at `5137bf82` (v28.503). Live `/api/version` before: **v28.502** (production `main` = `1a3e5bc3`). Production port: PR #22, branch `port/v28.503`. Owner of production steps: Ben.

**STATUS 26-Oct-26:** PR #22 open. Migration 391 to be applied by Ben BEFORE the merge (this time: migration first, then merge).

## What changed
- Client portal Catalogue (Madison / Ben): "☰ SKU list" on the line sheet and on Images. Paste or upload SKUs / style codes, or load a saved list; the line sheet shows just those (list order, not-found codes, "hidden by the filters: show them"); PDF / XLSX export them. Saved lists per client account (any number, named).
- Line sheet RRP (market retail, market currency) and Your price (client tier / price list): table, cards, XLSX, PDF.
- Images for a SKU list across every gallery the client may see, via Image Bank `GET /api/v1/portal/products/images` (being built by the Image Bank thread); until then "coming soon".

## Port notes
- `scripts/port/sync-ben.cjs` 33195fcf → 5137bf82: clean. Checks: run-all, npm test, prebuild-race: all pass.

## Migration, env, routes
- **391_client_sku_lists.sql** (additive): planner.client_sku_lists (client_id FK, name, skus text[]; unique per client + lower(name)); no anon grants.
- No new env. **New cron / webhook routes: none.** New portal routes (client session): GET / POST `/api/cp/sku-lists`, POST `/api/cp/sku-lists/:id/delete`, GET `/api/cp/catalogue/images`.

## Buy plan
No planning logic changed.

## Smoke checks after the deploy
1. `/api/version` = v28.503.
2. Portal (preview as a client) ▸ Catalogue: SKU list button; paste 2 SKUs → only those; RRP column filled.
3. Save a list, reload, load it again; delete it.
4. Images: with a list active, "coming soon" until Image Bank ships its endpoint.

## Deploy record
- 26-Oct-26: PR #22 opened, migration 391 SQL handed to Ben.
