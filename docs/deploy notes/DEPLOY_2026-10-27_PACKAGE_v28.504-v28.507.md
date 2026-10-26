# HORIZON deploy package v28.504 to v28.507 (27-Oct-26)

**AT A GLANCE:** Ben's branch `review-fixes-2026-10-05` at `aacf507d` (`aacf507d1b88e72f755849fa265a062229939024`, v28.507). Live `/api/version` before: **v28.503** (production `main` = `d31f646c`). Production port: PR #23, branch `port/v28.507` (`83fad86a`). Owner of production steps: Ben.

**STATUS 27-Oct-26: PR OPEN.** Waiting for Ben to run migration 392, then merge.

## What changed
- v28.504 Supplier portal: Custom orders tab (Customiser batches, proxied server to server; HORIZON stores nothing). Hidden until CUSTOMISER_API_URL / CUSTOMISER_API_KEY are set.
- v28.505 Client portal: SKU list images follow parent and size SKUs (needs Image Bank's images endpoint to show anything).
- v28.506 Client portal: notice board at the top of Home; CLIENT ▸ Notices (audience per notice, optional email, one per portal user).
- v28.507 Notices: link chosen from a list of portal pages.

## Port notes
- `scripts/port/sync-ben.cjs` 5137bf82 → aacf507d: clean. No new binary files. New `supply/portal-custom.js` is covered by includeFiles `supply/**`. Checks: run-all, npm test, prebuild-race all pass.

## Migration, env, routes
- **392_client_notices.sql** (additive): planner.client_notices, planner.client_notice_reads; no anon grants. Run FIRST, then merge.
- Optional env (only once the Customiser is hosted): CUSTOMISER_API_URL, CUSTOMISER_API_KEY.
- **New cron / webhook routes: none.** New routes: portal session GET /api/cp/notices, POST /api/cp/notices/read; CLIENT grant GET / POST /api/client/notices, POST /api/client/notices/:id/email | archive | delete; supplier portal /api/portal/custom/*; staff /api/supply/custom-portal/:supplier/*; asset /portal-custom.js.

## Buy plan
No planning logic changed.

## Smoke checks after the deploy
1. `/api/version` = v28.507.
2. CLIENT ▸ Notices loads (empty list); New notice shows the reach count.
3. Portal preview as a client: no strip when there are no notices; post one to a test client, the strip shows, then delete it.
4. Supplier portal: no Custom orders tab (env not set).

## Deploy record
- 27-Oct-26: PR #23 opened, migration 392 SQL handed to Ben.
