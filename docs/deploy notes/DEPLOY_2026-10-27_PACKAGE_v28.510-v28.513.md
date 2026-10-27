# HORIZON deploy package v28.510 to v28.513 (27-Oct-26)

**AT A GLANCE:** Ben's branch `review-fixes-2026-10-05` at `c7141c68` (`c7141c68e603f0013cab23aa5e4ec1aae72ff952`; code v28.513). Live `/api/version` before: **v28.509** (production `main` = `a96db4f2`). Production port: PR #25, branch `port/v28.513`. Owner of production steps: Ben.

**STATUS 27-Oct-26: LIVE v28.513.** PR #25 merged by Ben (production `main` = `0ae7d6c5`), CI push + dispatch success.

## What changed
- v28.510 Fulfil PO references with a note link to their HORIZON PO (PO379 "PO-1881865 (DXKI10774-23)" -> PO-1881865; Fulfil link + merged bill UK 1723). Live read-only check: only that Fulfil PO changes.
- v28.511 PO drawer URL loop for PO numbers with spaces (PO-1892095  - PO475 etc.): decoded hash compare.
- v28.512 Drawer header: large ref + supplier, Copy link, separate Close; close survives a grid refresh.
- v28.513 Drawer header deep blue.

## Port notes
- `scripts/port/sync-ben.cjs` 82946822 -> c7141c68: clean. Checks: run-all, npm test, prebuild-race all pass.

## Migration, env, routes
- No migration, no new env. **New cron / webhook routes: none.** No new routes.

## Buy plan
No planning logic changed.

## Smoke checks after the deploy
1. `/api/version` = v28.513.
2. PO grid: open PO-1892095  - PO475; the URL settles (no flicker), blue header with PO + XR Textile, Copy link, Close.
3. After the next Fulfil import (3 h) and bills sync: PO-1881865 links show Fulfil PO379 and Xero UK 1723 (found by fulfil-bill).

## Deploy record
- 27-Oct-26: PR #25 opened.
- 27-Oct-26: PR #25 merged, main `0ae7d6c5`, CI success. Live verified v28.513. Smoke on live (Chrome): PO-1892095  - PO475 drawer opens with 1 URL change in 5 s (was 30 in 4 s), blue header with the PO and XR Textile, Copy link + Close.
