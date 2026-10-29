# Deploy package v28.569 to v28.570 (29-Oct-26)

Ben source HEAD: 9856978b (9856978b377e8389ae18a2d5137be495f4015655). Live before this deploy: /api/version = v28.568 (read 29-Oct-26). Status: PENDING (port branch port/v28.570, PR to dockandbayteam/dock-bay-demand-planner)

## What changed
- v28.569: Supplier portal: CUSTOM is its own top-menu section, right after ORDERS (定制 for China-based suppliers), with the to-do count on the pill. Same gate as before: only suppliers the Customiser reports as linked see it. New address #/custom; old #/orders/custom links still land on it. The staff CONFIG > Portal preview matches. DBPortalView.addTab gains secAfter and badge.
- v28.570: Custom orders tables are left-aligned (the portal's general right-align table rule out-ranked the tab's own rule; fix scoped to .hzc).
- Files: supply/portal-view.js, supply/portal.html, supply/inject.html, supply/portal-custom.js, package.json, CHANGES.md. Client only.

## Env vars
None new.

## Migrations
None.

## New cron routes
None.

## Checks (port branch)
See the PR.

## After merge
Read back https://horizon.dockandbay.com/api/version = v28.570, then open the staff Portal preview as Lixin: menu reads ORDERS, CUSTOM, FINANCE, SAMPLES, PRODUCT, and the Custom orders tables are left-aligned. As Jinma: no CUSTOM.
