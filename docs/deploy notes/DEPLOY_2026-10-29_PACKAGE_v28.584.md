# Deploy package v28.584 (29-Oct-26)

Ben source HEAD: b169f9c1 (b169f9c11100aed8b5f362628f079b61919d3ec5). Live before this deploy: /api/version = v28.583 (read 29-Oct-26). Status: PENDING PR

## What changed
- v28.584: DEMAND ▸ Inputs ▸ Trading calendar: GET /api/trading-calendar removed from the 10-minute response cache (deletes, "+ Event" and CSV import never cleared it, so deleted lines came back and new ones were missing). A failed delete now shows an error. Files: server.mjs, artifact_v16.7.html, package.json, CHANGES.md.

## Env vars
None new.

## Migrations
None.

## New cron routes
None.

## Checks (port branch)
(after the port)

## After merge
/api/version = v28.584; on the calendar page, delete an event and it stays gone after a refresh.
