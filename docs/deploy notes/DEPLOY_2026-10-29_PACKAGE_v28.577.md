# Deploy package v28.577 (29-Oct-26)

Ben source HEAD: 6334fe32 (6334fe32e27653c8e7eed723c1c252ce120571cf). Live before this deploy: /api/version = v28.576 (read 29-Oct-26). Status: LIVE (PR #45 merged 8d7f5672; deploy run 40831598571 green; /api/version read back v28.577 29-Oct-26)

## What changed
- v28.577: SUPPLY > CONFIG > Portal users (= PORTALS > Supplier > Users) grouped by supplier: rows sorted by supplier then email, a heading row per supplier with its user count. Files: supply/inject.html, package.json, CHANGES.md. Client only.

## Env vars
None new.

## Migrations
None.

## New cron routes
None.

## Checks (port branch)
sync-ben.cjs clean port (.ben-port.json to 830ca388); run-all.cjs, npm test, prebuild-race all passed; PR checks green.

## After merge
Read back https://horizon.dockandbay.com/api/version = v28.577; Portal users shows supplier heading rows.
