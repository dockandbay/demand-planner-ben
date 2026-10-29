# Deploy package v28.567 (29-Oct-26)

Ben source HEAD: 4586f182. Status: **LIVE** 29-Oct-26 (PR #39 squash-merged 02:11Z, baa97e7d; deploy run 40804925032 green; /api/version = v28.567)

## What changed
- v28.567: the "Ask" (Ask Claude) button in the top bar is hidden (Ben: "retire ask Claude button. Hide it."). The drawer code, /api/assistant routes, saved conversations and the MCP connector are unchanged.

## Env vars
None new.

## Migrations
None.

## New cron routes
None.

## Checks
- scripts/checks/run-all.cjs: all passed
- npm test: all passed
- tests/prebuild-race.cjs: exactly one real-data build
