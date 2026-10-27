# Deploy package v28.521 (28-Oct-26)

**STATUS 28-Oct-26: LIVE v28.521 (PR #27 merged 22:01Z, f6020308).** Was: PR OPEN https://github.com/dockandbayteam/dock-bay-demand-planner/pull/27 (branch port/v28.521, from Ben 87f598a2). Ben merges.

## What changed
- v28.521 ACCOUNTS ▸ Reconcile ▸ Review (bill drawer): blank Xero contact / Account / Tax fields show light red; hovering the greyed "Push bill to Xero" says why it is off (120 ms tooltip).

## Migrations
None. (Migration 393 from the previous package was applied on live 28-Oct-26.)

## Env vars / cron routes
None new.

## Checks
scripts/checks/run-all.cjs, npm test, tests/prebuild-race.cjs: all pass.
