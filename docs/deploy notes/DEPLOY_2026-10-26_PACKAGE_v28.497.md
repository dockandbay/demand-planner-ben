# HORIZON deploy package v28.497 → v28.502 (26-Oct-26)

**AT A GLANCE:** Ben's branch `review-fixes-2026-10-05` at `33195fcf` (v28.502). Live `/api/version` before: **v28.496** (production `main` = `7d3511bc`). Production port: PR #20, branch `port/v28.500` (PR #19, v28.497 only, closed as superseded). Owner of production steps: Ben.

**STATUS 26-Oct-26:** PR #20 open (now v28.497-v28.502). Migrations 389 + 390 to be applied by Ben BEFORE the merge.

## What changed
- **v28.497** Cin7 Stocktake buttons removed from Manage 3PL and US AWD (Manage FBA in v28.496).
- **v28.498** BUY & MOVE ▸ FBA ▸ Create FBA Shipment: 5-step modal (Review → Draft in Amazon → Placement → Transport → Labels) using Amazon's Fulfillment Inbound API 2024-03-20 through the n8n proxy `UNFJuF5ekAa4deQo` (Active since 26-Oct-26; read test OK, wrong secret 401, other paths 403). Step 2 = jump-out to Seller Central. UK, US, EU (Amazon.de) and AU. Ship-from addresses in planner.fba_ship_from (3PL default per market + others, e.g. Flexport China).
- **v28.499** Trial disclaimer before the process; writes need SUPPLY edit (not admin only).
- **v28.500** FBA Transfer Upload / AWD upload / Create FBA Shipment show only when rows are ticked.
- **v28.501** ACCOUNTS: Uncoded statement lines upload keeps repeated identical lines (numbered "(2)") instead of failing with "ON CONFLICT DO UPDATE command cannot affect row a second time" (Rita, 26-Oct file).
- **v28.502** CLIENT: owner mailbox per client (sales-uk@ / sales-us@ / sales-eu@ / keyaccounts@; AU, CA, key accounts → keyaccounts@); all staff emails about a client go there only.

## Port notes
- `scripts/port/sync-ben.cjs` 9d81cc3f → 2be8f6af, clean. `docs/deploy notes/COMMISSION_SETUP_LIVE_2026-10-14.sql` (committed by mistake in Ben's repo, agent rates) removed from the port and untracked upstream (ff4a0e21); benBase → `ff4a0e21`.
- Checks: run-all, npm test, prebuild-race: all pass.

## Migration, env, routes
- **390_client_owner_mailbox.sql** (backfill): sets owner_email on every client whose owner is not one of the four mailboxes (live: 18 active agents).
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
5. Rita re-uploads the 26-Oct Uncoded statement lines CSV: accepted.
6. CLIENT ▸ Clients ▸ a client: Owner mailbox dropdown shows the backfilled mailbox.

## Deploy record
- 26-Oct-26: PR #20 opened; v28.501 and v28.502 added to it, checks re-run.
