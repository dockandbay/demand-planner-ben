# SCOPE — PRODUCT module split: Product ▸ Sampling (development requests) — 16-Sep-2026

Status: **scoping only, nothing built.** Ben's brief (16-Sep) + what exists today, a proposed model, phases, and the questions that decide the shape. Buy plan is untouched by all of this.

---

## 0. What exists today (sandbox = live schema, migs ≤276)

| Table | Role today | Rows (sandbox) |
|---|---|---|
| `product_dev_items` | ONE row = product development **and** its supplier assignment. Cols incl. `ref` (minted `SEASON-CAT-SUPPLIERCODE-NN`), `supplier`, `supplier_code`, `stage`, `status`, `approval_method`, `recipient_countries`, `dev_start_override`, `approved_at`, `type`, `bulk_colour_name`, `swatch` (bytea) | 9 |
| `product_dev_components` | per-product components, each with its own `supplier`, `sampling_mode`, `spec_id`, `dimension` key | 13 |
| `product_dev_sizes` / `product_dev_size_dimensions` | size × component matrix; approval per cell; `mapped_sku`; `approved_sample_id` | 12 / 21 |
| `product_dev_samples` | sample **versions** (v1, v2…) keyed by `item_ref`; `sampled_aspects`, `sample_sizes`, `supplier_status`, `admin_feedback`, photography approval | 6 |
| `sample_request_dev_samples` | dev sample ↔ sample shipment (`sample_requests` SR-nnnn) many-to-many | 7 |
| `sample_requests` | the Samples feature: shipment, recipients, `notify_emails`, `internal_stakeholders`, `received_at`, `fulfilment_source` | 11 |
| `portal_attachments` | files (`category='product'`, `aspect`, `version`, `uploaded_by/at`, `storage_path`) | 14 |
| `supplier_notes` | timeline (keyed by product ref), `tags`, `pantone`, mentions, attachments | 104 |
| `product_dev_change_log` | record of change | 10 |

UI: `renderProductPlan` (grid), `renderProductRange`, `renderProductDashboard` are three separate L2 pages over the same items. Product detail: Master / Sizes & Variants (components chooser folded in, v27.455) / Samples / Documents / Timeline. `renderProductBatchReview` reviews one shipment's samples. Portal has a Product tab (15 endpoints) scoped by `product_dev_items.supplier`. 79 admin `/api/product/*` endpoints.

**The structural problem Ben names:** supplier, stage, approval method, recipient country, dev-start and even the **reference** live on the product row, so a product can only ever have one supplier/one workflow.

---

## 1. Proposed model

### 1a. `product_dev_items` = the PRODUCT (master data only)
Keeps: season, category, colour way, description, type, bulk colour, swatch, components, sizes/variants, files, timeline, mapped SKUs.
**Removed from the product row (moved to the request):** `supplier`, `supplier_code`, `stage`, `recipient_countries`, `approval_method`, `dev_start_override`. `status`/`stage` become **derived** from its requests (see 1c).

