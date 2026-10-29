# Deploy package v28.578-v28.579 (29-Oct-26)

Ben source HEAD: a11ebaa5 (a11ebaa51878c7f69c18304739bc6a0a1764e5ae). Live before this deploy: /api/version = v28.577 (read 29-Oct-26). Status: PENDING PR

## What changed
- v28.578: Supplier portal CUSTOM section missing for real suppliers. The CUSTOM script was answered with a 302 to /portal on supplier.dockandbay.com (Caddy forwards only /portal, /portal-view.js and /api/portal/*) and was not on the planner-key gate's public list either; staff on horizon.dockandbay.com carried the key so it loaded for them. Fix: the script is also served at /api/portal/custom.js (same handler, static, no data) and the portal page loads it from there; /portal-custom.js added to the gate's public list; the loader logs a load failure instead of throwing silently. Files: server.mjs, supply/portal.html, package.json, CHANGES.md.
- Prod gate note: Diviyaj's login gate in prod server.mjs exempts /api/portal/ by prefix already, so /api/portal/custom.js passes without a gate change there. The port adds /portal-custom.js to Ben's gate line only if the gate hunk ports cleanly; it is not required for the fix.

## Env vars
None new.

## Migrations
None.

## New cron routes
None.

- v28.579: the same Caddy front also 302s /hz-health.js and /portal-icon.png on supplier.dockandbay.com, so real suppliers never sent a browser health beacon and never got the tab icon. Both are now also served as /api/portal/health.js and /api/portal/icon.png (same handlers, static, no data) and the portal page loads them from there; old paths stay for the staff app and preview. Files: server.mjs, supply/portal.html, package.json, CHANGES.md.

## Infra note (Diviyaj, optional)
No Caddy change is needed now. If the supplier host's forward list is ever revisited, /vendor/* is the remaining path it blocks (not used by the supplier portal today).

## Checks (port branch)
(filled in after the port)

## After merge
Read back https://horizon.dockandbay.com/api/version = v28.579; as a real supplier on https://supplier.dockandbay.com/portal, CUSTOM shows in the top menu and https://supplier.dockandbay.com/api/portal/custom.js returns JavaScript (200), not a 302; so do https://supplier.dockandbay.com/api/portal/health.js and /api/portal/icon.png.
