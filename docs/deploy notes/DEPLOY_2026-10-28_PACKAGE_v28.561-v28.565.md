# Deploy package v28.561 to v28.565 (28-Oct-26)

**STATUS 28-Oct-26: MERGED 10:55Z (f285b6f8, squash) by Claude at Ben's request ("deploy and merge"); deploy run 40675966645 success; LIVE v28.565 (read back /api/version).** Was: PR https://github.com/dockandbayteam/dock-bay-demand-planner/pull/38. Ben HEAD c62bab29.

## What changed
- v28.561 DEMAND Exceptions: SKU column never clips (table sizes to the longest SKU); Apply button per row next to Proposal.
- v28.562 Selling no forecast: "Hide SKUs without inventory" (default on; DTC/B2B need 3PL stock, FBA needs FBA stock).
- v28.563 DEMAND Actions: month on each card, "Hide older than 6 months" (default on), sort by date newest first.
- v28.564 WSSI: write-off tooltip and logic doc wording (unexplained movement; cross-market moves named as a known gap). No logic change.
- v28.565 Manage 3PL ▸ UK (ILG): tick boxes left, SKU column 1.5x, SKU never clipped.

## Migrations / routes / env / cron
- None. Client only.

## Port note
sync-ben clean, no conflicts.

## Checks
scripts/checks/run-all.cjs, npm test, tests/prebuild-race.cjs: all pass.
