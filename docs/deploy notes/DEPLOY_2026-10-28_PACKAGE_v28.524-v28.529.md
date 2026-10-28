# Deploy package v28.524 to v28.529 (28-Oct-26)

**STATUS 28-Oct-26: PR OPEN** https://github.com/dockandbayteam/dock-bay-demand-planner/pull/29 (branch port/v28.529, from Ben 92357bff). Ben merges.

## What changed
- v28.524 Global-search PO / shipment drawers use the grid drawer header and width.
- v28.525 Claude connector write tools (POs, order plan, links, shipments, PRODUCT) through HORIZON's own routes as the person.
- v28.526 Hand Fulfil links on draft POs pick up the Fulfil PO number.
- v28.527 Push to Fulfil reads the PO back (erp_qty at once, number on hand links, panel re-reads).
- v28.528 Hide waiting for supplier approval; Approve all partials on a PO; Apply end date from the timeline; DTC client name action.
- v28.529 Hide toggles relabel ACTION ITEMS (n).

## Migrations
None. (Migration 394 from the previous package is still outstanding on live.)

## Routes / env / cron
No new routes, env vars or cron routes (connector tools ride on /mcp).

## Checks
scripts/checks/run-all.cjs, npm test, tests/prebuild-race.cjs: all pass.
