# HORIZON deploy package v28.437 → v28.466 (22-Oct-26)

**AT A GLANCE:** branch `review-fixes-2026-10-05`, HEAD `9bf7e927` (9bf7e92777bf1381190b7c78754e5629aba216a1). Live verified `/api/version` = **v28.436** (22-Oct-26). Package = v28.437 to v28.466 (v28.450, v28.453 and v28.454 were cache-busting versions, not separate changes).

- **Migrations:** 1 new, `migrations/383_dev_request_send_status.sql` (not on live).
- **New env (server only):** `IMAGEBANK_URL` = https://imagebank.dockandbay.com and `IMAGEBANK_API_KEY` = the ImageBank "Horizon client portal" key (`ibk_…`; Ben has it, it is not in git). Without them the portal's image gallery just shows "not connected".
- **Env no longer needed:** `COGS_AIRTABLE_EMAIL` is now a CONFIG setting (CONFIG ▸ Exports & uploads ▸ COGS to Airtable, app_settings `cogs_airtable_email`); the env var is only a fallback.
- **New cron / webhook routes:** none.
- **New dependencies:** none. vercel.json unchanged.
- **Buy plan:** identical to v28.436 after every change (snapshot compared each time).

## Steps
1. Deploy HEAD `9bf7e927`.
2. Apply migration 383 (additive, idempotent). It adds `send_status` (default 'draft'), `sent_at`, `sent_by` to `planner.product_dev_requests`. **Effect:** every existing development request becomes Draft and drops off the supplier portal until someone sets it to Sent. Ben asked for this. On live today that is 2 requests, both Lixin, neither accepted yet.
3. Set `IMAGEBANK_URL` and `IMAGEBANK_API_KEY` in Vercel (server env only). Check: Settings ▸ Integrations in ImageBank shows "Last used" for the key after the first gallery load.
4. No data steps for you. (FYI: agent codes on 6 live `planner.clients` rows were set directly by Ben's approval earlier on 22-Oct, backup in `Claude Analyses/agent_client_codes_2026-10-22/`.)

## New routes
All behind the existing auth: staff routes need CLIENT / PRODUCT access as noted; `/api/cp/*` are the signed-in client portal.
- CLIENT / commissions: `GET /api/client/commission/history-all`, `GET|POST /api/client/commission/rules`, `GET /api/client/commission/unassigned`, `POST /api/client/commission/unassigned/dismiss`, `GET /api/client/commission/runs/:id/fulfil-orders`
- CLIENT / galleries: `GET /api/client/galleries`, `POST /api/client/galleries/default`, `POST /api/client/galleries/client/:id`
- Client portal: `GET /api/cp/galleries`, `GET /api/cp/galleries/:id`, `GET /api/cp/galleries/:id/download/:vid` (302 to a short-lived Dropbox link; never cached)
- PRODUCT: `GET /api/product/reports/sample-costs`, `GET /api/product/reports/approval-stats`, `POST /api/product/request/:id/send`

## What changed (by area)
**SUPPLY / reports**
- v28.437 ERP deviations: polybag (POLYBAG*) lines no longer count anywhere (grid, drawer, Actions, data health); lines are still pushed. On your 277 → 374 question: live check found no unit mismatches; the new lines are genuine (stock and DTC SKUs missing from the Fulfil PO, etc.), see CHANGES.md v28.437.
- v28.438 EDI labels: one SSCC = one carton (Dillards packing list duplicates).
- v28.440, v28.443 Stock Availability: Next inbound 3PL / 2nd inbound 3PL / Next inbound FBA as separate columns; Colourway (products.colour_long) instead of Description; 60% drawer; DISC amber, FUTURE violet.
- v28.439 COGS: Airtable email becomes a CONFIG setting; CA Propack column removed.
- v28.452 DEMAND ▸ Scenario ▸ Sales Planning lists any in-scope SKU with stock or inbound, so Phase Out / Last Season stock shows (flagged Discontinued / Rec. clearance). Read-only.

**CLIENT / commissions**
- v28.442 Agent rules (CLIENT ▸ Config) + Commissions ▸ Unassigned tab (paid wholesale orders with no agent, "could be <agent>"). Rules stored in app_settings; no migration.
- v28.444 Creating the commission Xero bill marks the run paid; run rows show the Fulfil order (or "not in Fulfil").
- v28.445 to v28.451 Paid history rebuilt as a PO-style grid (agent tabs, pills, search, per-currency totals, Month summary drawer); set CLIENT filters go dark; Monthly run opens on last month.
- v28.463 Portal preview is its own CLIENT tab (deep link `#/client/portal/<client>/<user>`), Config tabs deep link, CLIENT level 3 in the left rail, set dropdowns stay dark on focus.

**Client portal (image galleries)**
- v28.441 ImageBank galleries (needs the two env vars). Default gallery list in CLIENT ▸ Config ▸ Image galleries, per-client override on the client's Access tab.
- v28.464 "Image gallery" is its own top-menu item, shown only to clients approved for it: feature `view_images` is now OFF by default (no live client has it stored, so nobody sees galleries until switched on per client).
- v28.465 Select images / Select all (up to 100) / Download selected (sequential, same per-image route; no zip).

**PRODUCT**
- v28.455 Reports ▸ Sample costs (from SUPPLY sample request charges + courier bills, £ at CONFIG fx rates, freight split by product weight).
- v28.456 Reports ▸ Approval stats (sample versions, approved, samples / days to approve, hit rate, moving to bulk, reasons).
- v28.457 Reject reasons: "Add new" under the ticks; fixed: the review data now returns saved reject reasons (they showed unticked and a re-save could drop them).
- v28.458, v28.466 Size & variants: barcode download modal from a small ⤓ beside each barcode.
- v28.459 Product report PDF: no raw HTML in colour names, own print colours, no browser header/footer.
- v28.460 Sample (development) requests Draft → Sent (migration 383). Portal sees Sent only (list, ownership, accept, pickers, inbox); Sent posts a supplier-scoped note = in-app notification.
- v28.461, v28.462 "Create sample versions" wording.

## Smoke checks after deploy
1. `/api/version` = v28.466.
2. PRODUCT ▸ Sampling: the 2 Lixin requests show an orange Draft pill. Look only: don't set one to Sent as a test, it notifies Lixin on the portal (Libby will send them when ready).
3. PRODUCT ▸ Reports: Sample costs and Approval stats load (empty is expected: live has no sample charges or sample versions yet).
4. CLIENT ▸ Portal preview: preview a client; with `view_images` on for that client, "Image gallery" shows and lists the shared gallery (Highlights, 50 images); without it, no menu item.
5. CLIENT ▸ Commissions ▸ Paid history and Unassigned load.
6. REPORTS ▸ Stock Availability drawer shows the three inbound columns and Colourway.
