# Deploy package v28.522 to v28.523 (28-Oct-26)

**STATUS 28-Oct-26: PR OPEN** https://github.com/dockandbayteam/dock-bay-demand-planner/pull/28 (branch port/v28.523, from Ben 94d95ab6). **Migration 394 runs FIRST**, then Ben merges.

## What changed
- v28.522 PO ▸ Linked records: more than one Fulfil PO per HORIZON PO (extras; the main link stays the push / sync target). Extras are searchable and used to match Fulfil bills to Xero bills.
- v28.523 PO actions clear silently after saves (grid badge, nav counts, drawer badges, Open actions banner and strips).

## Migrations
- **394_po_fulfil_extra.sql** (additive): planner.po_fulfil_extra (fulfil_id PK, po, number, reference, supplier, state, url, added_by, added_at); no anon grants. Run FIRST. The code tolerates it missing.

## Routes / env / cron
- New routes: GET / POST /api/supply/po/:po/fulfil-extra, POST /api/supply/po/:po/fulfil-extra/remove. No new env vars, no new cron routes.

## Checks
scripts/checks/run-all.cjs, npm test, tests/prebuild-race.cjs: all pass.