**Reference — DECIDED (Ben 16-Sep):** product ref = **`SEASON-TYPE-COLOURWAY`**, e.g. `SS27-TOWEL-CLASSICBLUE` (TYPE = the product-type/category code already used in today's refs; colour way slugged to A-Z0-9, max ~14 chars; a clash gets `-2`). Custom orders keep `CUST-` in the season slot as today. **Editable** after creation. Request ref = **product ref + `-<supplier code>`**, e.g. `SS27-TOWEL-CLASSICBLUE-BL`, also **editable**. (Confirm: TYPE = category code, not the "Product Development / Custom Order" field.)

**Consequence (design rule):** because both refs are editable, child tables must key on the integer `id` (`item_id`, `request_id`), NOT on the ref text as `product_dev_components.item_ref` / `product_dev_samples.item_ref` / timeline `supplier_notes.po` do today. Greenfield lets us do this in mig 277; the ref becomes a display label with a UNIQUE constraint. Timeline notes for products get a `product_item_id` (or the notes table keeps `po` = current ref and the rename endpoint rewrites them — simpler but leaky; prefer the id).

### 1b. NEW `product_dev_requests` = a SAMPLING / development request to ONE supplier
```
product_dev_requests
  id, ref            -- e.g. SS27-TOWLB-01-BL (product ref + supplier code) or DR-nnnn   (Q2)
  item_ref           -- FK product
  supplier_id, supplier_name, supplier_code
  stage              -- sample_development | sample_in_review | approved | dropped …  (today's vocab)
  approval_method    -- photo | samples
  recipient_countries, dev_start
  internal_stakeholders jsonb, notify_emails jsonb   -- same shape as sample_requests (mig 225/274)
  created_by/at, updated_at
product_dev_request_scope
  request_id, component_id (FK product_dev_components), size_id (FK product_dev_sizes)   -- what this supplier samples
```
So supplier 1 = product body for all sizes, supplier 2 = packaging: two requests on one product. `product_dev_components.supplier` becomes a **default** that pre-fills the request scope (it already exists, keep it).

### 1c. Samples hang off the request
`product_dev_samples` gains `request_id` (FK). Versions number **per request** (supplier 1 v1/v2, supplier 2 v1). Product-level stage = most advanced open request; product "approved" only when every sampled component × size is approved (the existing per-cell approvals keep driving that).

### 1d. No backfill — greenfield (confirmed 16-Sep)
**Live has ZERO rows** in every PRODUCT development table (`product_dev_items/components/sizes/samples`, `sample_request_dev_samples`, product files, product timeline notes, `custom_dev_ref` POs) — checked read-only on `oolwklahstnvocaugryg`. Ben: sandbox PRODUCT data is disposable; fake or recreate it freely for testing. Therefore:
- ONE migration can **drop** the moved columns from `product_dev_items` outright and reshape `ref` (no compatibility layer, no dual-read code).
- No backfill script. The sandbox's 9 test items get wiped and re-seeded with a scripted fixture (2-3 products × 2 suppliers × sizes × sample versions × files) that doubles as the test data for every phase.
- Old-ref compatibility risks (section 5) disappear.

---

## 2. Feature-by-feature scope

### (a) Pantone in the compose box — SMALL, do first
Today the textarea holds a `🎨 <code>` token and the swatch only shows in the preview strip below (v27.4xx). A plain `<textarea>` cannot render an image. Two options:
- **A (recommended, small):** token becomes `🎨 TCX 19-4052 Classic Blue` (code + name) everywhere (compose, saved notes, chips) and the preview strip under the box already shows the real swatch. One version.
- **B (bigger):** switch the compose box to `contenteditable` so the swatch chip sits inline; touches every compose surface (timeline, sample feedback, batch review, portal). Two or three versions + regression risk on the slash pickers.

### 1. PRODUCT grid = product items only; GRID / RANGE / DASHBOARD as one dropdown
- Grid drops Supplier, Stage, Approval columns; adds a **Requests** column (supplier chips with stage badges, e.g. `BL ● in review`, `MQ ● approved`). Row click → product drawer as now.
- `renderProductRange` and `renderProductDashboard` become views of the same page behind a **View: Grid ▾ / Range / Dashboard** control; existing hashes `#/product/range` `#/product/dashboard` keep working (they just set the view).
- Product detail keeps Master / Sizes & Variants (step 1 components → step 2 sizes, matrix unchanged) / Files / Timeline; **Samples tab becomes a "Requests" tab** listing the requests with their sample versions.

**Swatch inheritance — DECIDED (Ben 16-Sep):** swatch = uploaded swatch if present, else the auto-thumbnail of the product's **main spec file**, i.e. the admin-uploaded file in Horizon that is marked **latest version** (item 5). **Portal (supplier) uploads never feed the swatch.** PDF → PNG: the admin browser renders page 1 with pdf.js at upload time (canvas available client-side; the server has no canvas) and posts a ~200px PNG alongside the file; images thumbnail the same way. Stored in `product_dev_items.auto_swatch` (bytea/storage_path); an uploaded `swatch` always wins. Changing the "latest version" pick re-points the auto swatch.

### 1b-ii. Requests are PER COMPONENT (Ben 16-Sep)
From the product grid / drawer, each component has a **[+]** that creates a sample request for THAT component and assigns a supplier. **Several suppliers may sample the same product + component** (two rows on SAMPLING for Body: BL and XR); different suppliers may sample different components. Model impact: `product_dev_requests` is (item, supplier) and `product_dev_request_scope` lists its components × sizes — a request may hold one component or several for the same supplier; two requests for the same component are allowed (no unique constraint on component across requests). The Requests column on the product grid is grouped by component.

### 1c-ii. Category colours — BUILT v27.698 (mig 277)
`planner.categories.colour_hex`, auto-assigned from Ben's 19-colour palette (server `ensureCategoryColours`), editable in PRODUCT ▸ Config ▸ Categories, rendered by `hzCatBadge()` on the grid rows + group headers, Range plan and Dashboard. The new PRODUCT and SAMPLING grids reuse `hzCatBadge`. Age / Files / Shipment columns removed from the product grid (Ben).

### 2. SAMPLING page (new L2, `#/product/sampling`) = the interactive requests grid
**Ben 16-Sep:** Age + shipment/tracking columns are REQUIRED here. Tick boxes LARGE and GREEN when received, small dd-mmm date beneath; clicking an S-cell expands the row inline into per-sample tabs (S1 | S2 | S3) with that sample's components, feedback, approve/reject/comment, photos and the merged thread — so review happens in place (no separate Review column).
Columns: **swatch · product ref + colour way · supplier · stage badge (coloured) · S1 S2 S3 … tick cells · review · timeline · shipment**.
- Tick a sample cell = "received today" (writes `received_at`; today `sample_requests.received_at` is per shipment, so add `product_dev_samples.received_at`); un-tick clears. Hover = supplier's submitted date + shipment ref.
- Review click → the existing per-component feedback UI (`/api/product/sample/:id/aspect`, batch-review widgets) in a drawer, filtered to this request.
- Timeline click → product timeline filtered to this supplier's notes.
- Creation flow "**+ Development request**": pick product → supplier → tick components + sizes (pre-filled from component defaults) → approval method / recipient country / dev start → stakeholders (type-ahead of app users, same picker as samples v27.693) + notify emails.
- **(d) is blank in the brief — Q5.**

### 3. Timeline ⇄ sample feedback two-way — DECIDED (Ben 16-Sep)
**Ask:** on the timeline a user **tags a specific sample version**; that message then **appears as feedback on that sample**. The team's habit is hard-coded tags "sample 1" / "sample 2"; Ben's call (agreed): tag the **actual sample record** so the data links precisely, and let the chip *display* as "Sample 2" so the habit is preserved.
- **Compose:** a `/s` picker beside `/` (phrases) and `/p` (Pantone) lists this product's sample versions grouped by request: `Sample 2 · BL v2 · received 12-Sep-26`, optional component sub-pick (`▸ Packaging`). Picking inserts a chip **Sample 2 (BL v2)** — the same rich chip mechanism as Pantone option B. Portal compose gets the same picker limited to the supplier's own request.
- **Data:** `supplier_notes` gains `sample_id` (FK `product_dev_samples`) and nullable `component_id`; a tagged note = feedback. Hard-coded "sample N" text tags are retired from the tag list (the chip carries the label).
- **Read side:** the sample review (Samples tab, batch review, SAMPLING review drawer, phone card) shows one chronological thread per sample (× component when set) = the structured aspect feedback **plus** every note tagged to it, D&B and supplier alike. The existing one-way write (feedback save → timeline note, v27.550) stays, so both directions land in the same thread.
- **Timeline:** filter chips per sample version so a sample's history reads as a thread; the note shows the chip and "feedback" marker.

### 4. Sample card QR + short code + phone scan flow
- Add `short_code` (3-char base-32, unique, e.g. `A31`) to `product_dev_samples`; print it and a **QR** (encodes `https://horizon…/#/product/scan/A31`) on the existing `sampleCardPdf` (admin + portal). QR generation: small inline encoder (no CDN, China-safe).
- Scanner: the v27.561 barcode scanner already uses `BarcodeDetector`; add `qr_code` format + a typed short-code box. Result → **phone sample card**: received tick, component feedback boxes (same endpoints), photos.
- **Auto-mark-received on first scan** toggle (per user, localStorage + app_settings default). Second scan of a received sample never un-receives.

### 5. Files: audit trail + "latest version" pick
`portal_attachments` already has `uploaded_by`, `uploaded_at`, `version`, `aspect`. Add `is_latest boolean` per (item, aspect) with a DB default rule = most recently uploaded; UI radio "latest" on the Files tab overrides. Show uploader + date on every file row (admin + portal). The swatch inheritance (Q3) reads `is_latest`.

### 6. Stakeholders + emails aligned with Samples
Request carries `internal_stakeholders` + `notify_emails` (1b). When a sample shipment (SR) is created for that request's samples, copy them onto the SR (so "My samples", stakeholder emails on ship/receive keep working unchanged). Stakeholder email on **supplier submission of a new sample version** = new trigger (RESEND, same template family).

### 7. DHL API tracking (KEY REQUIREMENT, added by Ben 16-Sep) — samples AND bulk shipments
Show **estimated delivery date · in-transit status · delivered status** from DHL for every DHL tracking number in HORIZON, not a link-out.
- **Where tracking numbers live today:** `sample_requests.carrier/tracking_code` (+ `carrier_2/tracking_code_2`) — sandbox carriers are already mostly "DHL"/"Dhl" (normalise case); bulk = `shipments.carrier/carrier_ref` (+ existing `tracked_delivery_date`, `tracked_source` columns — editable shipment fields today with no automatic feeder; DHL becomes their first automatic `tracked_source`). Product-dev samples reach DHL through their sample shipment (SR), so the SAMPLING grid's Shipment cell inherits the status.
- **API:** DHL **Unified Shipment Tracking API** (`GET https://api-eu.dhl.com/track/shipments?trackingNumber=…`, header `DHL-API-Key`). One key covers DHL Express / eCommerce / Parcel / Freight; response gives `status.statusCode` (pre-transit / transit / delivered / failure), `status.timestamp`, `estimatedTimeOfDelivery`, events. Free "basic" plan is rate-limited (≈250 calls/day, 1/sec) → **server-side polling with a cache**, never per-page-view calls. Multiple tracking numbers per call are supported (comma list) to stretch the quota. Key stays in env (`DHL_API_KEY`), never in the DB or git.
- **Admin config (CONFIG ▸ Admin ▸ Integrations ▸ "DHL tracking"):** enabled toggle, key-present indicator (env), poll interval (default 6h; hourly for anything in transit), "stop polling N days after delivered", test button (paste a tracking number → live lookup). Stored in `app_settings.dhl_tracking` like the other admin settings.
- **Data:** new `planner.carrier_tracking` (carrier, tracking_number PK, status_code, status_text, eta, delivered_at, last_event, events jsonb, last_polled_at, source_table/source_id) — one row per tracking number, shared by samples and bulk shipments. Poller = n8n schedule → `POST /api/tracking/poll` (webhook secret, same pattern as received-POs) or the in-app timer guarded `!VERCEL`; Diviyaj wires the schedule.
- **UI:** a **tracking pill** (● In transit · ETA 19-Sep-26 / ● Delivered 18-Sep-26 / ● Exception) wherever a tracking number shows: SUPPLY ▸ Samples grid + drawer, portal Samples, SUPPLY ▸ Shipments grid + PO drawer Shipments tab, portal Shipment plan, SAMPLING grid Shipment cell. Delivered → offers "mark received" on the SR (does not auto-receive, consistent with Q8). Bulk: `shipments.tracked_delivery_date` set from ETA/delivered with `tracked_source='dhl'` so the existing arrival logic (landing/arrival override, [[shipment-date-authority]]) picks it up unchanged.
- **Other carriers:** FedEx/UPS keep the link-out for now; the `carrier_tracking` table is carrier-agnostic so they can be added later.
- **Phase:** own phase **P2b** right after the SAMPLING grid (it feeds the grid's Shipment cell). Migration 281 (`carrier_tracking`). Needs: DHL developer account + API key from Ben (portal.dhl.com developer), env var on prod via Diviyaj, n8n schedule.

---

## 3. Phasing (each phase = its own versions, Ben review between)

| Phase | What | Migrations | Size |
|---|---|---|---|
| P0 | (a) Pantone token = code + name (option A) | none | 1 version |
| P1 | Model: `product_dev_requests` + `_scope`, `samples.request_id`, DROP moved cols from items, new ref shape; sandbox wipe + scripted fixture; endpoints; product grid without supplier cols + Requests column; View dropdown Grid/Range/Dashboard | 277 (tables + drops), fixture script (sandbox only) | 4-5 versions |
| P2 | SAMPLING page: grid, tick-received, review/timeline drawers, "+ Development request" flow, stakeholders + emails, SR copy-through | 279 (`samples.received_at`, `short_code` reserved) | 5-7 versions |
| P2b | **DHL tracking**: `carrier_tracking` table, poller endpoint + cache, admin config panel + test button, tracking pills on samples (admin + portal), bulk shipments (grid, PO drawer, portal shipment plan) and the SAMPLING Shipment cell; `tracked_source='dhl'` feeds existing arrival logic | 281 (`carrier_tracking`), env `DHL_API_KEY`, n8n schedule (Diviyaj) | 4-5 versions |
| P3 | Files audit + latest version + swatch inheritance (client-side PDF thumbnail) | 280 (`is_latest`, `auto_swatch`) | 2-3 versions |
| P4 | QR + short code on sample card, scanner `qr_code`, phone feedback card, auto-receive toggle | (uses 279) | 3-4 versions |
| P5 | Portal re-scoping: supplier sees only its requests (own components editable, others read-only — the long-standing components TODO) | none | 3-4 versions |
| P6 | Timeline two-way: `/s` sample-version chip picker (admin + portal), `supplier_notes.sample_id/component_id`, merged feedback thread on every review surface, timeline filter by sample | 282 (`supplier_notes` cols) | 3-4 versions |

Mockups (ASCII) for the two grids before P1/P2 per [[mockups-first-ui]] — drafts below.

---

## 4. Mockup drafts

**PRODUCT (Grid view)**
```
PRODUCT   View: [Grid ▾]  Season [SS27 ▾] Category [All ▾] Supplier [All ▾] Stage [All ▾]  🔍            + New product
┌────┬──────────────────┬──────────────┬───────────────┬────────────────────────────┬───────┬────┬───────────┐
│ ▢  │ Ref · colour way │ Type/Category│ Sizes          │ Requests (supplier · stage)│ Files │Age │ Shipment  │
├────┼──────────────────┼──────────────┼───────────────┼────────────────────────────┼───────┼────┼───────────┤
│[sw]│ SS27-TOWLB-01    │ Towel Beach  │ L · XL  2/4 ✓ │ BL ● in review  MQ ● appr. │  4    │ 6d │ SR-0031   │
│    │ Classic Blue     │              │               │ + request                  │       │    │           │
```
**SAMPLING**
```
SAMPLING  Supplier [All ▾] Stage [All ▾] Season [SS27 ▾]  ☐ mine   🔍                        + Development request
┌────┬────────────────────┬──────────┬────────────────┬────┬────┬────┬────┬────────┬──────────┬──────────┐
│ sw │ Product            │ Supplier │ Stage          │ S1 │ S2 │ S3 │ S4 │ Review │ Timeline │ Shipment │
├────┼────────────────────┼──────────┼────────────────┼────┼────┼────┼────┼────────┼──────────┼──────────┤
│[sw]│ SS27-TOWLB-01 Blue │ BL       │ ● in review    │ ☑  │ ☑  │ ☐  │    │ 2/3 ✓  │ 5 · 1 new│ SR-0031  │
│[sw]│ SS27-TOWLB-01 Blue │ MQ Print │ ● approved     │ ☑  │    │    │    │ 1/1 ✓  │ 2        │ —        │
```
(☑ = received, hover shows date; ☐ = submitted not received; blank = no such version yet.)

---

## 5. Risks / things that break if not handled
- ~~Ref shape / backfill / live data volume~~ — gone: live PRODUCT tables are empty (16-Sep check), greenfield migration.
- **Portal scoping** flips from `items.supplier` to requests → every portal product endpoint (15) changes its WHERE. Test with the fixture's two suppliers via the view-as-supplier preview (`#/supply/config/portal/<code>`) before flagging done.
- **Feedback-note keys**: Samples-tab/batch-review upsert matches timeline notes by prefix `Feedback on REF_vN · Label:` (v27.550). With several requests per product the prefix must carry the supplier code (`REF-BL_v2`) or notes from two suppliers' v2 collide.
- **Custom-order POs** (`custom_dev_ref` CSV of product refs) keep pointing at the PRODUCT ref, not a request — fine, but the portal banner that shows the linked dev must resolve to the supplier's own request.
- **PDF thumbnails** need the browser (pdf.js + canvas); portal uploads from China must also produce them or fall back to no auto-swatch.
- **QR on the card** must render offline (inline encoder), CSP and China-safe.
- **Diviyaj**: mig 277 drops columns — flag loudly in the deploy note even though live rows = 0.

---

## 6. Questions for Ben (decide before P1)
1. ✅ DECIDED: product ref `SEASON-TYPE-COLOURWAY`, editable. (One check: TYPE = category code like TOWEL/HAIRW, yes?)
2. ✅ DECIDED: request ref = product ref + `-<supplier code>`, editable.
3. ✅ DECIDED: swatch inherits from the admin-uploaded **main spec file** (the "latest version" pick) in Horizon; portal uploads excluded.
4. ✅ DECIDED: Requests column = supplier chips with stage badges inline (as drafted in the mockup); chip click opens that request on the SAMPLING page, "+ request" chip starts the creation flow.
5. SAMPLING grid item **2(d)** is blank in your note — what was the fourth column/feature?
6. Item **3** cuts off at "we want on the timeline to be able to…" — finish the sentence (reply-to-feedback from the timeline? supplier replies flowing into review? something else?).
7. ✅ DECIDED (survey 16-Sep): **Option B** — inline swatch chip + code + name inside the compose box via a contenteditable editor, on every compose surface (timeline, sample feedback, batch review, portal). Bigger: P0 becomes 2-3 versions; build one shared `hzRichCompose` and swap surfaces one at a time behind the existing slash pickers.
8. ✅ DECIDED: auto-mark-received on first scan **OFF by default** (toggle per user; scan opens the card, user taps "Mark received").
9. ✅ DECIDED: product stage = **derived + manual override** (override shown with an "overridden" marker and who/when; clearing the override returns to derived).
10. ✅ DECIDED: a product with no request is visible to **nobody** in the portal.
11. **DHL**: Ben to create the DHL developer account + API key (free basic plan first; upgrade if the daily quota bites) and hand the key to Diviyaj for prod env; confirm poll cadence (default 6h, hourly while in transit) and whether "Delivered" should nudge the SR to received (proposal: offer a one-click "mark received", never automatic).
6. ✅ DECIDED: tag the actual sample version from the timeline (`/s` chip, displays "Sample N"); tagged note = feedback on that sample; hard-coded "sample 1/2" tags retired.
5. ✅ DECIDED (Ben "proceed" 16-Sep): item 2(d) = **Shipment + DHL tracking** cell (SR ref, carrier, tracking pill with ETA / delivered, link/create shipment inline).
ALL QUESTIONS CLOSED 16-Sep → next: mockups (`mockups/product-split-grids.md`) → P0. — see the note sent 16-Sep (what (a)-(c) already cover; what the timeline ⇄ feedback link does today).
