# Deploy package v28.590 to v28.593 (30-Oct-26)

Ben source HEAD (code): 8d665009 (8d6650090818af741c28da438b611673eac82926). Live before this deploy: /api/version = v28.589 (read 30-Oct-26). Status: PACKAGED (port PR pending)

## What changed
All 11 of Kathryn's "B2B allocation requests: suggested improvements", on SCENARIO ▸ B2B Allocation ▸ REQUESTS. Files: server.mjs, supply/inject.html, package.json, lib/ai-logic/b2b-allocation.md, CHANGES.md.
- v28.590: Decide per line (approve / reduce / reject, reason codes). Approved units are HELD off stock in later analyses until required-by + 14 days or Release hold (held beyond stock comes off in-production). Held B2B column on the page. Seasonality (!) flag.
- v28.591: Reopen a closed request within 7 days of the decision; after that, Request again (reloads client, market, lines onto the page).
- v28.592: Route per line (Stock / Expedite PO / Air order / Transfer; non-stock routes add a To do for the approver, no PO or Fulfil writes), wholesale price + margin after freight, Offer alternative SKU (held too).
- v28.593: Customer stages after approval (Offered, Accepted / Declined, Shipped + Fulfil SO; Declined / Shipped release the hold), other markets' giveable stock on short lines, reserve by tier (A 12 wk, B 9, C 9, run-off 4; Settings), chaser digest for open requests.

## Env vars
None new (the chaser uses the existing N8N_WEBHOOK_SECRET).

## Migrations
- migrations/404_b2b_request_decisions.sql: ALREADY APPLIED on live by Ben (30-Oct-26), read back: decisions, hold_until, reason + b2b_requests_hold_idx.
- migrations/405_b2b_request_stages.sql: ALREADY APPLIED on live by Ben (30-Oct-26), read back: stage, stage_at, stage_by, stage_log, fulfil_so, last_chased_at.
Both are required: the request list reads their columns.

## New cron routes
- POST /api/cron/b2b-chase (x-webhook-secret = N8N_WEBHOOK_SECRET). Already added to the prod login gate's SECRET-GATED list in this port (login-gate check: 24 cron paths proved). Scheduled by Ben / Claude 30-Oct-26 in n8n: flow fabJ23JWzlkTrYaM "Horizon | B2B request chaser" (hourly 08:00 to 18:00 London, Mon to Fri, tag Horizon). Created INACTIVE; it is switched on after the merge once a live `?dry=1` call returns ok. No action for Diviyaj. Each request is chased at most once a day; `?dry=1` lists without emailing.

## Checks (port branch)
sync-ben.cjs port (.ben-port.json to 8d665009); one server.mjs conflict in the login gate, resolved keeping production's gate and adding /api/cron/b2b-chase inside the secret-gated bracket. run-all.cjs (login-gate 24 cron paths), npm test, prebuild-race passed. Migrations 404 + 405 read back on live before the PR.

## After merge
/api/version = v28.593.
