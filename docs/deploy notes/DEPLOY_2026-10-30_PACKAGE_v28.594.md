# Deploy package v28.594 (30-Oct-26)

Ben source HEAD (code): 8065df6a (8065df6ae520028945987eab1dbd4dc760f89e3f). Live before this deploy: /api/version = v28.593 (read 30-Oct-26). Status: LIVE (PR #54 squash-merged 8983a3d8; deploy run 40981679925 green; /api/version read back v28.594 30-Oct-26; live DEPOSITS checked: 0 red FX, AU 847 shows 0.69780 USD/AUD)

## What changed
- v28.594: DEPOSITS Xero FX. deposits.xero_fx = the CurrencyRate of the run's SUPPLIER-PAYMENT bill, captured when xero-post creates the bill and whenever the bill passes through the bill cache (xbUpsert: hourly bills sync, live refresh). Matched by date paid + supplier + region (AU run -> AU rows; UK run -> other rows, or any row before 01-Oct-26). USD bills only, blanks only (never overwrites a manual value). The register shows the pair (USD/GBP, USD/AUD for AU from 01-Oct-26) and flags a blank FX red only when one is expected (paid deposit, or paid Other row in a USD supplier-payment run). Files: server.mjs, supply/inject.html, package.json, lib/ai-logic/supply-finance.md, CHANGES.md.

## Env vars
None new.

## Migrations
None. (The 76-row xero_fx backfill was run on live by Ben earlier on 30-Oct-26: a direct data update, not a migration file. Diviyaj: FYI.)

## New cron routes
None.

## Checks (port branch)
sync-ben.cjs clean port (.ben-port.json to 7ad3e54f); run-all.cjs (login-gate 24 cron paths), npm test, prebuild-race passed.

## After merge
/api/version = v28.594.
