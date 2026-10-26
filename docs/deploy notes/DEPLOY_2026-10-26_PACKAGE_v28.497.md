# HORIZON deploy package v28.497 → v28.500 (26-Oct-26)

**AT A GLANCE:** Ben's branch `review-fixes-2026-10-05` at `ff4a0e21` (v28.500). Live `/api/version` before: **v28.496** (production `main` = `7d3511bc`). Production port: PR #20, branch `port/v28.500` (PR #19, v28.497 only, closed as superseded). Owner of production steps: Ben.

**STATUS 26-Oct-26:** PR #20 open. Migration 389 to be applied by Ben BEFORE the merge.

## What changed
- **v28.497** Cin7 Stocktake buttons removed from Manage 3PL and US AWD (Manage FBA in v28.496).
- **v28.498** BUY & MOVE ▸ FBA ▸ Create FBA Shipment: 5-step modal (Review → Draft in Amazon → Placement → Transport → Labels) using Amazon's Fulfillment Inbound API 2024-03-20 through the n8n proxy `UNFJuF5ekAa4deQo` (Active since 26-Oct-26; read test OK, wrong secret 401, other paths 403). Step 2 = jump-out to Seller Central. UK, US, EU (Amazon.de) and AU. Ship-from addresses in planner.fba_ship_from (3PL default per market + others, e.g. Flexport China).
- **v28.499** Trial disclaimer before the process; writes need SUPPLY edit (not admin only).
- **v28.500** FBA Transfer Upload / AWD upload / Create FBA Shipment show only when rows are ticked.

## Port notes
- `scripts/port/sync-ben.cjs` 9d81cc3f → 2be8f6af, clean. `docs/deploy notes/COMMISSION_SETUP_LIVE_2026-10-14.sql` (committed by mistake in Ben's repo, agent rates) removed from the port and untracked upstream (ff4a0e21); benBase → `ff4a0e21`.
- Checks: run-all, npm test, prebuild-race: all pass.

## Migration, env, routes
- **389_fba_inbound.sql** (additive): planner.fba_ship_from (4 seeded 3PL addresses, phones blank) + planner.fba_inbound_plans. Ben runs it in the Supabase SQL editor; Claude reads it back.
- No new env (optional `N8N_SPAPI_INBOUND_URL`, defaults to the n8n webhook). Uses existing `N8N_WEBHOOK_SECRET`.
- **New cron / webhook routes: none.** New routes behind the login gate: GET/POST `/api/supply/fba-inbound/ship-from`, GET/POST `/api/supply/fba-inbound/plans`, GET `/api/supply/fba-inbound/plans/:id`, POST `/api/supply/fba-inbound/plans/:id/advance`.

## Buy plan
No planning logic changed.

## Smoke checks after the deploy
1. `/api/version` = v28.500.
2. FBA tab: no upload / create buttons until a row is ticked.
3. Create FBA Shipment opens the Trial warning, then Review with the ILG address (phone still blank, so Create is disabled until it is added).
4. Manage 3PL / US AWD: no Cin7 stocktake button.

## Deploy record
- 26-Oct-26: PR #20 opened.
