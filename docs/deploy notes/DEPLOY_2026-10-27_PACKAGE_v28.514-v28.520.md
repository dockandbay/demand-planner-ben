# HORIZON deploy package v28.514 to v28.520 (27-Oct-26)

**AT A GLANCE:** Ben's branch `review-fixes-2026-10-05` at `5a00066f` (`5a00066fcba7273c8d4ce2da56385583948a04e7`; code v28.520). Live `/api/version` before: **v28.513** (production `main` = `0ae7d6c5`). Production port: PR #26, branch `port/v28.520` (`1d1e4fa5`). Owner of production steps: Ben.

**STATUS 27-Oct-26: PR OPEN. Migration 393 NOT applied** (Claude's apply was blocked by the permission check). Ben runs 393 in the SQL editor FIRST, then merges. Merging first breaks the PRODUCT sizes grid (the size queries read the new columns).

## What changed
- v28.514 Portal preview: portal tabs no longer rewrite HORIZON's URL (blank page).
- v28.515 Supplier portal: numbered charge rows with status in words; "Freight & Handling Charges"; "Amount".
- v28.516 Supplier portal: POs, shipments and samples open in a right-hand drawer.
- v28.517 / v28.518 (other session) Custom orders: production file list (one file at a time) and supplier-created batches. Need the Customiser with GET waiting / POST batches/create; without it the card says no lines are waiting.
- v28.519 Hover any uploaded file for a preview (saved once).
- v28.520 PRODUCT sizes: searchable size list with dimensions (cm); PRODUCT ▸ Config ▸ Sizes.

## Port notes
- `scripts/port/sync-ben.cjs` c7141c68 → 5a00066f: clean. Checks: run-all, npm test, prebuild-race pass; page scripts parse.

## Migration, env, routes
- **393_product_size_library.sql** (additive): planner.product_size_library (56 sizes), length_cm / width_cm / height_cm / library_code on planner.product_dev_sizes; no anon grants. Run FIRST.
- No new env. **New cron / webhook routes: none.** New routes: GET / POST /api/product/size-library; GET / POST /api/supply/portal-attachment/:id/thumb; custom-orders proxy allows GET waiting and POST batches/create.

## Buy plan
No planning logic changed.

## Smoke checks after the deploy
1. `/api/version` = v28.520.
2. PRODUCT ▸ a product ▸ Size & variants: ＋ Add size search ("picnic"), L × W × H column; PRODUCT ▸ Config ▸ Sizes lists 56.
3. CONFIG ▸ Portal ▸ preview a supplier, click tabs: HORIZON URL stays on Config ▸ Portal; PO / shipment / sample open in a drawer.
4. Hover a PDF link on a product: preview appears (first time "Making a preview").

## Deploy record
- 27-Oct-26: PR #26 opened; migration 393 SQL handed to Ben (on the clipboard).
