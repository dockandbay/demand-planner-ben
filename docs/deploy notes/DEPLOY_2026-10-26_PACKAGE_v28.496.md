# HORIZON deploy package v28.496 (26-Oct-26)

**AT A GLANCE:** Ben's branch `review-fixes-2026-10-05` at `9d81cc3f` (v28.496). Live `/api/version` before: **v28.495** (production `main` = `1b1f53ea`). Production port: PR #18, branch `port/v28.496`. Owner of production steps: Ben.

**STATUS 26-Oct-26: LIVE.** PR #18 merged by Ben (production `main` = `7d3511bc`), CI push run 40304166414 green, live `/api/version` = **v28.496**. n8n `ZFmzekiXUrfa7Od7` Active (Ben).

## What changed
- BUY & MOVE ▸ Inventory ▸ Manage FBA: UK, US and AU show "Imported daily from Amazon at 05:30 (UK time)" instead of the upload box (n8n flow `ZFmzekiXUrfa7Od7`, tested on live 26-Oct-26: UK 536, US 531, AU 430 SKUs). EU and CA keep the upload.
- Cin7 Stocktake button removed from Manage FBA (Manage 3PL unchanged).
- Fix: Amazon AU's single `inv-age-365-plus-days` column is counted in the 366-455 bucket, so AU stock over a year old no longer reads 0 on FBA Aged.

## Port notes
- `scripts/port/sync-ben.cjs` f99bdc13 → 9d81cc3f: clean, no conflicts. No binary files.
- Checks: `scripts/checks/run-all.cjs`, `npm test`, `tests/prebuild-race.cjs`: all pass.

## Migration, env, routes
- No migration. No new env. **New cron / webhook routes: none.**
- n8n `ZFmzekiXUrfa7Od7` must be switched to Active (Ben, n8n UI; auto mode blocks Claude).

## Buy plan
No planning logic changed.

## Smoke checks after the deploy
1. `/api/version` = v28.496.
2. Manage FBA US: no upload box, no Cin7 Stocktake button, "Imported daily from Amazon" badge. EU: upload box still there.
3. After the next n8n run, FBA Aged AU shows units over 365 days where Amazon reports them.

## Deploy record
- 26-Oct-26: PR #18 opened, checks green; merged by Ben, main `7d3511bc`, live verified v28.496.
