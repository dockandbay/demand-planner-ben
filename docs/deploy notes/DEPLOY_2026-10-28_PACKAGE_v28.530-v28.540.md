# Deploy package v28.530 to v28.540 (28-Oct-26)

**STATUS 28-Oct-26: LIVE v28.540 (PR #30 merged 00:50Z). Fulfil refresh 01:17Z read back: 0 POs left without a supplier link (12 linked), 0 left without their shipment's FLEX ref (417 set), extra PO478 lines read; PO475 now ERP 800/800/1,300 = plan (drift cleared), delivery 21-Dec-26 from Flexport, supplier_id 1 (XR).** Was: PR OPEN https://github.com/dockandbayteam/dock-bay-demand-planner/pull/30 (branch port/v28.540, from Ben f6fe221e). Ben merges.

## Migrations
- **395_po_fulfil_extra_lines.sql**: APPLIED on live 28-Oct-26 by Claude via MCP (Ben: "run 395"); read back: po_fulfil_extra.lines jsonb, synced_at timestamptz.

## Data changes after deploy (by code)
- v28.535: 12 live POs with a supplier name but no supplier_id get linked (next Fulfil refresh, or on save).
- v28.536: 417 POs take their shipment's FLEX carrier ref as flexport_reference; 35 gain Flexport dates (14 open), 10 older ones switch Flexport shipment, 372 unchanged.

## What changed
v28.530 client picker · v28.531 silent mark read · v28.532 matching supplier date needs nothing · v28.533 Fulfil search via sales order · v28.534 Fulfil link on order plan · v28.535 supplier heal · v28.536 Flexport heal · v28.537 extra-PO ERP qty + push · v28.538 date push via linked Fulfil PO · v28.539 ERP deviations columns · v28.540 cancelled-shipment push message.

## Routes / env / cron
None new.

## Checks
scripts/checks/run-all.cjs, npm test, tests/prebuild-race.cjs: all pass.
