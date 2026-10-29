# Deploy package v28.585 (29-Oct-26)

Ben source HEAD: 351c7803 (351c78039f6e9be88e592bedd9d1e78b932ef01a). Live before this deploy: /api/version = v28.584 (read 29-Oct-26). Status: LIVE (migration 402 run by Ben and read back; PR #49 merged d5bde18d; deploy run 40861153819 green; /api/version read back v28.585 29-Oct-26)

## What changed
- v28.585: B2B allocation REQUESTS in SCENARIO ▸ B2B Allocation: Submit for approval (same inputs as the analysis + notes), one notify email with the full analysis, WhatsApp summary + direct link, Requests drawer (Open / Closed / Settings for admins), approve / reject (Kathryn, Sarah, Abi, admins), cancel (creator), re-analyse, analysis history per request, decision emails to the requester + notify list. New API under /api/scenario/b2b/requests and /api/scenario/b2b/request-settings. New Ask Claude topic lib/ai-logic/b2b-allocation.md. Files: server.mjs, supply/inject.html, migrations/402_b2b_requests.sql, lib/ai-logic/*.md, package.json, CHANGES.md.

## Env vars
None new (emails use the existing RESEND_API_KEY).

## Migrations
**402_b2b_requests.sql** (planner.b2b_requests, planner.b2b_request_analyses; additive). Run on live by Ben before the merge; read back: 13 + 7 columns, indexes present.

## New cron routes
None.

## Checks (port branch)
sync-ben.cjs clean port (.ben-port.json to 306ff37d); run-all.cjs, npm test, prebuild-race passed; PR checks green.

## After merge
/api/version = v28.585; SCENARIO ▸ B2B Allocation shows the Requests button; a test submit creates B2B-0001 and emails the notify list.
