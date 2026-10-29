# Deploy package v28.576 (29-Oct-26)

Ben source HEAD: ce82f555 (ce82f5556bfb8e9bac23fe3f65fd201b69ae6781). Live before this deploy: /api/version = v28.575 (read 29-Oct-26). Status: LIVE (PR #44 merged 875b3484; deploy run 40830243389 green; /api/version read back v28.576 29-Oct-26)

## What changed
- v28.576: PORTALS > Supplier > Open portal: supplier dropdown 380px with Open portal on the same line. Files: supply/inject.html, package.json, CHANGES.md. Client only.

## Env vars
None new.

## Migrations
None.

## New cron routes
None.

## Checks (port branch)
sync-ben.cjs clean port (.ben-port.json to c9a22e07); run-all.cjs, npm test, prebuild-race all passed; PR checks green.

## After merge
Read back https://horizon.dockandbay.com/api/version = v28.576.
