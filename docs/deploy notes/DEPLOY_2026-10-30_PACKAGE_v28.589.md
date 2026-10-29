# Deploy package v28.589 (30-Oct-26)

Ben source HEAD: feccb223 (feccb2236bafef9c597672d38efe0131db536e46). Live before this deploy: /api/version = v28.588 (read 30-Oct-26). Status: LIVE (PR #52 merged a2da7dcd; deploy run 40951412241 green; /api/version read back v28.589 30-Oct-26)

## What changed
- v28.589: Marketing CAMPAIGNS on DEMAND ▸ Inputs ▸ Calendar (Kathryn's Launch Readiness spec, phase 1). A campaign is entered once (launch date, markets, channels DTC / Amazon, Draft / Confirmed, intake override with reason, uplift low/high by tier, target cover) with its SKUs by tier (Hero / Supporting / Cross-sell). The editor flags SKUs not sold in a selected market x channel (PRODUCT availability). Confirmed campaigns set the intake date for their SKUs in DEMAND ▸ Analysis ▸ Intake deadlines (SKU date > campaign > location > launch; computed on read). DEMAND Actions and the PLAN "C" markers handle campaigns with several markets. Files: server.mjs, artifact_v16.7.html, package.json, lib/ai-logic/reports.md.
- v28.589: SCENARIO ▸ B2B Allocation requests: a request with more than 3 SKU lines shows the first 3 and a "Show N more lines" expander. Files: supply/inject.html, lib/ai-logic/b2b-allocation.md.

## Env vars
None new.

## Migrations
- migrations/403_campaigns.sql: ALREADY APPLIED on live by Ben (30-Oct-26) and read back: 7 new trading_calendar columns, planner.campaign_skus, and the 15 Marketing rows merged into 9 Draft campaigns with 126 SKU lines. Backup of the 15 rows: Claude Analyses/campaigns_403/trading_calendar_live_backup_2026-10-30.json (Ben's repo).

## New cron routes
None.

## Checks (port branch)
sync-ben.cjs clean port (.ben-port.json to feccb223); run-all.cjs, npm test, prebuild-race passed.

## After merge
/api/version = v28.589.
