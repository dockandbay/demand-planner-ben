# Deploy package v28.586-v28.587 (29-Oct-26)

Ben source HEAD: 7b7c6133 (7b7c6133c5542c16e232039aca8b7dc2ff82d381). Live before this deploy: /api/version = v28.585 (read 29-Oct-26). Status: PENDING PR

## What changed
- v28.586: To do button and drawer say it is your personal list (tooltip + note). SCENARIO ▸ B2B Allocation: REQUESTS is a purple button at the top right with an "N open" count. Files: supply/inject.html, package.json, CHANGES.md. Client only.
- v28.587: B2B request cards list SKU lines (SKU, name, qty, can allocate, verdict), a coloured market badge, and a recommendation (approve / partial / reject or wait) above Approve. The requests list API adds last_rows. Files: server.mjs, supply/inject.html, package.json, CHANGES.md.

## Env vars
None new.

## Migrations
None.

## New cron routes
None.

## Checks (port branch)
(after the port)

## After merge
/api/version = v28.587; REQUESTS top right on B2B Allocation.
