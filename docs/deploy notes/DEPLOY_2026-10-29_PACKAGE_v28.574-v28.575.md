# Deploy package v28.574 to v28.575 (29-Oct-26)

Ben source HEAD: 114b3c39 (114b3c393a793976923bc6a2764fd6a3baadb705). Live before this deploy: /api/version = v28.573 (read 29-Oct-26). Status: LIVE (PR #43 merged 4c9c41d9; deploy run 40829807073 green; /api/version read back v28.575 29-Oct-26)

## What changed
- v28.574: Supplier portal > Purchase Orders toolbar: more space (search 280px, 38px controls, 10px gaps, status pills on their own row). Desktop only.
- v28.575: HORIZON left menu PORTALS (Supplier: Open portal / Users / Preview; Client: Open portal / Users / Notices). Same pages and links as SUPPLY > CONFIG and CLIENT. New SUPPLY > CONFIG > Open portal: staff open the REAL supplier portal in a new tab for a chosen supplier, signed in as themselves, 8 hours, no supplier user needed. Edit only with SUPPLY edit or admin (else read only, writes refused 423); everything logged under the staff email. Portal top bar shows "Staff view".
- Server: POST /api/supply/portal-staff/:supplier_id (requiredCap exempt: any signed-in staff may view; edit decided by permsFor; no identity under the gate = 403). Staff sessions are planner.portal_sessions rows (existing columns: token hashed, staff email, supplier_id), raw token prefixed pstfw_/pstfr_ (inside the hash, cannot be forged onto a supplier cookie). portalAuth resolves them to the one supplier; /api/portal/me adds staff / staff_edit.
- Files: server.mjs, supply/inject.html, supply/portal.html, supply/portal-view.js, package.json, CHANGES.md.

## Env vars
None new.

## Migrations
None.

## New cron routes
None. (New authenticated route /api/supply/portal-staff/:sid sits behind the normal HORIZON login gate; it is NOT a secret-only route.)

## Checks (port branch)
sync-ben.cjs clean port (.ben-port.json to a3ff6108); run-all.cjs, npm test, prebuild-race all passed; PR checks green.

## After merge
Read back https://horizon.dockandbay.com/api/version = v28.575. PORTALS > Supplier > Open portal > Lixin opens Lixin's portal with the Staff view badge.
