# Deploy package v28.556 to v28.557 (28-Oct-26)

**STATUS 28-Oct-26: MERGED 09:49Z (986d3bb4, squash) by Claude at Ben's request ("deploy and merge"); deploy run 40667311965 success; LIVE v28.557 (read back /api/version).** Was: PR https://github.com/dockandbayteam/dock-bay-demand-planner/pull/35. Ben HEAD 667a24f2.

## What changed
- v28.556 WSSI: link to the WSSI plan (superseded by v28.557).
- v28.557 WSSI worksheet: with one market, channel and category group picked, open to buy, the plan draft, forecast override and target override are edited in place on DEMAND ▸ WSSI and the grid recalculates. Saves go through the existing endpoints (/api/demand/wssi-otb, /wssi-overrides, /wssi-plan/cells, /wssi-plan/lock). DEMAND ▸ Inputs ▸ Open to buy and WSSI plan removed from the menu (links open the worksheet); the all-markets grids stay under "Bulk grid".

## Migrations / routes / env / cron
- None. No new cron routes, no new env vars, no server changes.

## Port note
sync-ben clean, no conflicts.

## Checks
scripts/checks/run-all.cjs, npm test, tests/prebuild-race.cjs: all pass.
