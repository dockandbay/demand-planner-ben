# Deploy package v28.588 (29-Oct-26)

Ben source HEAD: 59a834b0 (59a834b05712160d4b3ae4a8789a04465c31cede). Live before this deploy: /api/version = v28.587 (read 29-Oct-26). Status: LIVE (PR #51 merged 28f3a58f; deploy run 40866703214 green; /api/version read back v28.588 29-Oct-26)

## What changed
- v28.588: SCENARIO ▸ B2B Allocation: the purple REQUESTS button moves onto the toolbar row (right end). Files: supply/inject.html, package.json, CHANGES.md. Client only.

## Env vars
None new.

## Migrations
None.

## New cron routes
None.

## Checks (port branch)
sync-ben.cjs clean port (.ben-port.json to c3149e09); run-all.cjs, npm test, prebuild-race passed; PR checks green.

## After merge
/api/version = v28.588.
