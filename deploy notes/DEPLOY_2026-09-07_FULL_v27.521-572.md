# DEPLOY 2026-09-07 (FULL): everything since live v27.520, up to v27.572 (for Diviyaj)

**From Ben.** Live is at **v27.520** (per Diviyaj's 06-Sep report). This note is the single package for **v27.520 to v27.572**.
It supersedes and consolidates the three interim notes, which stay in the folder for detail:
`DEPLOY_2026-09-07_v27.521-565.md`, `DEPLOY_2026-09-07b_v27.566-569.md`, plus the v27.570 to 572 work described only here.
Branch: `phase-2.1-suppliers` on GitHub (dockandbay/demand-planner-ben), head commit tagged in PR #2.

## The essentials

- **Schema migrations (4, all additive, re-runnable, run in order BEFORE the server restarts):**
  - `266_sample_aspect_awc_comment.sql` — `awc_comment text` on `planner.product_sample_aspect_feedback`.
  - `267_portal_attachments_aspect.sql` — `aspect text` on `planner.portal_attachments` (sample uploads remember their component). **Required before restart**: the photo insert writes this column.
  - `268_barcode_projects_pos.sql` — `pos text[] NOT NULL DEFAULT '{}'` + GIN index on `planner.barcode_projects` (projects linked to POs).
  - `269_timeline_note_attachments.sql` — `attachment_id bigint` on `planner.shipment_notes` and `planner.sample_notes`.
  All four are applied on Ben's sandbox.
- **No new env vars. No new npm deps.** `npm test` passes at v27.572.
- **Files:** `artifact_v16.7.html`, `server.mjs`, `supply/inject.html`, `supply/hz-theme.css`, `supply/portal-view.js`, `supply/portal.html`, `migrations/266..269`, `package.json`, `CHANGES.md`.
- **BUY-PLAN SENSITIVITY: YES, approved by Ben (07-Sep).** The discontinued run-off model changed in v27.534 to 545. Snapshot vs v27.520 on sandbox data: UK -9,500 units (-2.4%), US -14,200 (-9.8%), AU -6,800 (-18%), EU / CA within a few hundred. Sets with a discontinued colour now stop when that colour runs out. Expect the live buy plan to move on first load; that is intended. Nothing after v27.565 touches demand or buy logic.
- **Live data already written by Ben's request (07-Sep):** 207 `planner.forecast_outputs` rows (Towel - Beach SEASONAL, uk_fba / us_fba, Sep to Nov 2026, source `script_fba_smooth_2026-09-07`). Backup table `planner.forecast_outputs_bak_20260907_fba_smooth` (567 rows) + rollback SQL in `deploy notes/rollbacks/`. Leave the backup until Ben says otherwise. Those forecasts only DISPLAY once this package is live.
- **Optional one-off cleanup (needs Ben's go):** the retired Auto-sweep pass wrote per-channel stock-capped zero overrides into live `forecast_outputs`; the new allocator no longer produces them but the old rows remain. Ben will say whether to purge them.

## Live checks after deploy

1. DEMAND ▸ UK ▸ FBA ▸ Towel - Beach SEASONAL: TOWLB-COLLAB-LG-UNO shows 19 / 5 / 18 for Sep / Oct / Nov (not locked zeros). Both plan header rows are light grey.
2. PRODUCT ▸ SAMPLE BATCH REVIEW: pick a shipment, upload a file under a component's feedback box: a chip with the file name stays and survives reload (500 here means mig 267 did not run).
3. SUPPLY ▸ Barcodes ▸ Customise: open a project, link a PO via the search picker, Save. In the portal that PO's Barcodes & Labels shows "Custom barcodes · <project>" with ⤓ Download custom barcodes.
4. Any PO / shipment / sample timeline (admin and portal): the dashed "📎 Choose files or drag & drop · max 4MB per file" box posts a file and it shows on the timeline; a 5MB file is refused with "file exceeds 4MB".
5. Mark a test sample shipment received: its status flips to COMPLETED.

## Server changes (server.mjs), whole package

New routes:
- `GET /api/supply/barcode-lookup?code=` (before the `/api/supply/:section` catch-all), `GET /api/supply/po-search?q=` (same placement), `GET /api/product/batch-review-list`, `GET /api/product/batch-review/:id` (items carry `product_type`), `POST /api/product/note/upsert-feedback`, `GET /api/portal/product-sample/:id/card.pdf`, `GET /api/portal/product-components/:ref`, `POST /api/supply/timeline-attachment`, `POST /api/portal/timeline-attachment` (kind po|shipment|sample; ownership-checked).
Changed:
- Sample aspects accept component keys `c<id>` + `awc_comment`; `productSampleList` returns `awc_comment`, `updated_at/by`, `feedback_notes`, and `photos[].aspect`; `insertProductSamplePhoto` stores `aspect`.
- `/api/supply/suppliers` returns `active`; lookups exclude archived suppliers (currency map keeps all).
- `POST /api/supply/sample/:id/received` with `received:true` also sets `sample_requests.status='COMPLETED'` unless CANCELLED.
- Barcode projects: list/get/save carry `pos`; `GET /api/portal/label-data?po=&project=` returns ONLY the project's custom numbers (per ticked type) for the supplier's SKUs, 403 unless the project is linked to that PO and the PO is the supplier's; project batch stamps the label. `GET /api/portal/bootstrap` PO rows carry `barcode_projects`.
- Six note-post routes accept `attachment_id`; six note-list routes return `attachment_id / attachment_name / attachment_mime`; `GET /api/portal/attachment/:id` also allows shipment-ref-keyed files.

## What changed (by area)

### DEMAND (v27.521 to 567)
Run-off allocator `runoffAlloc()` replacing five per-channel copies (3PL pool shared by DTC / B2B / TIK and by FBA after FBA's own pool; depletes from the current month; sets capped by component build capacity; ≤100 tail rolls to next month; no legacy `recalcDiscontinued` in the Auto sweep). Release filter as a black dropdown state; "no smooth" wording + strike-through smooth preview; smoothing across run-off SKUs when no active SKU. Summary toolbar currency toggle bound to the main pill; target entry precedence units > % > money; units-based growth (fixes +989% recs); "Apply everywhere" for target recommendations. Header rows light grey (v27.567).

### SUPPLY (v27.521, 522, 559, 561 to 564, 570, 572)
FBA refusal latch parity with Diviyaj's network latch; supplier archive (`suppliers.active`, Archive / Restore, Show archived); Create production POs lines with tier badge, season and launch-to-discontinue; Barcode scanner (camera where `BarcodeDetector` exists, typed/USB otherwise; SKU card with swatch, prices, inventory, Customise-project numbers); **Customise projects link to POs** (searchable picker, purple chips) and the portal shows **⤓ Download custom barcodes** on those POs (project SKUs the supplier owns, custom numbers only); SR editor "Sample Batch Review ↗" button; Mark received ⇒ COMPLETED.

### Mobile (v27.535 to 543)
PO grid as phone cards to Ben's layout, ✕ on picker sheets, Filters holds archived / import / plan-shipments, toolbar row order, PLAN panel shimmer instead of "Loading".

### PRODUCT (v27.528 to 533, 547 to 558, 566, 568, 569)
Plan grid sticky header; silent Mark received; portal add-sample searchable shipment picker with "+ New shipment"; portal aspects = supplier's components; feedback boxes with "/" phrases, "/p" Pantone, tags, live swatch preview; fixed-position picker menus (v27.568 fixed a comment that had swallowed their left/width, which pinned them to the page edge); feedback notes upsert with "added to / updated on timeline" indicator; admin photo/doc upload on sample cards; timeline attachments on the product timeline; **SAMPLE BATCH REVIEW** page (shipment → all dev samples; feedback / tags / reasons / sign-off / approved-with-comments / photography tick; filter box; blue shipment box; drawer opens on Samples; two-way refresh; per-component file chips; `#/product/batch/<id>` deep link); Samples tab mirrors the batch page (drop box, layout, SR refs open the drawer); shared boxed sample card PDF admin + portal.

### Supplier portal (v27.529, 531, 533, 553, 570 to 572)
Add-sample shipment picker with recipient + ship date; component-keyed aspects; sample card PDF; Download custom barcodes; timeline attachments on PO / shipment / sample timelines (below).

### Timelines, admin + portal (v27.571)
PO, shipment and sample composers get a dashed "📎 Choose files or drag & drop · max 4MB per file" box; drop on the message or the box; multiple files upload one at a time (client pre-check + server 413); first file rides on the message note, extras post as "📎 name" notes; thumbnails / links render on the timeline.

## Rollout suggestion
1. Run migrations 266, 267, 268, 269 on live (seconds each; additive).
2. Deploy v27.572.
3. Run the five live checks above. Expect the buy plan to move by the approved run-off delta.
4. Rollback: redeploy v27.520. The new columns can stay (unused by the old code). The forecast_outputs live write has its own rollback SQL in `deploy notes/rollbacks/`.
