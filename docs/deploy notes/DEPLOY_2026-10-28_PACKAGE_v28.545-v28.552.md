# Deploy package v28.545 to v28.552 (28-Oct-26)

**STATUS 28-Oct-26: PR OPEN https://github.com/dockandbayteam/dock-bay-demand-planner/pull/32 (branch port/v28.552, from Ben e88dd0d0). Ben merges.**

## What changed
- v28.545 Payments: copy payment email link on the "Paid this session" popup.
- v28.546 WSSI phase 1: category groups, Non Core out, landed cost, OTB remaining in £ retail and units.
- v28.547 WSSI phase 2: open to buy by category group (units / £ retail), shrinks by POs placed since.
- v28.548 WSSI phases 3 + 4: WSSI plan input page (versioned, admin lock), overrides, forecast snapshot, variances.
- v28.549 Completion date: FOB / Direct to Client + 0 days; PO completion = shipment completion.
- v28.550 Stale screens: stale cached lists flagged and refreshed in place.
- v28.551 FBA ship-from: + New address button.
- v28.552 CONFIG > Admin > Gmail connectors (accounts@, ops@).

## Migrations / routes / env / cron
- Migrations 396_wssi_otb_buy, 397_wssi_plan, 398_gmail_connectors: applied on live by Claude at Ben's request and read back (28-Oct-26).
- New routes: GET /api/demand/wssi-plan, POST /api/demand/wssi-plan/cells, /lock, /upload, POST /api/demand/wssi-overrides, GET /api/admin/gmail-connectors. No new cron routes.
- Env: none required. Optional GMAIL_MAILBOX_OPS (default ops@dockandbay.com), SEC_STALE_GRACE_MS (default 1500).

## After deploy
- Someone signed in to Google as ops@ opens CONFIG > Admin > Gmail connectors and presses Connect ops@.

## Checks
scripts/checks/run-all.cjs, npm test, tests/prebuild-race.cjs: all pass.
