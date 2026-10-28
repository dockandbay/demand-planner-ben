# Deploy package v28.554 to v28.555 (28-Oct-26)

**STATUS 28-Oct-26: PR https://github.com/dockandbayteam/dock-bay-demand-planner/pull/34 open, awaiting Ben's "merge 34".** Ben HEAD 23c914a7.

## What changed
- v28.554 ILG: Rebaseline button above the table, 2-line phone cards; HORIZON's Fulfil reads for the ILG compare pinned to the UK company (Fulfil holds stock per company); a rebaseline capped at 500 SKUs (Fulfil page size).
- v28.555 A PO on a shipment takes its ship, arrival and completion dates from that shipment (Shipments grid rules). Live impact 3 POs: PO-57AUMQ1 completion 01-Oct to 13-Oct; PO-57DILLARDS-LXJULY and PO-57USLX6 11-Nov to 04-Nov. v_po_finance unchanged.

## Migrations / routes / env / cron
- None. No new cron routes, no new env vars.
- n8n (outside this PR): "Fulfil | ILG stocktake" now sets company 1 on counts; sandbox test passed (count 300). Still INACTIVE; goes to PROD only on Ben's yes after this deploy.

## Port note
sync-ben clean, no conflicts.

## Checks
scripts/checks/run-all.cjs, npm test, tests/prebuild-race.cjs: all pass.
