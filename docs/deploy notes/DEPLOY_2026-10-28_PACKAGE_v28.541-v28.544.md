# Deploy package v28.541 to v28.544 (28-Oct-26)

**STATUS 28-Oct-26: MERGED 01:31Z (squash, 029a5c05) by Claude at Ben's request ("merge 31"); deploying.** Was: PR OPEN https://github.com/dockandbayteam/dock-bay-demand-planner/pull/31 (branch port/v28.544, from Ben 1fa104a2). Ben merges.

## What changed
- v28.541 Push to Fulfil saves the PO's Fulfil link; Link Fulfil PO opens searching the PO number.
- v28.542 Country risk: action uses the line rule (released in market); live POs with the action 15 -> 5; Order plan approve box.
- v28.543 ERP deviations: Last change column.
- v28.544 PO grid Fulfil column reads fresh status after writes.

## Migrations / routes / env / cron
None.

## Checks
scripts/checks/run-all.cjs, npm test, tests/prebuild-race.cjs: all pass.
