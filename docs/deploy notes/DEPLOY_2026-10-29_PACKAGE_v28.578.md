# Deploy package v28.578 (29-Oct-26)

Ben source HEAD: 0185b478 (0185b478e28b2f8db4e6ea183eb847e2c98fe42a). Live before this deploy: /api/version = v28.577 (read 29-Oct-26). Status: PENDING PR

## What changed
- v28.578: Supplier portal CUSTOM section missing for real suppliers. The CUSTOM script was answered with a 302 to /portal on supplier.dockandbay.com (Caddy forwards only /portal, /portal-view.js and /api/portal/*) and was not on the planner-key gate's public list either; staff on horizon.dockandbay.com carried the key so it loaded for them. Fix: the script is also served at /api/portal/custom.js (same handler, static, no data) and the portal page loads it from there; /portal-custom.js added to the gate's public list; the loader logs a load failure instead of throwing silently. Files: server.mjs, supply/portal.html, package.json, CHANGES.md.
- Prod gate note: Diviyaj's login gate in prod server.mjs exempts /api/portal/ by prefix already, so /api/portal/custom.js passes without a gate change there. The port adds /portal-custom.js to Ben's gate line only if the gate hunk ports cleanly; it is not required for the fix.

## Env vars
None new.

## Migrations
None.

## New cron routes
None.

## Infra follow-up (Diviyaj, not needed for this fix)
The Caddy front on supplier.dockandbay.com also 302s /hz-health.js and /portal-icon.png to /portal, so real suppliers never send health beacons and never get the icon. Forward those two static paths as well.

## Checks (port branch)
(filled in after the port)

## After merge
Read back https://horizon.dockandbay.com/api/version = v28.578; as a real supplier on https://supplier.dockandbay.com/portal, CUSTOM shows in the top menu and https://supplier.dockandbay.com/api/portal/custom.js returns JavaScript (200), not a 302.
