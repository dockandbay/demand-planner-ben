# HORIZON supplier portal deep dive (07-Oct-26)

Base: review-fixes-2026-10-05 @ 630d1a48 (v28.184). Live = v28.183.1.
Method: one sandbox server (port 8163, USE_TXN_POOLER=1), two sandbox-only test sessions (XR Textile, Lixin; deleted afterwards), GET probes with cold / warm / 304 timings plus /api/perf/recent, a jsdom render probe of the real portal page, a code review of all 92 /api/portal/* routes and of portal.html / portal-view.js / hz-health.js, and read-only live queries (Supabase MCP).
Sandbox note: the sandbox has no PO archive cutoff (app_settings.po_archive_before_prod is blank; live = 50), so sandbox payloads are larger than live. Live figures are given where it matters.

One fix shipped in this run: **v28.185 invoice / packing list 500** (see H1).

---

## 1. Measurements (sandbox, XR Textile, the largest supplier)

Sandbox DB round trip is ~320 ms, so "1 query" is about 320 ms here. Live on Vercel is faster per query but has pool max 4.

| Screen | Endpoint(s) | Cold | Warm | 304 | Queries (cold) | Payload raw / gzip |
|---|---|---|---|---|---|---|
| Shell | GET /portal | 18 ms | | no-store | 0 | 98 KB / 33 KB |
| Shell | /portal-view.js | | | revalidates every load | | 495 KB / 134 KB |
| Shell | /hz-theme.css | | | no-cache | | 117 KB, served uncompressed |
| Session | /api/portal/me | 941 ms | 11 ms | 1 ms | 3 serial | 0.1 KB |
| All ORDERS / FINANCE / SAMPLES / PRODUCT tabs | /api/portal/bootstrap | **4,122 ms** | 1 ms | 1 ms | **24 (13.4 s summed DB time)** | **1,854 KB / 123 KB** |
| Shipment Plan tab | shipment-notes/:ref x N (9 here) + shipment-notes-read POST x 3 | 650 ms each, in parallel | same | 403 for 1 shipment | 2 each | small |
| PO detail | po-pallets/:po, shipment-charges/:ref | 630 ms | 630 ms | 630 ms (no cache) | 2 | small |
| PO PDF | po/:po/pdf | 786 ms | 637 ms | up to 2,978 ms | | 3 KB |
| PO invoice | invoice/po/:po | **500 (fixed v28.185)** | | | | |
| Price list | price-list, price-list/log | 1,600 ms (jsdom 2,571 ms) | 2 ms | 1 ms | 5 serial | 94 KB / 9 KB |
| Profile / onboarding | onboarding | **2,257 ms** | **2,218 ms** | **2,290 ms** | **7 serial, never cached** | 2.5 KB |
| Quality docs | quality-docs | 326 ms | 318 ms | 319 ms | 1 | small |
| Specs | spec-file/:id | 1,642 ms | 1,020 ms | 623 ms | | 54 KB |
| Inbox / Recent | unread-messages, recent-activity | 324 to 332 ms | same | same | 1 | small |
| Product pickers | product-skus, product-open-samples | 323 to 335 ms | same | same | 1 | 54 KB / 0.7 KB |

What is in the bootstrap (sandbox, 672 POs of which 641 COMPLETE): pos 1,126 KB (70 fields per PO, 51% of all fields null or empty), lb (lines) 309 KB, payments 195 KB (1,351 rows), supSkus 169 KB (731 rows), deposits 28 KB, shipment plan 20 KB.
Live with cutoff 50: XR Textile still gets 187 POs (159 of them complete), Lixin 156 (112 complete). Payments and supSkus are not reduced by the archive cutoff at all.

Shared cache rebuild cost behind a cold bootstrap: portal:pos 2.2 s, portal:lines 2.0 s, sec:shipment-plan 1.5 s, the per-supplier pb: build 2.5 to 3.7 s.

Client (jsdom, warm server cache): boot to first render ~1.1 s. The boot waterfall is parallel (bootstrap + /me + portal-view.js together). Tab switches from cached data render in 4 to 177 ms (jsdom). The Payments tab builds **12,009 DOM nodes** (1,351 rows, no paging). A stale boot fetches the full bootstrap twice (second ?fresh=1 took 1.55 s and repaints). No JS errors.

---

## 2. Findings (ranked)

Effort: S = under half a day, M = 1 to 2 days, L = more. "Changes" = whether the fix changes data or behaviour.

### CRITICAL

**C1. Any supplier on a shared shipment can download the master supplier's PO files, including invoices (confirmed on live).**
- Evidence: server.mjs:24498 `/api/portal/attachment/:id` allows a file when `portalOwnsShipmentRef(req, r.po)`. That check (server.mjs:25381) passes for every supplier with a PO whose shipment_ref is the master PO number, and portal_attachments.po holds PO numbers and shipment refs in one column. Live (read-only): 12 attachments on 4 master POs (categories invoice, document, labels, pallet_details, idn_pallet_label) are reachable by 5 other portal suppliers. Attachment ids are sequential, so they can be enumerated.
- Also: POST /api/portal/timeline-attachment with kind shipment and ref = the master PO drops a file into the master supplier's PO Documents list.
- Impact: cross-supplier disclosure of invoices and pricing.
- Fix: in the attachment route accept the shipment check only for category 'timeline' (or add a ref_kind column), and record and check supplier_id on upload. Effort S. Changes behaviour (blocks access), no data change.

**C2. The portal calls staff-only endpoints.**
- Evidence: portal.html:109 `attachImgBase:'/api/supply/portal-attachment/'`, `productSwatchBase:'/api/product/swatch/'`; portal-view.js:2253 `/api/product/doc/`; portal-view.js:3133 POST `/api/supply/dtc-shipment`. The gate (server.mjs:1135) only exempts /api/portal/*, so with PLANNER_KEY set these return 401 for suppliers. The handlers have no session or ownership check (server.mjs:13563 reads any attachment by id; 12715 writes DTC details for any PO).
- Impact: either note images, product files, swatches and the Direct to Client "save shipment details" are broken for suppliers, or (if Diviyaj's prod login gate lets them through) any supplier can read any attachment and write DTC details on any PO. I could not probe live (the read was blocked by the permission policy); **Diviyaj to confirm which on prod.**
- Fix: portal-scoped twins under /api/portal/* with portalAuth and ownership; point the portal EP map at them. Effort M. Changes behaviour.

### HIGH

**H1. Invoice and packing list downloads return 500 (FIXED in v28.185, commit below).**
- Evidence: lib/invoice.mjs:7 resolves `./templates/invoice-packing-template.xlsx` relative to lib/, but the 21-Sep repo tidy left the file in /templates. Sandbox: GET /api/portal/invoice/po/:po returned 500 "File not found: file:///.../lib/templates/...". /templates is also not in vercel.json includeFiles.
- Impact: every portal and admin commercial invoice / packing list download fails since 21-Sep (if prod mirrors this layout). The error also leaks the server file path to the supplier.
- Fix done: moved the template to lib/templates/ (covered by includeFiles lib/**). Sandbox now returns 200 xlsx. Diviyaj: confirm the file lands at lib/templates/ in prod.

**H2. Cold bootstrap is heavy and can starve the prod DB pool.**
- Evidence: 4.1 s cold, 24 queries, 13.4 s summed DB time (many in parallel). On Vercel (pool max 4) one cold portal load can hold every connection for several seconds, which fits the 31 "db connect timeout" events on live (no portal traffic was in that window, so this is a risk, not the observed cause). Payload 1.85 MB raw on sandbox; on live still mostly completed POs plus untrimmed payments and SKU lists.
- Impact: slow first load on phones (parse of ~1 MB+ JSON), and pool pressure for everyone when a supplier logs in on a cold instance.
- Fix: (a) send open POs in full and completed POs as a slim row (po, status, dates, totals) with detail on expand; (b) strip null/empty fields server-side; (c) payments last 12 months plus "load more"; (d) supSkus lazily (only the order-plan add-line picker uses it); (e) cap the bootstrap build to 2 concurrent queries on Vercel. Effort M. Behaviour: UI unchanged if done carefully; no data change.

**H3. Shipment ownership check disagrees with the Shipment Plan.**
- Evidence: the plan includes shipments where the supplier is the master (consolidator) even when its own PO has no shipment_ref (server.mjs:7252); ownership (server.mjs:25381, 25373, 25440, 25446) only looks at purchase_orders.shipment_ref. Sandbox: XR Textile sees PO-53AUXR1 and IS129 in its plan but gets 403 "not your shipment" on notes, charges and updates. Live: 1 shipment affected now (PO-55EUWK3, Weierken).
- Impact: the consolidator cannot read or post shipment messages, add charges or set tracking for a shipment it is shown.
- Fix: one helper used by all shipment routes: own a PO on it OR own its master PO (shipments.master_po or po = ref). Effort S. Behaviour change (grants access that the UI already implies). Do it together with C1 so file access stays narrow.

**H4. "Remove" on a PO document is a phantom delete.**
- Evidence: portal-view.js:3164 posts to `EP.docRemove`, which is not in the portal EP map (portal.html:96-112) and has no server route. With the gate on, the POST gets the HTML key page (200), postJSON treats it as success and the file vanishes from the UI only.
- Impact: supplier believes a wrong invoice is gone; Dock & Bay still sees it; it returns on reload.
- Fix: add /api/portal/doc-remove (own PO, draft or rejected only) or hide the button; make postJSON treat non-JSON responses as errors. Effort S. Behaviour change.

**H5. Buttons stay disabled after a failed save.**
- Evidence: postJSON calls without an error callback at portal-view.js:2717, 3035, 3110, 3117 (production status select keeps the unsaved value), 3123, 3152, 2551.
- Impact: red toast then a dead button; the only recovery is a refresh, and the status select shows a value that was not saved.
- Fix: pass onErr to re-enable and roll back. Effort S. Behaviour only.

**H6. Competing suppliers on the same product-dev item can act on each other's samples, notes and files (latent).**
- Evidence: portalOwnsProductSample (server.mjs:11257) checks the item, not the request; createProductSample accepts any request_id of the item (11644); supplier product notes are inserted without supplier_id (25129); product-item docs and components.req_suppliers are not scoped. Live today: 0 items have requests from more than one supplier, so no current exposure.
- Fix: request-level ownership, supplier_id on notes, scope docs and strip req_suppliers. Effort M. Behaviour change.

**H7. Portal health capture: the pipeline works, but most portal slowness is invisible.**
- Why live shows no portal events: the live health log starts 06-Oct 17:11 UTC (first v28.183 event) and the last portal session was created 07:50 UTC, so there has simply been no portal traffic since the deploy (night in China). On sandbox the full path works: client page_view rows (source portal) and server slow_request / server_error rows for /api/portal/* were all written.
- Gaps found:
  - Boot slow_view stops when "Loading…" is replaced after /me; portal-view.js download and the bootstrap are not timed (.pp-skel has no data-hz-loading).
  - Chinese mode: "加载中…" never matches the Latin /Loading/ test, so slow_view never fires.
  - Tab renders: ppSetHash renders before hashchange, so tab render cost is never timed; the portal never calls hzHealthMetric.
  - api_failure ignores 4xx (401 session expired, 403 "not your shipment" as in H3).
  - dead_click is staff-only (SRC==='staff', no portal selectors).
  - Login page: the capture endpoint requires portalAuth, so pre-login errors are dropped.
  - Server rows have no user or supplier, so a slow portal request cannot be tied to a supplier.
  - portal_sessions has no last_seen, so "is anyone using it" cannot be answered.
  - Error toasts (ppNotice) and swallowed catches are not recorded.
- Fix: data-hz-loading on .pp-skel, add 加载中 to the loading test, time renderPP via hzHealthMetric, record 4xx and ppNotice errors as a portal kind, enable dead_click for #pp-secs / #pp-tabs, an unauthenticated rate-limited capture endpoint for the login page, add supplier name to server rows for /api/portal/*, add last_seen_at to portal_sessions (migration). Effort M. No data change (migration adds a column).

**H8. ISO dates shown to suppliers (house rule).**
- Evidence: about 20 renders of raw 'YYYY-MM-DD HH24:MI' or YYYY-MM-DD: note timelines (portal-view.js:1286, 1738, 1877, 2078, 2474), submitted / reviewed / uploaded dates (1304, 1313, 1319, 2255), DTC dates (1394, 1446), dev_accepted_at (2186), samples (855, 857, 2340), recent activity (2514), quality docs (2622), portal.html:195-196. Optimistic notes are stamped in UTC (2713, 2719, 3144).
- Fix: one fmtDT helper (dd-mmm-yy hh:mm, local time). Effort S. Display only.

**H9. Currency shown as "$" for every supplier; CNY missing.**
- Evidence: hard-coded "$" on PO and finance amounts (portal-view.js:1182 to 1640, 3008-3067); price list symbol map has no CNY / RMB / HKD (portal.html:243); payments round to whole units in one tab and 2 dp in another; unit costs entered to 4 dp are shown to 2 dp.
- Fix: one fmtMoney(value, currency, dp) using the PO or supplier currency, 4 dp for unit costs. Effort M. Display only.

### MEDIUM

**M1. Profile / onboarding GET takes 2.2 s every time.** 7 sequential queries, never cached (server.mjs:24557 and onbSupplierProfile). Run them in parallel (about 0.7 s on sandbox, 1 round trip on live). It also only reads supplierIds[0], so a contact linked to two suppliers only sees the first. Effort S. No behaviour change.

**M2. Shipment Plan tab: N+1 requests and writes on view.** Opening the tab fires one shipment-notes GET per shipment (9 here, 2 queries each) and auto-POSTs shipment-notes-read. Each of those POSTs is classed 'portal-shipnote', which invalidates every supplier's cached bootstrap on the instance (`_pbNames({})` = all pb: keys, server.mjs:1311), and marks the notes read for every supplier on the shipment. Fix: unread counts already ride in the bootstrap; load notes only when a shipment is opened, mark read only for the opened shipment, and invalidate only the caller's pb: entry. Effort S. Behaviour change (read marking).

**M3. Double bootstrap on a stale boot.** The first load can come back with X-HZ-Stale and the page refetches ?fresh=1 (1.55 s, second 1.85 MB parse and full repaint). Every portal write also calls reload() which refetches the whole bootstrap. Smaller payload (H2) shrinks this; a per-PO patch endpoint would remove it. Effort M.

**M4. Static assets.** hz-theme.css (117 KB, render-blocking) and hz-health.js are served uncompressed on the sandbox and the CSS is no-cache; portal-view.js (495 KB) is versioned (?v=) but served no-cache, must-revalidate, so every load costs a round trip; /portal (no-store) embeds the same 13 KB base64 favicon twice. Vercel's edge may compress, so check the live response headers. Fix: gzip + immutable for ?v= assets, one favicon. Effort S.

**M5. Magic link and session.**
- The link is consumed by a plain GET (server.mjs:24237): corporate mail scanners can burn it (supplier sees "expired") or receive the session.
- Tokens live 7 days.
- Check-then-update is not atomic, so two parallel clicks mint two sessions.
- request-link responds slower for known emails (awaits the insert and the email), which allows enumeration by timing.
- No sign-out in the UI.
- Fix: an interstitial "Sign in" button that POSTs the token; an atomic UPDATE ... WHERE used_at IS NULL RETURNING; a 24 to 72 h link life; send the email without awaiting; restore Sign out. Effort S/M. Behaviour change.

**M6. Raw error text returned to suppliers.** Most routes reply `{error: e.message}` (pg messages, file paths as in H1); several ownership checks run outside try. Fix: a generic message plus a reference id, and log500. Effort S.

**M7. Partial writes.** /api/portal/submit writes notes, emails and shipment rows before validating production_status (can then return 400); the cache hook only invalidates on status < 400, so those writes stay invisible until the TTL. sample-update and onboarding/submit are similar. Fix: validate first, wrap in a transaction. Effort M.

**M8. Arbitrary attachment_id on notes.** sample-note, shipment-note, note and submit store any attachment_id; the timelines then return that file's name and mime, so file names can be enumerated. Fix: require the attachment to belong to the same thread. Effort S.

**M9. Shared shipment cross-supplier actions.** Any supplier on a shipment can set it to Shipping, which moves every PO aboard (other suppliers' too) to SHIPPING; shipment-note-delete can delete another supplier's latest message; shipment-notes-read clears unread for all. Fix: Shipping only for the master supplier; delete only own notes. Effort S.

**M10. Expired session shows "[object Object]".** portal.html:127 throws {auth:true}; portal-view.js:3179 prints it. Any /me failure (even a blip) shows the login screen. Fix: detect auth and show "Your session expired, request a new link"; login only on 401. Effort S.

**M11. Phones.** Pinch-zoom is disabled (portal.html:6 maximum-scale=1, user-scalable=no) while 112 font sizes are under 12 px (some 8 px badges). The price-list propose modal has no max-height or scroll, so Submit can be unreachable with the keyboard open; the tracking log has min-width 300 px inside padding. Fix: allow zoom, 11 px floor, scrollable modals. Effort S.

**M12. Chinese translation coverage ~58%.** About 224 of ~527 static strings have no PP_ZH key (e.g. "Step 1, Confirm order plan", "Submit for approval", "Remove"); the whole Profile tab, 40 of 43 toasts and all confirms are English. Effort M.

**M13. Auto-update reload can drop typed text.** portal.html:342-347 reloads when hidden or idle 90 s, and every 30 min. Skip when a field in #pv is dirty or focused. Effort S.

**M14. "Today" computed in UTC** (toISOString().slice(0,10) at 11 places): overdue and due flags are a day behind for UTC+8 suppliers between 00:00 and 08:00. Effort S.

**M15. Comma decimals become 0** (portal-view.js:3007), and "1.234,50" is read as 1.2345 in the invoice amount (3152). Effort S.

**M16. Payments tab renders all 1,351 rows (12,009 DOM nodes).** Page or group by year. Effort S.

### LOW
- L1. Number validation: charges, line cost, cross-dock qty and additional cost accept negative / fractional / Infinity values.
- L2. "Own" portal writes only mark this instance's cache; other Vercel instances and other users of the same supplier wait for the TTL; spec-approve and portal price-list submit do not bust admin caches.
- L3. supSkus uses `supplier_multiple_all ILIKE '%name%'` (server.mjs:24850): a supplier whose name is inside another's would get that supplier's SKUs and EANs. No such names on live today.
- L4. Session nits: Secure flag only when x-forwarded-proto is exactly "https"; logout cookie has no Secure; tokens stored in plain text; 60 s auth memo keeps a revoked session alive briefly.
- L5. Unvalidated references in onboarding (cert DocId, bankDocId) and quality-doc (po, prod_no, batch_id).
- L6. Storage-backed files: content type comes from the client's signed PUT; sign-upload trusts the claimed size.
- L7. escalate and note routes have no rate limit (internal email spam).
- L8. onbNextRef uses max(id)+1 (race on concurrent submits).
- L9. Shipment Plan shows co-loaded suppliers' FUTURE PO numbers.
- L10. Supplier-confusing copy: version tooltip "tell Ben this", "M" for MANAGE, "working SKU", sandbox toasts naming CONFIG, "ERP" / "Horizon" in Profile.
- L11. ?anon=1 / ?as= is sticky in localStorage for anyone who opens such a link.
- L12. 31 r.json() calls without r.ok checks, 12 silent catches; request-link always says "on its way" even on a 500.
- L13. Productions tab adds a document click listener on every render (leak); product search re-renders on every keystroke; in Chinese mode a body-wide MutationObserver re-walks the DOM after every keystroke.
- L14. Server rate limits are in-memory per instance and keyed on the first X-Forwarded-For hop.

### Regressions vs v28.176 (Xero contacts), v28.183 (bill links), v28.184 (mobile nav)
None found. The portal has its own nav (#pp-secs / #pp-tabs) and does not depend on #hz-drawer or the left rail; the v28.184 hz-health changes are staff-only. The portal bootstrap selects no Xero or bill fields and no bill links render in portal code.

### Verified correctly scoped
No SQL injection found. No cross-supplier leak through the v28.175 shared caches (pb: keys come only from the psid session; shared bases are filtered and copied per supplier; ETag/304 keyed per build). The res.end write hook covers DELETE. No x-*-email header trust anywhere in the portal. Magic tokens have 192 bits of entropy; the cookie is HttpOnly + SameSite=Lax; file serving uses an allow-listed mime, nosniff and CSP sandbox.

---

## 3. Quick wins (each S, low risk)
1. C1: restrict the shipment branch of /api/portal/attachment/:id to timeline files.
2. H3 + M9: one shipment ownership helper (own PO aboard or own master PO); Shipping only by the master supplier.
3. M1: parallelise the onboarding GET (2.2 s to ~0.7 s on sandbox).
4. M2: load shipment notes on open only; scope read-marking and cache invalidation to the caller.
5. H4: hide the phantom "remove" (or add the route); postJSON treats non-JSON as an error.
6. H5 + M10: re-enable buttons on error; proper "session expired" message.
7. H8: fmtDT for every portal date.
8. H7 part 1: data-hz-loading on .pp-skel, match 加载中, hzHealthMetric around renderPP, record 4xx.
9. M4: gzip + immutable cache for ?v= assets; drop the duplicate favicon.
10. M11: allow pinch-zoom.

## 4. Proposed plan
- **v28.185 (done):** invoice template path fix.
- **v28.186 security:** C1, C2 (portal twins of the four staff endpoints), H3, M8, M9, M5 atomic token use + interstitial. Diviyaj to confirm the prod gate behaviour for C2 first.
- **v28.187 health capture:** H7 (incl. portal_sessions.last_seen_at migration and supplier name on server rows).
- **v28.188 speed:** M1, M2, M4, then H2 (slim completed POs, trim payments / SKUs, null stripping, capped build concurrency on Vercel), M3, M16. Snapshot payload sizes before and after.
- **v28.189 supplier UX:** H4, H5, H8, H9, M10, M11, M13, M14, M15, L10.
- **v28.190:** H6 (product-dev request-level ownership), M6, M7, M12 translations, remaining lows.

## 5. Housekeeping from this run
- Test sessions created and deleted (2 rows in sandbox planner.portal_sessions); 8 sandbox health rows from the test user deleted; a few server-side slow_request rows for /api/portal/* from 07-Oct remain in the sandbox log (cannot be told apart from Ben's server).
- Side effect: the jsdom probe opened the Shipment Plan as XR Textile, which auto-marked internal shipment notes read on 3 sandbox shipments (this is M2 in action). Sandbox only.
- Server on 8163 stopped; no probes left running; nothing pushed; package.json and CHANGES.md untouched.
