# Deploy package v28.595 to v28.606 (31-Oct-26)

Ben source HEAD (code): b1144446 (v28.606). Live before this deploy: v28.594. Port PR #55 (port/v28.604, prod commits 822d628 + 9370f65). Status: PR OPEN, checks green; migrations 406 + 407 to run on live before the merge.

## What changed
- v28.595: sandbox lean mode (SANDBOX_LEAN=1 stops background DB work; off unless set, so no change on live).
- v28.596: Campaigns phase 2, launch READINESS one-pager (RAG per campaign SKU x location, CSV, Print / PDF, RAG on calendar chips).
- v28.597: Campaigns phase 3, SUPPLY > Purchase orders > Campaign priority, campaign badges on PO / shipment refs, "need by" intake date on the supplier portal, daily ETA-past-intake alert.
- v28.598: Campaigns phase 4, campaign filter, flag and launch-cell uplift on the DEMAND plan (display only; buy unchanged).
- v28.599: WORKFLOWS basics, CONFIG > Admin > Workflows: supplier completion date -> PO production end; completion date moved -> Fulfil dates (live Fulfil writes stay behind FULFIL_LIVE_WRITES). Both start Off / Ask first.
- v28.600: Workflows view only for non-admins.
- v28.601: workflow "payment due late in the month -> likely date the 1st"; "+ Suggest a workflow" form into the Suggestion box.
- v28.602: that workflow only takes payments due in the current or previous month.
- v28.603: CLIENT > B2B forecast (replaces the "B2B - Direct to Client Forecast" sheet): grid, cash / P&L / production strip, checks, Fulfil link, match actual Key Accounts orders (actual vs forecast), import from sheet, Chief + workbook CSV feeds, MCP tool b2b_forecast (read).
- v28.604: B2B forecast edit tick seeded for hanna@ (not hannah@).
- v28.605: Ask Claude "Ask in Claude" for people connected to the HORIZON connector: opens the question (plus the screen) in claude.ai, answered through the connector on their Claude plan. New GET /api/assistant/connector (behind the Ask Claude gate).
- v28.606: setup steps for people not connected yet (Open Claude connectors, Check again); hidden while MCP_ENABLED is off.

## Migrations
- migrations/406_workflows.sql (planner.workflows, workflow_runs, workflow_items; additive).
- migrations/407_b2b_forecast.sql (planner.b2b_forecast_orders, b2b_forecast_payments, b2b_forecast_changes; app_permissions.b2b_forecast_edit, seeded true for mikey@, madison@, liam@, hanna@; mikey@ gets a new row with nothing else ticked).
Both run by Ben in the Supabase SQL editor (auto mode blocks apply_migration), then read back.

## Env vars
- CHIEF_FEED_TOKEN (Bearer for GET /api/feed/chief/b2b-forecast) and B2B_CSV_TOKEN (?token= for GET /api/feed/b2b-forecast.csv). Optional: both feeds refuse every request until set.

## New cron routes
- POST /api/cron/campaign-eta (n8n V279wpnGWdQE1ICA, inactive)
- POST /api/cron/workflows (n8n R8DFQ7jdF5Wtmcx6, inactive)
- POST /api/cron/b2b-forecast (n8n 5ux7at0jTaNoulBx, inactive)
All three are inside the prod login gate's secret bracket and re-check x-webhook-secret with safeEq. The two B2B feeds sit next to /api/export/csv/ in the gate (GET, own token in the handler, fail closed).

## Port
sync-ben.cjs: 19 files, 2 conflicts in server.mjs resolved keeping prod hardening (login gate: new crons secret-gated, not Ben's unconditional list; permsFor: lookup_failed kept, b2b_forecast_edit grafted). .ben-port.json benBase b1144446 (second commit: v28.605-606, clean port).

## Checks (port branch)
run-all.cjs (login-gate 27 cron paths), npm test (portal-inplace + 29 B2B forecast checks), prebuild-race passed. CI pre-deploy checks + regression tests green.

## After merge
- /api/version = v28.604.
- Activate the three n8n flows once POST ?dry=1 (where supported) returns ok on live.
- CLIENT > B2B forecast > Import from sheet once on live (admin), then Ben checks the summary.
