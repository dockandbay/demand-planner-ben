# Deploy package v28.560 (28-Oct-26)

**STATUS 28-Oct-26: MERGED 10:29Z (74981552, squash) by Claude at Ben's request ("deploy" + "and merge"); deploy run 40672540959 success; LIVE v28.560 (read back /api/version).** Was: PR https://github.com/dockandbayteam/dock-bay-demand-planner/pull/37. Ben HEAD 301b3444.

## What changed
- v28.560 DEMAND Exceptions (Katherine's feedback): Proposal column (run-rate rounded up) with tick boxes, tick all and "Accept proposal" on Forecast < Actual and Forecast > Run-rate; Undo button + every Exceptions edit on the DEMAND undo stack; override boxes take whole numbers only; edited SKUs stay on screen (UPDATED) until refresh / filter change; Selling no forecast gets a month-to-date column and Min filters on last full month; Min steps of 10.

## Migrations / routes / env / cron
- None. Client only.

## Port note
sync-ben clean, no conflicts.

## Checks
scripts/checks/run-all.cjs, npm test, tests/prebuild-race.cjs: all pass.
