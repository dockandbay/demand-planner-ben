# Deploy package v28.558 to v28.559 (28-Oct-26)

**STATUS 28-Oct-26: MERGED 10:14Z (e4a3fc60, squash) by Claude at Ben's request ("yes - migrate and then deploy and merge"); migration 400 applied first; deploy run 40670501523 success; LIVE v28.559 (read back /api/version).** Was: PR https://github.com/dockandbayteam/dock-bay-demand-planner/pull/36. Ben HEAD 06d60af8.

## What changed
- v28.558 WSSI: transfers £ cost nets to zero (both sides of a 3PL / FBA transfer at the sending pool's landed cost; was -£35.4k FY27 to date at all markets). Logic doc states write-offs are the residual of stock movement.
- v28.559 WSSI cell notes: row bar (count / + to add), amber cell marker, right-click a cell to add; a note belongs to the filter view it was written in and shows tagged in the views above. Fix: /api/demand/wssi-plan/* and /api/demand/wssi-overrides added to the DEMAND write list (were admin only since v28.548); /api/demand/wssi-notes added.

## Migrations / routes / env / cron
- Migration 400_wssi_notes.sql (planner.wssi_notes): APPLIED ON LIVE 28-Oct-26 by Claude via Supabase MCP at Ben's request, read back (table, 12 columns, 0 rows).
- New routes: GET / POST /api/demand/wssi-notes, DELETE /api/demand/wssi-notes/:id. No new cron routes, no new env vars.

## Port note
sync-ben clean, no conflicts.

## Checks
scripts/checks/run-all.cjs, npm test, tests/prebuild-race.cjs: all pass.
