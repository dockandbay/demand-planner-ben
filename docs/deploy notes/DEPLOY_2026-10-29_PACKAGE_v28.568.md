# Deploy package v28.568 (29-Oct-26)

Ben source HEAD: 27101857 (27101857b166d208e7585c26bf1cc8f1243d8b42). Live before this deploy: /api/version = v28.567 (read 29-Oct-26). Status: LIVE (PR #40 merged 3c4ffe5c; /api/version read back v28.568 29-Oct-26)

## What changed
- v28.568: Supplier portal > Custom orders gets a "Sample print files" card (Ben: "Let's create him some sample files to download in supplier portal"). It lists the Customiser's print sheet samples (the factory's own layout, from Jack's reference TIFF) with size and a Download button each. The list comes from the Customiser through the existing proxy: `CUST_PATH_RE` in server.mjs now allows the path `samples`. Each link is a 1 hour signed storage link from the Customiser's live Supabase, so the files never pass through HORIZON. The card shows only when the Customiser has sample files.
- Files: server.mjs (1 line), supply/portal-custom.js (the card), package.json (28.568), CHANGES.md.

## Env vars
None new (uses the existing CUSTOMISER_API_URL and CUSTOMISER_API_KEY).

## Migrations
None.

## New cron routes
None.

## Checks (port branch)
- sync-ben.cjs: clean port, .ben-port.json advanced to 27101857
- scripts/checks/run-all.cjs: all passed
- npm test: all passed
- tests/prebuild-race.cjs: exactly one real-data build

## After merge
Read back https://horizon.dockandbay.com/api/version = v28.568, then open Supplier portal > Custom orders as Lixin (staff Portal preview) and check the Sample print files card lists 10 files.
