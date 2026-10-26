# HORIZON deploy package v28.497 (26-Oct-26)

**AT A GLANCE:** Ben's branch `review-fixes-2026-10-05` at `ddc0e468` (v28.497). Live `/api/version` before: **v28.496** (production `main` = `7d3511bc`). Production port: PR #19, branch `port/v28.497`. Owner of production steps: Ben.

**STATUS 26-Oct-26:** PR #19 open, checks running.

## What changed
- BUY & MOVE ▸ Inventory: Cin7 Stocktake buttons removed from Manage 3PL (all markets) and US AWD; Manage FBA lost its one in v28.496. Unused helpers deleted. Client only.

## Port notes
- `scripts/port/sync-ben.cjs` 9d81cc3f → ddc0e468: clean. Checks: run-all, npm test, prebuild-race: all pass.

## Migration, env, routes
- No migration. No new env. **New cron / webhook routes: none.**

## Buy plan
No planning logic changed.

## Smoke checks after the deploy
1. `/api/version` = v28.497.
2. Manage 3PL (UK) and US AWD: no Cin7 stocktake button.

## Deploy record
- 26-Oct-26: PR #19 opened.
