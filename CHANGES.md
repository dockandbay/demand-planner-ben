# CHANGES

Version log for the demand planner (bump on every change so we can revert).
Deploy notes for Diviyaj: new env vars, migrations, and files to wire in.

## v26.007 - Fix timeline dropdown styling after top-bar move

- The messages dropdown lives on <body> now, so its item styles (.tl-item/.tl-po/.tl-body/.tl-acts/.mut/.tiny)
  lost their #supply-root scope and rendered unstyled. Re-scoped those rules to #tl-drop. Restores PO link colour,
  message spacing, muted supplier/date text, and the Mark-read/Snooze button styling.

## v26.006 - Messages bell → top bar next to SA; SA + Messages (with counts) in the mobile menu

- The ✉ timeline-messages bell moved out of the SUPPLY sub-nav into the top bar (#view-tabs-row) next to the SA
  button, so unread supplier notes are visible on EVERY view (DEMAND/SUPPLY/BUY/FBA/REPORTS), not just SUPPLY.
  Dropdown is now a fixed element on <body>. Clicking a message from a non-SUPPLY view reveals SUPPLY ▸ Purchase
  Orders first, then opens that PO's Timeline drawer.
- Mobile hamburger menu gains a "Quick actions" section with Stock Availability (SA) and Messages — and the unread
  Messages count now shows on mobile (a red badge), which was previously desktop-only. Count stays live via a
  bridge (window.HZ_BELL / window.__tlOnCount).

## v26.005 - DEMAND ▸ Key Accts: inline key-account forecast spreadsheet

- New DEMAND sub-tab "Key Accts" (next to Plan). Spreadsheet-style inline editor for key_account_forecasts:
  Client, SKU (type-to-search dropdown of the product master, name shown), Country/warehouse (UK/US/EU/AU/CA 3PL),
  Ship date, Qty, per-row delete, and + Add row. Edits save straight to the DB on change/blur via the v26.004
  endpoints (skips fully-blank rows). Replaces the n8n Airtable->Supabase key-accounts sync with direct entry.

## v26.004 - Key Accounts Forecast backend: id PK (mig 125) + CRUD endpoints

- Migration 125: key_account_forecasts gains an `id` identity PK + `source` (default 'manual').
- Server: GET /api/supply/ka-forecasts (list), POST /api/supply/ka-forecast (upsert by id),
  POST /api/supply/ka-forecast/:id/delete. Feeds the v26.005 DEMAND ▸ Key Accts editor.

## v26.003 - Mobile: long-press PO number to copy

- On the purchase-order grid, a long-press (500ms) on the PO number copies the PO reference to the clipboard
  with a small "Copied" tooltip + haptic vibrate. Tooltip hint now reads "double-click (or long-press on mobile)".

## v26.002 - Timeline notifications bell + egress: widen built-data cache to 5min

- New top-bar messages bell (SUPPLY): unread SUPPLIER PO-timeline notes with an unread counter + pop-down drawer
  (newest first). Each item shows the PO (click -> opens PO > Timeline drawer), Mark read, and Snooze (7-day, via
  supply_action_state key tlnote|<id>). Server: timeline-notifications case; mark-read/snooze reuse existing endpoints.
- Egress: DATA_TTL_MS 20s -> 5min. Each cold page build pulls ~2-3MB from Supabase; a wider window sharply cuts DB
  egress on the (long-running) sandbox server. Invalidated on forecast saves so edits still show immediately.

## v26.001 - Version scheme: v26 minors are zero-padded 3-digit (v26.001, v26.002, …)

- APP_VERSION derive now formats as v{major}.{minor padded to 3}: package.json 26.1.0 -> "v26.001". v25 display
  unchanged (25.676 -> v25.676). npm version minor advances 26.1.0->26.2.0 -> v26.002.

## v26.0 - Release: packaged for deploy (live baseline v25.569 -> v26.0)

- Version bump to v26.0 and full deploy package: DEPLOY_2026-07-19_v26.md. Run migrations 120-123 on live
  (120-123 confirmed NOT yet applied; up to 119 is live). Artifact ships empty data placeholders the harness
  injects (server.mjs replaceGlobal) — must verify populated after deploy. n8n: weather + preorder/ka Airtable->
  Supabase flows; MQ Print (Sherry) rename in Cin7/Fulfil. exceljs already live; no new env vars.

## v25.676 - Buy plan: cover + FBA-min + supplier from authoritative products fields; stub BP_DATA (artifact 2.4->0.77MB)

- buildPROD_CONST now reads from planner.products (was: FBA/3PL cover re-derived from category_target_cover BY
  CATEGORY — which fell to a default for the 101 null-category SKUs; and fm from a stale baked map that had gone
  empty since v25.673). Now: t3/tf <- target_cover_weeks_{co}_{3pl,fba} (default 4); fm <- fba_transfer_min_units_{co}
  (default 2); supp <- main_supplier_final. Cover cells can be text ("15, 15") -> take the first number.
- Verified vs LIVE: 0 change for the 615 categorised SKUs (products field == category-derived); FIXES the ~101
  null-category SKUs (e.g. DOGTWL now gets FBA cover 12, not a default). Removed dead BAKED_FM.
- With cover/fm now authoritative from PROD_CONST, the baked BP_DATA (1.7MB) is fully redundant (the buildLiveBpOverlay
  already rebuilds products from live SKUM+PROD_CONST at load) -> stubbed it. Artifact 5.07MB (pre-refactor) -> 0.77MB.
- Diviyaj: server.mjs (harness) change. NEEDS Ben buy-plan verification. MOQ still 100% null in products -> defaults to 1.

## v25.675 - Cache built page data (20s TTL): repeat loads ~1050ms -> ~150ms

- The page build (~12 Supabase queries) is ~85% of a serve (~870ms) and reran on EVERY load. Now the built data
  globals are cached for 20s (DATA only, NOT the HTML — so DEV live-editing still works: the file is re-read +
  re-injected each request). Repeat loads within the window skip the build: ~1050ms -> ~150ms (~7x).
- Invalidated on forecast saves (/api/save-forecasts, /api/save-sku-forecasts) so an edit shows on next load.
  Source data is ETL-fed (frozen per open tab), so 20s staleness is safe. Server-only change (harness).

## v25.674 - gzip the main HTML response (6.3MB -> ~1MB over the wire)

- The gzip middleware only wrapped res.json (API payloads); the main DEMAND page (~6.3MB of live-injected data)
  was served UNCOMPRESSED. Now gzip it when the client accepts — 6.35MB -> 1.06MB over the wire (~6x), data
  verified intact. Big initial-load win on the sandbox/tunnel; Vercel may also compress at the edge (harmless).
- Diviyaj: server.mjs change (harness). No behaviour change; content is identical after decode.

## v25.673 - Slim artifact: stub server-injected data blobs (5.06MB -> 2.42MB)

- The artifact baked ~2.6MB of stale data literals (_SKU_RAW 1.7MB, FC_OUTPUTS 0.5MB, DATA 0.28MB, PROD_CONST
  0.16MB, FC_CURRENT/CATS_META/SUBS_META/BI_RULES/_SA_EXTRA/SAVED_INPUTS) that the server OVERWRITES with live
  Supabase data on every serve (replaceGlobal). Stubbed each to {} — the source file is now half the size.
- Behaviour-transparent: verified the served page still carries live data (_SKU_RAW 2MB, DATA 178KB, etc.),
  and the artifact is only ever served through the injecting route (never raw). No client change; serve time
  unchanged (it was always DB-build-bound), source read is smaller. SUB_SHARES + BP_DATA left (not server-fed).

## v25.672 - Refactor #9: config showSub() dispatch map (was a 16-branch if/else)

- Replaced the ~530-line `if/else if(CONFIG_SUB===...)` chain in renderConfig.showSub() with a `SUBS{}` dispatch
  map (one named handler per sub-tab). Handler bodies byte-identical (scripted split on the 16 markers) — pure
  structural change; verified by syntax + 16 keys + config endpoints 200. No behaviour change.

## v25.671 - Portal: expanded PO row highlights light yellow (row-open), matching the main supply grid.

## v25.670 - Portal: app-version tag in the header (diagnostic to confirm which build a device is running).

## v25.669 - Portal: supplier-action confirm box wraps (text block + button on its own line, box-sizing:border-box);
removed the "search overrides status" hint and the "N of M purchase orders" count line.

## v25.668 - Portal mobile: Timeline caps every element to one width (border-box/min-width:0/max-width); removed
the "Status" label before the PO status pills (main portal + admin preview).

## v25.663–667 - Portal mobile layout: sub-tab panels scroll within the viewport (663); expanded detail panel
flush-left, single `<td colspan=20>` (664); Timeline fits one screen width via overflow-x:hidden + flex min-width:0
+ border-box (665–667). CSS-only.

## v25.662 - Portal "Amount due" = order value − amount actually paid (unpaid deposit stays owed)

- The portal's Amount due used balance_owing, which nets off the SCHEDULED start-deposit + completion even when
  they haven't been paid — so a PO with nothing paid showed less than its full value (e.g. PO-57UKLX1: due showed
  £64,698 of a £129,396 order). Paid + due didn't reconcile to the total.
- Now Amount due = order value (value_used) − amount actually paid, where "paid" = milestones with a recorded paid
  date (same definition the "Amount paid" card already used). So paid + due always equals the order value, and a
  scheduled-but-unpaid deposit/completion stays owed. Fixed in both the PO grid and the Payments-tab summary.
- Portal-only (client-side, portal-view.js). No change to planner.v_po_finance / admin / cash flow — admin's
  "Balance" remains the balance milestone as before.
- Note: a deposit drawn from a pool but with no recorded paid date counts as still-due under this rule.

## v25.661 - Portal order-plan Est. cost now falls back to product cost (parity with admin)

- The supplier portal showed a blank Est. cost on lines with no negotiated `cost_price` (e.g. PO-57UKLX1),
  even though the PO value now uses the product cost fallback. Fixed: the portal bootstrap line query returns
  `sku_cost` (product `cost_<supplier-code>` → general `cost`, the same expression admin's PO-detail uses),
  and portal-view.js falls back to it for Est. cost in both the plan table and the CSV export.
- Est. cost precedence now matches admin exactly: line `cost_price` ▸ product `cost_<code>` ▸ product `cost`.
- No schema change; no migration.

## v25.660 - Refactor: shared PO-finance view (admin + portal read one source; drift eliminated)

- New Postgres view **planner.v_po_finance** (migration 123) = the canonical per-PO payment/date core
  (the admin base..calc4 chain, own dates, no supplier filter, no mastering).
- Admin purchase-orders/cashflow query now reads the view + layers shipment MASTERING, landed-cost, ERP and
  action flags on top. Verified byte-identical to the old query across all 1371 sandbox POs / every column.
- Supplier portal (POS_SQL_PORTAL) now selects a supplier-scoped subset of the SAME view instead of a
  second hand-maintained copy of the CTE. This retires the admin↔portal drift class permanently.
- Fixes 308 previously-wrong portal payment values (top supplier alone): the portal now applies the
  deposit-ref draw cap and the richer line-value (confirmed portal costs + product cost_<code> fallback)
  that admin always used. Portal payment columns now match admin exactly (0 drift, proven via SQL).
- ⚠️ **Migration 123 is a hard dependency** — the app 500s on purchase-orders/portal until the view exists.
  No app-logic change beyond the rewire; supersedes the earlier surgical portal patch (that logic now lives
  in the shared view). See DEPLOY_2026-07-19_po-finance-view.md.

## v25.659 - Refactor: Suppliers + Manufacturing BOM onto cardEditor() (all 4 config editors unified)

- Suppliers migrated onto the shared cardEditor(); the live payment %-sum indicator is a wireEdit hook.
  Behaviour identical (same endpoints, no delete, prompt-based +Supplier create).
- Manufacturing BOM migrated too — it's structurally different (grouped byP data, __new__ create mode,
  a custom multi-op diff save, whole-bundle delete, searchable SKU picker). Added one small generic
  capability to the helper: an optional `onSave(id,api)` override so an editor can drive its own save
  while still reusing the list<->edit toggle, caret-preserving search and back/cancel wiring. mfgbom's
  doSave/reload now take the current id + api instead of an outer editParent var. Behaviour identical.
- All four config editors (Key accounts, Consignees, Suppliers, Manufacturing BOM) now share one helper.
- No server/API/schema change; no migration. Internal-only.

## v25.658 - Refactor: shared cardEditor() helper (Key accounts + Consignees migrated)

- New module-level cardEditor(cfg) in supply/inject.html: owns the identical config-editor plumbing
  (caret-preserving search, list<->edit toggle, collect->POST->patch->back, edit/back/cancel/edit-button
  wiring). Bespoke bits (cardHtml/editHtml, endpoints, coercion, +new/delete, add-then-edit) are cfg callbacks.
- Migrated Key accounts and Consignees onto it — behaviour identical (same endpoints, pack_* boolean
  coercion on KA local-row patch, consignee add-then-edit, delete). Local row arrays now mutated in place
  (splice) so the helper's captured reference stays in sync.
- No server/API/schema change; no migration. Internal-only dedup.
- Not yet migrated (deferred for a click-test checkpoint): Suppliers (live %-sum) and Manufacturing BOM
  (dynamic component rows + SKU picker) still use their own draw loops.

## v25.657 - Preorders/key-account off Airtable MCP -> Supabase (all Airtable MCP now removed)

- New GET /api/preorders-ka (reads planner.preorders + planner.key_account_forecasts). The BUY plan
  refresh now fetches Supabase instead of Airtable via mcpListRecords; PKA_TABLES + mcpListRecords removed.
  This removes the LAST Airtable-MCP call from the app.
- Tables already held the current Airtable data (count-matched 119/66, same source); loaded_at refreshed.
- Diviyaj: enact the Airtable->Supabase n8n flow for these two tables (see DEPLOY note; last loaded 2026-06-10).

## v25.656 - Weather off Airtable MCP -> Supabase

- New planner.weather_cache table (migration 122) + GET /api/weather endpoint. The DEMAND Weather
  panel reads Supabase instead of calling Airtable via the Anthropic MCP; the Airtable-MCP call was
  removed from fetchWeatherCacheViaMCP. Sandbox seeded with a London row (smoke test).
- Diviyaj: run migration 122 on live + REPOINT the weather refresh job (GAS -> Airtable) to write
  planner.weather_cache. See DEPLOY_2026-07-19_weather-supabase.md. Also confirm preorder/key-account n8n
  before we drop their client Airtable-MCP refresh (left in place for now).

## v25.655 - Auto Forecast / Key Arrivals: guard against partial API responses (bug fix)

- draw() now bails to an error message if the response is missing months/payments/assumptions
  (AF) or arrivals (Key Arrivals), instead of throwing and leaving the panel on "Loading…".

## v25.654 - Fix supplier-portal payment figures to match admin (bug fix)

- The portal (POS_SQL_PORTAL) showed different payment figures than the admin view. Three fixes:
  1. **completion_calc** now has the `cp>0` guard + `LEAST(...)` cap, mirroring admin — kills the
     phantom completion for suppliers on start/balance-only terms (e.g. 30/70). Footprint:
     **111 POs** had a phantom completion; all now 0.
  2. **balance_owing** now adds `+ coalesce(credit_amount,0)` (admin already did) — the portal was
     understating the balance when a PO carried an invoice credit/charge.
  3. **shipment join** now uses `coalesce(nullif(shipment_ref,''), po)` so a completion/date override
     on a self-master shipment reaches the PO (matches admin).
- Residual (edge case): the portal still uses a term-based start deposit rather than admin's
  deposit-pool-availability-aware draw; a PO whose deposit pool ran short can differ slightly. The
  durable fix is the shared v_po_finance view (refactor #11) — this patch fixes the material bug now.

## v25.653 - Remove old Financial Model routes, portal loader, reportPlaceholder

- Removed the old **/api/scenario/fin-model** (GET/POST/import) — FY×category×quarter model on
  planner.financial_model, superseded by fin-overlay. **Code archived** in
  archive/financial-model-routes.mjs.txt for revert; the table was NOT dropped.
  (The SCENARIO ▸ Financial Forecast Model tab is unaffected — it uses fin-overlay.)
- Removed dead **/api/portal/data** (old supplier loader; portal uses /api/portal/bootstrap).
- Removed dead **reportPlaceholder** (artifact) + dead **.fm-catrow** CSS (inject) + fixed a
  stale renderFinModel comment.
- Diviyaj note: planner.financial_model is now unused (kept for revert) — drop later if desired.

## v25.652 - Full dead-code sweep (server + both apps)

- **server.mjs**: removed 4 superseded routes (freight-rate/:id, freight-rate-create,
  duty-rate/:id, duty-rate-create — the UI uses freight-upsert/freight-pallets/duty-upsert)
  + their orphaned auth-allowlist entries. Zero unused module-level functions found.
- **artifact_v16.7.html** (DEMAND): removed 16 unused functions (weather/alert legacy —
  fetchForecast, fetchHistory, aggregateMonthly, loadAlertState, saveAlertState; plus
  safeSend, showCsvOverlay, calcBaseline, applyRec, skuForecast, skuFcv, sumRT,
  togglePlanActive, daMedian, afK, and a duplicate fmtDate) + 2 phantom ID refs
  (set-leadtime/set-trfflag).
- **supply/inject.html** (SUPPLY): removed 15 unused functions (payRegister+bindRunRecalc,
  unassignedTable+bindAssign, poErpRecon, openDepProdPick, shipExReason, shipExShort,
  cfSummaryRows, depSel, clabel, isAU, ctryCount, lblDims, lblRRP) + dead .pp-tbl CSS.
- All confirmed dead (grep-verified single occurrence / superseded). No behaviour change.

## Pending Ben's OK (looked dead, not yet removed):
##  - server: /api/scenario/fin-model (GET/POST/import) — old Financial Model; SCENARIO now uses fin-overlay.
##  - server: /api/portal/data — portal now bootstraps via /api/portal/bootstrap.
##  - artifact: reportPlaceholder (maybe an intended stub); inject: .fm-catrow CSS.

## v25.651 - Prune confirmed dead code (DEMAND app)

- Removed the phantom `#help-btn` relocation refs (3 spots) — the element never existed
  (real help button is `#ctx-help-btn`, untouched).
- Removed the empty `#buy-tools` tool-bar placeholder + its swap logic (`_isBuyLike`, `_bt`)
  — never populated. No behaviour change.
- (The old DEMAND menu-bar items — AI Insights / Help / Weather / Insights — are NOT dead;
  they're already integrated into the current nav + DEMAND ▸ Actions sub-tabs.)

## v25.650 - Consolidate CSV / export helpers (refactor #6)

- Single CSV-string builder (`rowsToCsvStr`), one download impl (`downloadCsvStr`), one
  email-POST impl (`postEmailCsv`) shared by the cash-flow report buttons and the config
  Report-exports panel.
- Removed the duplicated escaper in `csv()` (now delegates to rowsToCsvStr+downloadCsvStr),
  the duplicate Blob-download in the config CSV button, and the duplicated email-POST in
  `cfEmail` + `rx-email-btn`. Behaviour unchanged; ~30 lines of duplication gone.
- (`afPayCsvStr` already used rowsToCsvStr; `copyRows`/TSV left as its own single-purpose helper.)

## v25.649 - Version single-sourced from package.json (refactor quick-win)

- APP_VERSION now derives from package.json's "version" at boot (v25.649 ← 25.649.0),
  instead of a hand-edited literal. One fewer file to bump per change.
- Added `npm run bump` (npm version minor --no-git-tag-version). Bump flow is now:
  `npm run bump` + a CHANGES.md entry.

## v25.648 - GBP rate configurable in CONFIG ▸ General settings (refactor quick-win)

- The USD→GBP rate (was hardcoded 1.34 in two client files: CF_GBP / AF_GBP) is now a
  single setting in CONFIG ▸ General settings → Finance (app_settings.usd_gbp_rate).
- Server injects the configured rate into both clients' CF_GBP/AF_GBP at serve time
  (same mechanism as APP_VERSION); fallback 1.34 if unset/invalid. Takes effect on reload.

## v25.647 - Mobile drawer: Config sub-nav shows on first tap (poll until ready)

- The drawer rebuilt after a fixed 60ms to reveal a view's sub-nav; CONFIG loads its nav
  via a fetch, so the sub-items were missing on the first tap. Now it polls (up to ~1.4s)
  until the sub-nav has rendered, so Supply/Config/Scenario/Demand sub-items appear
  immediately on the first click.

## v25.646 - Revert config-page mobile nav to horizontal strip

- Reverted the v25.641 config-page mobile vertical-drawer nav (the real fix was the
  hamburger drawer in v25.645). CONFIG nav is back to the horizontal-scroll strip on
  mobile. Supply chain stays second in the bar (that reorder is kept).

## v25.645 - Mobile drawer: nest sub-nav under its parent view (not at the bottom)

- The mobile hamburger drawer now renders each active view's sub-nav (Supply sections /
  Demand tabs / Scenario / Config) indented directly under its parent button, instead of
  as a separate "Supply sections" block at the bottom of the drawer.

## v25.644 - Consolidation panel: PO numbers open the popout PO drawer

- In the "Analyse consolidation" panel, the anchor + candidate PO numbers are now clickable
  and open the reusable PO popout drawer (raised above the modal so it's visible). Clicking
  the PO text doesn't toggle its row checkbox.

## v25.643 - Cash flow report: Email button next to CSV (All transactions + Stock arrivals)

- Added a ✉ Email button beside the ⬇ CSV download for both All transactions and Stock
  arrivals. Emails the same CSV to the recipient saved in CONFIG ▸ Exports & uploads
  (export_email_cf_transactions / _cf_arrivals) via /api/export/email-csv. If no recipient
  is set (or Resend isn't configured), it says so.

## v25.642 - What's Next: collapsible sections + shipping-method chip

- Each major grouping (Overdue / Completing / Shipping / Arriving) now has a clickable
  header with a ▸/▾ chevron to expand/minimise it. State persists across filter changes.
- New shipping-method chip on every row (and shipment group): ✈ Air / 🚢 Sea / FOB.
  Server adds `mode` to /upcoming: fob (pickup / mode=fob) ▸ air (shipment/flexport air) ▸
  sea (default).

## v25.641 - Config nav: Supply chain 2nd + mobile drawer with nested sub-options

- "Supply chain" now sits second in the CONFIG nav (next to General settings).
- On mobile the CONFIG nav is a vertical drawer: main options stack full-width, and the
  Supply chain level-3 options nest indented directly under it (with a left guide line)
  instead of a horizontal-scroll strip. Desktop unchanged (level-3 strip below the bar).

## v25.640 - Config ▸ Consignees: card list + grouped edit form

- Rebuilt like Suppliers / Key accounts: a card list (country + consignee / notify-party
  / port of discharge) with search + "+ Add country", and a full-width edit form
  (Consignee, Notify party side-by-side + Port of discharge). Add prompts for a country
  code and opens straight into its edit form. Same endpoints.

## v25.639 - Suppliers: restore TE-ID field label (only GRS removed)

- Reverted the TE-ID field back to its original label/help; the card IDs line no longer
  shows TE-ID. Net effect vs v25.634: only the GRS reg number was removed.

## v25.638 - Suppliers: drop grs_number (GRS reg no. = TE-ID)

- The GRS registration number is the same value as the Textile Exchange ID, so the
  separate grs_number field is removed. The TE-ID field is relabelled "GRS reg. no. /
  Textile Exchange ID (TE-ID)" and prints under the company name on the tax invoice
  (unchanged behaviour). Card IDs line now shows TE-ID instead of GRS.
- Migration 120 no longer adds grs_number (only fulfil_id); column dropped from sandbox.
  Reverts the grs_number parts of v25.634.

## v25.637 - Manufacturing BOM: card UX + searchable SKU dropdown

- Rebuilt to match Suppliers / Key accounts: a **card list** (one card per bundle, shows
  parent + name, components with names and ×qty) + a **grouped edit form** (parent SKU,
  component rows with add/remove, Save/Cancel/Back). New-bundle flow via the same form.
- SKU inputs are now a proper **searchable dropdown** (filters on SKU + product name as
  you type; click to pick) instead of a native datalist. Entries validated against the
  product list. Save diffs the component set (upsert changed/new, delete removed).

## v25.636 - Manufacturing BOM: SKUs picked from the product list (not free text)

- The new-component, new-bundle-parent and first-component inputs are now datalist
  pickers sourced from /api/supply/skus (autocomplete on SKU + product name).
- Adding a component or creating a bundle now validates the SKU exists in the product
  list and blocks free-text entries that don't match.

## v25.635 - Export port: supplier field + shipment override (auto-inherits)

- New supplier field **Export port** (default port of loading) in CONFIG ▸ Suppliers.
- Shipment detail now has an **Export port** field: effective = shipment override ▸ master
  PO supplier's export port (auto-updates with the supplier). Blank override = inherit;
  type to override. Text field, saves like the Ship-to / Branch overrides.
- MIGRATION 121_export_port.sql: adds suppliers.export_port + shipments.export_port.
  Applied to sandbox; **Diviyaj: run 121 on live.**

## v25.634 - Suppliers: invoice company/address/phone + GRS no. + Cin7/Fulfil IDs editable

- Surfaced supplier tax-invoice fields in CONFIG ▸ Suppliers (new "Company & address" +
  "Compliance & ERP IDs" sections): Full company name, Phone, Address 1/2, City, State,
  Postcode, GRS registration no. (the "contract number"), Textile Exchange ID, Incoterm,
  Cin7 member ID, and a new Fulfil ERP ID. Cards show a compact IDs line.
- invoice.mjs now prints the GRS registration number in the seller block (company name,
  address, phone were already wired but had no UI to enter them).
- MIGRATION 120_supplier_grs_fulfil.sql: adds suppliers.grs_number + suppliers.fulfil_id
  (business_name/address_1-2/city/state/postcode/phone/te_id/incoterm/cin7_member_id
  already existed). Applied to sandbox; **Diviyaj: run 120 on live.**
- Suppliers list endpoint + update whitelist extended to these columns.

## v25.633 - Config ▸ Suppliers: card list + grouped edit form (matches Key accounts)

- Replaced the 13-column inline-edit table with a card list (name + code, kind badge,
  currency/country, terms & lead summary, contact) and a grouped full-width edit form
  (Identity · Payment terms · Contact). Live "Deposit+Completion+Balance = X%" check.
- Same endpoints/fields; removed unused SUP_COLS/supTbl.

## v25.632 - What's Next: horizontal scroll + sticky PO column (mobile)

- The forward-calendar tables now size to content and scroll horizontally instead of
  squishing into one screen width (new .up-tbl: width:max-content;min-width:100%).
- Column 1 is now **PO / shipment** (moved from Date) and is **sticky** while scrolling —
  header + rows, with the shipment rows keeping their tint. Applies to Overdue and all
  three sections (Completing / Shipping / Arriving).

## v25.631 - Config ▸ Key accounts: card list + grouped edit form (UX rebuild)

- Replaced the unusable 15-column inline-edit table with a proper layout:
  - **List**: responsive cards showing name, delivery address, client requirements and
    green chips for the enabled packing/labelling options (• = has notes).
  - **Edit**: a full-width grouped form (Account · Delivery & requirements · Packing &
    labelling) with each packing option as a toggle + notes box, plus pallet/other notes.
    Save/Cancel, in-place list update on save, no horizontal scroll.
- Same endpoints/fields; removed the now-unused KA_COLS.

## v25.630 - PO detail: consolidate sub-tabs (Landed→Payments, Docs→Master Data)

- LANDED COSTS moved under the **PAYMENTS** tab (below the payment schedule, divider
  between). Landed-cost exceptions now fold into the PAYMENTS badge count.
- DOCUMENTS moved under **MASTER DATA**, tab renamed **MASTER DATA & DOCS**.
- PO detail now has 7 tabs (was 9): Payments · Dates · Client/FBA · Order Plan ·
  Shipments · Master Data & Docs · Timeline. Old #.../landed|documents/<PO> deep links
  degrade gracefully to the default tab.

## v25.629 - PO detail: remove "Linked Records" sub-tab

- Dropped the LINKED RECORDS tab from the PO detail panel (drawer + grid) — it added no
  useful info. Removed the unused linkedH/blk helper. Old #.../linked/<PO> deep links
  degrade gracefully to the default tab.

## v25.628 - What's Next: PO popout drawer (reusable)

- In the What's Next report, clicking a **PO** now opens a right-side **popout drawer**
  with the full PO detail (all tabs: Payments, Dates, Order Plan, Shipments, Landed
  Costs, Timeline, …) instead of navigating to the PO grid page. Clicking a **shipment**
  row still opens the existing shipment drawer.
- New reusable `openPODrawer(po, tab)` mirrors `openShipDrawer`: reuses loadPoDetail into
  #podet-DRAWER, ensures poBy is loaded, routes in-place edit refreshes to the drawer,
  and "Full page ↗" jumps to the full PO page. Drawer CSS generalised to cover both.
- Only the What's Next links were switched (per Ben — other PO links change case by case).

## v25.627 - Auto Forecast: coded transaction reference + group by supplier

- Transaction-detail Reference is now a code: **FC-<country>-<order-month-num>-<supplier
  code>** (e.g. FC-US-01-XR). Supplier code from planner.suppliers.code (falls back to a
  3-letter name slug if a supplier has no code).
- Forecast now aggregates **1 row per supplier**, not per subcategory:
  - "Units to order" table is a single Supplier column (summed across subcats + markets).
  - Transaction rows are deduped per supplier: one row per reference|type|month
    (amounts summed).

## v25.626 - Auto Forecast: split Copy into Copy (USD) / Copy (GBP)

- Payments plan toolbar now has separate **Copy (USD)** and **Copy (GBP)** buttons
  (each copies its single-currency matrix), matching the CSV (USD)/(GBP) buttons.
- Removed the unused combined-matrix helper.

## v25.625 - Config: rename slug to export-uploads + link report exports to source pages

- CONFIG "Exports & uploads" tab slug renamed `forecast-export` → `export-uploads`
  (URL is now #/config/export-uploads). Legacy #/config/forecast-export auto-redirects.
- In "Report exports — email", each report name is now a hyperlink (↗) to its source
  page: Cash Flow Transactions + Stock Arrivals → #/supply/reports/cashflow;
  Auto Forecast → #/reports/af.
- Pure UI/routing change — no behaviour, endpoint, or schema change.

## v25.624 - Config: "Supply chain" as a level-2 tab that expands a level-3 row

- Replaced the v25.622 grouped-heading approach. CONFIG now has a normal level-2 nav
  (General settings · Portal users · Portal · Key accounts · Products · Exports & uploads
  · Permissions · **Supply chain**), matching every other page.
- Clicking **Supply chain** activates it and reveals an indented level-3 strip:
  Import duty · Freight rates · Import tax · Suppliers · Branches · Consignees ·
  Batches · Productions · Manufacturing BOM (opens on Import duty by default).
- Deep links to a member tab (e.g. #/config/duty) auto-expand the level-3 row.
- Pure UI/nav change — no behaviour, endpoint, or schema change.

## v25.623 - Auto Forecast: GBP payments CSV + transaction-level detail export

- Payments plan toolbar now has **CSV (USD)** and **CSV (GBP)** for the summary matrix
  (was a single combined file), plus a new **TRANSACTIONS** group with Copy + CSV.
- Transaction detail = one row per projected payment leg with columns: Reference
  (subcategory · order month), Type (Starting deposit / Completion deposit / Balance
  payment / Freight + duty), Amount USD, Date (1st of month), Country, Supplier,
  Month (mmm-yy), Amount GBP (USD ÷ 1.34).
- Server `/api/scenario/auto-forecast` now returns a `transactions[]` array (same
  window/>0 filter as the summary). No schema change.

## v25.622 - Config: "Supply chain" grouped heading in the sub-nav

- The CONFIG sub-nav now groups the operational config tabs under a non-clickable
  **Supply chain** heading chip: Import duty, Freight rates, Import tax, Suppliers,
  Branches, Consignees, Batches, Productions, Manufacturing BOM.
- Top-level tabs (General settings, Portal users, Portal, Key accounts, Products,
  Exports & uploads, and admin-only Permissions) stay ungrouped before it.
- Pure UI reorder — no behaviour, endpoint, or schema change. Heading is a styled
  `.cs-group` span (left divider + uppercase label); it is not a `.rtab` so it's
  inert on click.

## v25.621 - Config: "Exports & uploads" tab + email-export buttons for 3 reports

- Renamed the config tab "Forecast export" → "Exports & uploads".
- Added a "Report exports — email" section with 3 rows (Cash Flow Transactions, Cash Flow Stock Arrivals,
  Auto Forecast payments plan): a saved recipient email + ⬇ CSV + ✉ Email per report. The client builds the
  CSV (same format as the on-screen export) and POSTs it to /api/export/email-csv; the server emails it to the
  saved recipient (server-controlled). Recipients stored in app_settings (export_email_<key>).
- Extracted the cash-flow CSV row builders (cfTxRows/cfArrRows) to module scope so the Cash Flow page and the
  config share them.

Files: server.mjs, supply/inject.html. No migrations, no new env vars (uses existing RESEND setup).

## v25.620 - Auto Forecast report: month-window fix + whole numbers + GBP + CSV/copy

REPORTS ▸ Auto Forecast (artifact):
- Fixed the payments-plan window: it started at a hardcoded 2026-06 even after we'd passed it. Now starts at
  the CURRENT month (clamped to the forecast data range), end = last forecast month. (server auto-forecast.)
- Payments plan shown in whole numbers (was "174k").
- Added a matching "Payments plan — cash out by month (GBP)" summary (USD ÷ 1.34).
- Added Copy + CSV export of the payments plan (USD + GBP, whole numbers).

Files: server.mjs, artifact_v16.7.html. No migrations, no new env vars.

## v25.619 - Cash Flow: real cents on USD amounts (not rounded to whole dollars)

Cashflow line amounts + stock-arrivals amounts now keep 2dp (were Math.round to integer), so the all-
transactions and stock-arrivals exports show real cents instead of .00. On-screen money() already renders 2dp,
so the display picks up the cents too (no width change).

Files: server.mjs. No migrations, no new env vars.

## v25.618 - Cash Flow: Stock arrivals export, GBP rate 1.34, column tidy-ups

- New "Stock arrivals" download (copy + CSV): PO Number, Amount (USD) = goods + import duty per PO (FOB → no
  duty), Delivery Date = the PO's COMPLETED (check-in) date (actual or forecast), Direct to Client? ("Direct"
  when branch is Direct to Client / JLEW / NEXT), Amount (GBP). Server returns a per-PO `arrivals` dataset.
- GBP conversion rate changed 1.3 → **1.34** (all-transactions Amount GBP + Stock arrivals Amount (GBP)).
- All-transactions export: moved "Amount GBP" + "UK Deposit Ref" to the END (after Month).
- Removed the "Monthly paid/unpaid" copy/CSV buttons.

Files: server.mjs, supply/inject.html. No migrations, no new env vars.

## v25.617 - Cash Flow export: add Amount GBP + UK Deposit Ref columns

Two more columns on the "all transactions" export: "Amount GBP" (USD ÷ 1.3, 2dp) next to Amount_USD, and
"UK Deposit Ref" (the deposit's production number) next to Production Deposit. Server cashflow lines now carry
uk_deposit_ref (deposit reference → deposits.prod_no).

Files: server.mjs, supply/inject.html. No migrations, no new env vars.

## v25.616 - Cash Flow: reworked "all transactions" export + fast tooltips

Cash Flow report:
- "Download all transactions" (copy + CSV) columns reordered/reformatted: Reference, Type, Amount_USD (2dp),
  Date, Paid Status (TRUE/FALSE), Market, Production Deposit (the payment's deposit reference), Class, Supplier,
  Direct to Client? (TRUE when the PO branch is Direct to Client / UK B2B JLEW / UK B2B NEXT), Month (mmm-yy).
- Server cashflow lines now carry deposit_ref + branch (from the referenced PO) to feed the two new columns.
- All buttons/icons on the page now use the fast 120ms tooltip (bindFastTips).

Files: server.mjs, supply/inject.html. No migrations, no new env vars.

## v25.615 - Payments Due sub-tab: overdue-payments counter badge

The PURCHASE ORDERS ▸ Payments Due sub-menu tab now shows a red counter badge = the number of OVERDUE payments
(unpaid, past due date — PO completion/balance milestones + deposits/other). Prefetched in the background so
it shows from any sub-tab, refreshes when the tab renders, and recomputes after a payment edit. New
paymentsDueOverdueCount() mirrors the tab's r.overdue rule; navBadge() gained an optional noun for the tooltip.

Files: supply/inject.html. No migrations, no new env vars.

## v25.614 - Payments Report: Xero copy icon + copy-to-email icon

Replaced the ⧉ (copy Xero bill details) glyph with a small Xero logo mark (blue circle + white x), and the
⎘ (copy payment summary) glyph with an envelope "copy to email" icon (purple). Behaviour unchanged.

Files: supply/inject.html. No migrations, no new env vars.

## v25.613 - Payments Report: fast (120ms) tooltips on the icons

The copy / Xero / payment-summary icons on PURCHASE ORDERS ▸ Payments Report used the native title (slow ~1s).
New reusable bindFastTips(container) intercepts any element's title on hover and shows the shared 120ms
noteTip instead — delegated on the report container, so it covers the re-rendered rows too.

Files: supply/inject.html. No migrations, no new env vars.

## v25.612 - PO value / landed Goods use the estimated supplier cost when lines have no price

`value_used` (the PO order value, = landed-cost "Goods", and drives payments) was Σ(qty × coalesce(final_cost,
cost_price)) — so it was 0 when a PO's lines had no negotiated price (e.g. PO-1631902). Extended the fallback
to the products cost for the PO's supplier (cost_<code>, then general cost), matching the order-plan Est. cost.
So the goods value / landed cost / payment plan now reflect the estimate instead of 0. POs with a real
cost_price are unchanged (actual price still wins).

Files: server.mjs. No migrations, no new env vars.

## v25.611 - Fix ship_mode resolution (v25.610 returned blank for all POs)

The `ship_mode` subquery added in v25.610 resolved to blank for every PO, so FOB-mode shipments still weren't
detected. Replaced it with the already-joined `sh_mode` column (from the self-master shipment join) — now
resolves correctly (e.g. PO-1701758 → fob; live distribution fob/air/sea, not all-blank). So a FOB-mode
shipment now properly zeroes freight/duty/tax in the landed-cost panel + cash flow.

Files: server.mjs. No migrations, no new env vars.

## v25.610 - FOB has no landed costs (freight / duty / tax = 0), incl. FOB-mode shipments

Clarified rule: anything FOB carries no landed costs. Previously `isFOBdest` treated a PO as FOB only when it
had NO shipment (+ manufacturing/non-market destination) — so a PO on a **FOB-mode shipment** (e.g.
PO-1731753: Direct to Client / AU / shipment mode = fob) still computed freight + import duty + tax. Now:
- PO query returns `ship_mode`; `isFOBdest` treats a FOB-mode shipment as FOB → Landed cost panel shows
  freight / duty / tax = 0 (goods only).
- Cash flow skips freight/duty/tax posts for FOB shipments too (mirrors the landed-cost view).

Files: server.mjs, supply/inject.html. No migrations, no new env vars.

## v25.609 - Order Plan: Est. cost defaults to products supplier cost when a line has no price

Added `cost` / `cost_lx` / `cost_xr` to planner.products (migration 119) and loaded them from Airtable
sku_child (SKU_CHILD-WORKING) into sandbox + live (all 1693 SKUs; cost/cost_lx/cost_xr populated). Convention:
a supplier's price column is `cost_<lowercased suppliers.code>` (Lixin LX→cost_lx, XR Textile XR→cost_xr), so
new suppliers auto-map. The per-PO ORDER PLAN Est. cost now falls back to that column (else the general `cost`)
when the line has no cost_price — server returns per-line `sku_cost`; client uses it as the display fallback.
Also loaded size_long into live (partial; the rest + ongoing sync is n8n's job — see deploy note).

⚠ Diviyaj: n8n products sync must map sku_child → products for cost, cost_lx, cost_xr AND size_long going
forward, and must handle CSV/Excel quoting on size_long (the `"` inch mark comes through Excel as doubled `""`).

Files: server.mjs, supply/inject.html, migrations/119_product_supplier_costs.sql. No new env vars.

## v25.608 - Order Plan edit: paste SKU/qty block from Excel / Sheets

In PURCHASE ORDERS ▸ Plan ▸ Order Plan, "✎ Edit qty / add SKU" mode now has a "⧉ Paste SKU,Qty" button. It
opens a textarea to paste two columns (SKU, Qty) from Excel / Google Sheets (tab or comma separated). Server
validates each SKU against our list (planner.products ∪ sku_labels, case-insensitive): unknown SKUs are
skipped, SKUs already on the PO have their qty overridden, new valid SKUs are added (proposed). qty 0 removes
a line. A summary alert lists anything skipped (unknown SKU / missing qty).

New endpoint POST /api/supply/po-lines-paste {po, rows:[{sku,qty}]}. Tested (override + add + skip-unknown +
skip-no-qty verified in sandbox).

Files: server.mjs, supply/inject.html. No migrations, no new env vars.

## v25.607 - New feature: Merge PO's (PURCHASE ORDERS ▸ Import/Export)

Added a "⛙ Merge PO's" button in the PO grid's Import/Export bar. It opens a modal to pick PO 1 (keep) and
PO 2 (merge from): PO 2's SKU lines fold into PO 1 — matching SKUs have their quantities added, new SKUs are
copied over (with cost so the line stays valued). Nothing else (supplier / dates / client / crossdock / …) is
merged. PO 2 is then permanently deleted — guarded by a confirmation tick box. The modal previews how many
SKUs will be summed vs copied before you commit.

New endpoint POST /api/supply/po/merge {into, from, confirm} (transactional; deletes PO 2 across the same
tables as the PO delete). Tested end-to-end in sandbox (sum + copy + delete verified).

Files: server.mjs, supply/inject.html. No migrations, no new env vars.

## v25.606 - Status pills multi-select + shared between PO grid and Order Plan grid

- PURCHASE ORDERS grid status pills are now **multi-select** — e.g. Production + Shipping can both be on
  (state.f is a set; none selected = all). Toggling a pill adds/removes that status group.
- The ORDER PLAN grid now uses the **same grouped status options** (shared STATUS_PILLS / stGroup):
  Production (PRODUCTION + READY TO SHIP), Shipping (SHIPPING + DELIVERED), Future. (It was raw statuses before.)
  COMPLETE stays off the Order Plan pills — an all-SKUs pivot over 1000+ complete POs would explode; complete
  POs still surface via a PO search there. Both grids default to Production.

Files: supply/inject.html. No migrations, no new env vars.

## v25.605 - Crossdock picker: client name in brackets on the "applied to" note

Each "applied to PO-xxx <status>" note in the crossdock dropdown now appends the client name in brackets when
the PO is direct-to-client — e.g. "applied to PO-1693118 production (Until)". FBA/non-client POs show no brackets.

Files: supply/inject.html. No migrations, no new env vars.

## v25.604 - Crossdock picker: single natural-sorted list (no "used first")

The crossdock dropdown no longer hoists on-hand/applied SKUs to the top in a separate group — it's now ONE
flat list. SKUs are sorted numerically/naturally (CROSSDOCK-1, -2, -9, -10, -11 — not 1,10,11,2…), and each
SKU still carries its on-hand / applied notes inline.

Files: supply/inject.html. No migrations, no new env vars.

## v25.603 - Crossdock picker: descriptive per-SKU notes (on-hand + applied POs with status)

The country-aware crossdock dropdown now shows readable notes under each SKU instead of terse "on hand N ·
applied N": "N on hand in <CO> 3PL" and one "applied to PO-xxxxxx <status>" line per PO the crossdock is
applied to (status = shipping / production / … from poBy). SKUs stay in alphabetical order.

Files: supply/inject.html. No migrations, no new env vars.

## v25.602 - Purchase Orders status pills: Production / Shipping split, "All" removed

Reworked the PO grid status pills:
- Split "In progress" into **Production** (PRODUCTION + READY TO SHIP + any other in-progress) and **Shipping**
  (SHIPPING + DELIVERED). Future and Complete unchanged.
- Removed the **All** pill — the pills are now toggleable; clicking the active pill deselects it, and no pill
  selected = all statuses.
- Default status filter moved from In progress → **Production** (all 4 state seeds).
- Mobile: compacted the status pills (smaller padding + tighter gaps) so they fit on a single row.

Files: supply/inject.html. No migrations, no new env vars.

## v25.601 - "Includes crossdock" filter now respects the status sub-filter (defaults to In progress)

Changed v25.600 so the "Includes crossdock" exception option falls through to the normal status filter instead
of spanning all statuses — so it defaults to In progress (switch the status filter to All/Complete to see the rest).

Files: supply/inject.html. No migrations, no new env vars.

## v25.600 - Purchase Orders grid: "Includes crossdock" exception filter

Added an "Includes crossdock (N)" option to the ⚠ All exceptions… dropdown on the PURCHASE ORDERS grid —
shows every PO that carries crossdock SKUs (crossdock_skus set), spanning all statuses and ignoring the
12-month recent-complete trim (most crossdock POs are complete). It's a filter only, not a red action item
(handled via excMatch, not PO_ACTCOND, so it doesn't add badges).

Files: supply/inject.html. No migrations, no new env vars.

## v25.599 - Crossdock: country-aware add dropdown + OT destination exception (Client/FBA tab)

PURCHASE ORDERS ▸ Plan ▸ Client/FBA:
- **Country-aware crossdock picker.** The "＋ add crossdock SKU" dropdown now looks up the CROSSDOCK report for
  the PO's ship-to country's 3PL (UK→uk_3pl, US→us_3pl, EU→eu_3pl, AU→au_3pl) and lists the crossdock SKUs
  actually sitting there — on-hand (from inventory) or applied to open POs — with the qty, above the full
  crossdock SKU list. CA has no 3PL in the report, so it shows the full list with a note.
- **OT warnings.** If the PO's ship-to resolves to OT (DIRECT / other non-market): (a) a red exception banner
  under the Crossdock SKUs row, and (b) a warning at the top of the add-dropdown — both say to set the Ship-to
  to the real delivery country (UK/US/EU/AU/CA), not the generic "Other".

Files: supply/inject.html. No migrations, no new env vars. (Reads the existing /api/supply/crossdock-report.)

## v25.598 - Order Plan: PO search overrides pills + supplier-change badge hover/tooltip

- A PO text search now OVERRIDES the action-item pills — clicking a PO in the "⚠ N supplier changes awaiting
  approval" banner (or typing a PO) shows that PO's full lines regardless of which risk pill is active. The
  banner-link click also clears the pills' highlighted state so the UI matches the (unfiltered) view.
- The supplier-submitted change badge (amber "qty ✓") now behaves like the other exception badges: AMBER by
  default, GREEN on hover (previews the confirmed state), with the fast 120ms data-tip tooltip instead of the
  slow native title. Tooltip now reads "Supplier submitted change: qty X (plan currently Y) … click to confirm".

Files: supply/inject.html. No migrations, no new env vars.

## v25.597 - Order Plan: supplier/discontinued risk tooltips match country risk (fast + same format)

Supplier-risk and discontinued badges used the native `title` (slow ~1s, different look). Switched them to
the fast custom `data-tip` tooltip (120ms, `bindOpTips`) — same format as country risk. Also dropped the
redundant native `title` on the partial badge (it already had a data-tip). All four grid risk badges now show
the same fast, consistent hover explanation.

Files: supply/inject.html. No migrations, no new env vars.

## v25.596 - Order Plan: unapproved risk badges are red alerts, hover previews green approve

Unified all four unapproved risk badges (partial / supplier / discontinued / country) onto one shared
`.oprisk-badge` style: **RED "letter ⚠" alert by default**, and on hover it previews the approved state —
**GREEN "letter ✓"** — so it's obvious clicking will approve. Previously the partial badge was a green tick
even when unapproved (looked already-approved). Applied in both the SUPPLY ▸ Order Plan grid and the per-PO
Order Plan panel. Approved badges are unchanged (green "letter✓" with the hover-✕ to undo).

Files: supply/inject.html. No migrations, no new env vars.

## v25.595 - Order Plan: risk-badge hover feedback + removed "Update ERP" pill

- Unapproved supplier / discontinued / country risk badges (s ⚠ / d ⚠ / c ⚠) now show a clear hover state
  (darker red fill + ring) so it's obvious they're clickable — previously only the partial badge reacted.
- Removed the "⚠ Update ERP" action-item pill from the ORDER PLAN filter bar (plus its OP_EXCL entry, click
  binding and count). ERP deviations are still surfaced/uploadable from the per-PO Order Plan panel.

Files: supply/inject.html. No migrations, no new env vars.

## v25.594 - Order Plan: fix hover-✕ to undo an approved partial/supplier/disc/country risk

The undo ✕ overlay never appeared on hover: the badge button carried an inline `display:none`, which beats
the stylesheet's `.opappr:hover .opundo{display:flex}` (no !important). Removed the inline `display:none` so
the default-hide comes from CSS and the hover reveal works again — in both the Order Plan grid (opundo) and
the PO panel (oprisk-undo).

Files: supply/inject.html. No migrations, no new env vars.

## v25.593 - SUPPLY ▸ Actions card polish (one-line buttons, green Upload, current status)

- The fix button(s) and the Dismiss / Snooze ▾ lifecycle controls now share one flex-wrap row (same line
  where they fit) instead of stacking on separate lines.
- "⬆ Upload to ERP" is now green (#16a34a) to stand out as the primary/positive action.
- Date conflict "or set status" dropdown pre-selects the PO's current status (parsed from the detail) instead
  of defaulting to blank.

Files: supply/inject.html. No migrations, no new env vars.

## v25.592 - ORDER PLAN xlsx: SIZE falls back to short size when size_long is empty

The SUPPLY ▸ ORDER PLAN report's SIZE column already maps size_long (v25.231). It reads blank on LIVE only
because planner.products.size_long is not populated there (0/2737 rows) — the n8n Airtable sync doesn't
map sku_child.size_long, and the one-off seed (migration 095_seed) was never run on live. This change adds
a graceful fallback (size_long → size_short) so SIZE is never blank.
⚠️ Diviyaj: to get the long description on live, (a) run migrations/095_product_size_long_seed.sql (one-off
backfill) and (b) map Airtable sku_child.size_long → planner.products.size_long in the n8n product sync.

Files: supply/inject.html. No migrations (095 already authored), no new env vars.

## v25.591 - Actions page: single "Snooze ▾" button with 1/3/7-day popup

Replaced the row of Snooze 1d/3d/7d/∞ buttons on #/supply/actions with one "Snooze ▾" button that opens a
popup (1 day / 3 days / 7 days / Indefinitely), mirroring the PO-grid snooze menu. Snoozes now also
attribute to the signed-in user optimistically. Lifecycle POST refactored into a shared actLifeSet().

Files: supply/inject.html. No migrations, no new env vars.

## v25.590 - PO copy-hint tooltip no longer overlaps the action-items tooltip

The "double-click to copy PO reference" native tooltip moved from the whole PO cell onto just the PO text,
so hovering the action-items badge beside it shows only the badge's own tooltip (no overlap).

Files: supply/inject.html. No migrations, no new env vars.

## v25.589 - Snooze labels always attribute the user ("Snoozed by ben@ → …")

The PO-grid + shipment action-item snooze markers (and their popovers/tooltips) now always show who
snoozed — new snzBy() helper falls back to the signed-in user (ME.email) when the stored snoozed_by is
missing (e.g. rows snoozed before attribution was captured). Reads "Snoozed by ben@ → 19-Jul-26".

Files: supply/inject.html. No migrations, no new env vars.

## v25.588 - Shipment drawer date edits silently refresh the POs aboard

Editing a departure/landing/arrival/completion date in the shipment DRAWER (opened from PURCHASE ORDERS)
now silently refreshes each PO aboard — the grid row and any open PO panel pick up the new Ship/Arrival/
Completion dates immediately (shipment dates authoritatively override PO dates). No manual reload.

Files: supply/inject.html. No migrations, no new env vars.

## v25.587 - Shipments: carrier-aware tracking link (not always Flexport)

The shipment tracking ↗ (grid + drawer) now links to the actual carrier: Flexport → Flexport, DHL/UPS/FedEx
→ their tracking pages (using the carrier ref), and shows no link for any other carrier. New carrierTrackUrl()
/ carrierTrackTag() helpers.

Files: supply/inject.html. No migrations, no new env vars.

## v25.586 - Order Plan: undo ✕ overlays the ✓ badge (no column shift)

Reworked the hover-undo so the ✕ sits ON TOP of the p✓ / s✓ / d✓ / c✓ badge (absolute overlay revealed on
hover) instead of appearing beside it — so hovering no longer widens the cell / shifts the column. Grid + PO
panel; shared apprBadge() helper.

Files: supply/inject.html. No migrations, no new env vars.

## v25.585 - PO ▸ Order Plan panel: Exceptions column + CSV download

- Risk flags (p/s/d/c) moved out of the SKU cell into their own **Exceptions** column right after SKU
  (approve / undo work the same there). "—" when a line has none.
- New **⤓ CSV** button downloads the PO's order plan as SKU,Qty (file OrderPlan-<po>.csv).

Files: supply/inject.html. No migrations, no new env vars.

## v25.584 - Order Plan: undo ✕ shows on hover (not a permanent button)

The undo-approval ✕ next to p✓ / s✓ / d✓ / c✓ (grid and PO panel) is now hidden by default and appears only
when you hover the cell / row — less clutter. CSS only; same undo behaviour.

Files: supply/inject.html. No migrations, no new env vars.

## v25.583 - Order Plan: risk pills now span all statuses (count == view)

An action-item risk pill (Unapproved partials / Update ERP / Supplier risk / Discontinued / Country risk)
now shows its lines across ALL active statuses, instead of AND-ing with the status filter. The pill counts
are already computed across statuses, so "Supplier risk (8)" but an empty view happened when those POs
weren't in the selected status (e.g. FUTURE / READY TO SHIP while the default is PRODUCTION). Now count and
view agree. Country/prod/batch/supplier/search filters still apply; the status pills resume when no risk pill
is active.

Files: supply/inject.html. No migrations, no new env vars.

## v25.582 - Order Plan grid: fix blank grid + broken approve; fast country tooltip; single-select pills

- **Fix (regression):** the SUPPLY ▸ Order Plan grid rendered blank / approvals didn't work because `undoX`
  was defined inside `opBuild` but called from the module-level `pivot()` → ReferenceError crashed the render
  (and the approve buttons never bound). Moved `undoX` to module scope. Both symptoms fixed.
- **Country-risk tooltip** now uses the grid's fast `data-tip` (≈120ms hover) instead of the slow native
  `title`, and spells out the reason.
- **Action-item pills are now single-select** (Unapproved partials / Update ERP / Supplier risk / Discontinued
  / Country risk) — clicking one clears the others; click again to turn it off. Focus stays independent.

Files: supply/inject.html. No migrations (118 from v25.580 still applies), no new env vars.

## v25.581 - PO ▸ Order Plan panel: partial / supplier / discontinued / country risk flags

The per-PO Order Plan sub-tab now shows the same risk flags as the SUPPLY ▸ Order Plan grid — a small
badge next to each SKU for each applicable risk: **p** (partial carton), **s** (supplier risk), **d**
(discontinued), **c** (country risk). Unapproved = red badge + click to approve; approved = green ✓ with a
✕ to undo. Uses the shared approve endpoint (field partial/supplier/discontinue/country) + silent panel
refresh. po-detail line query enriched with the approval flags + allowed suppliers + per-country discontinue
dates. **Direct-to-Client POs are excluded from country risk** (a bespoke client order doesn't depend on
retail-market availability) — applied to both the panel and the grid.

Files: server.mjs, supply/inject.html. Migration 118 (from v25.580) still required. No new env vars.

## v25.580 - Order Plan: Country risk approval, persistent approvals + undo, supplier-change PO links

**Country risk** is now a first-class risk on SUPPLY ▸ Order Plan (like partials / supplier risk):
- Pill renamed "⚠ Country risk"; cell shows an approve button (c ⚠) → approved (c✓). Approval writes
  `purchase_order_lines.country_risk_approved` (migration 118) via the existing approve endpoint (field=country).
**Approvals persist in view + undo:** approving a partial / supplier-risk / discontinued / country-risk line no
longer instantly filters it out — it stays visible (per-session, until a page refresh) so you can review/undo,
via a new ✕ next to the p✓ / s✓ / d✓ / c✓ badges (undo posts approved=false and re-opens the exception).
**Supplier-change banner** now lists the actual PO(s) as clickable links that filter the order plan to them
(was just a count with no way to see which PO).

Files: server.mjs, supply/inject.html, migrations/118_po_line_country_risk_approved.sql.
⚠ Migration 118 (adds `country_risk_approved` bool default false) — Diviyaj to run on live.

## v25.579 - Order Plan: flag SKUs produced for a market they aren't released in

New "not released in market" exception on both order plans. A PO line is flagged when the SKU has **no
availability** in the PO's destination market (UK/US/EU/AU/CA) — availability (`v_product_availability`,
`is_available`) is authoritative; launch dates are ignored (they're always populated). Non-standard markets
(OT/DIRECT/blank) are never flagged.
- **PURCHASE ORDERS ▸ Order Plan** (per-PO panel): a red "✗ not in market" badge on each affected SKU + a
  summary banner listing them.
- **SUPPLY ▸ Order Plan** (grid): a red "✗ mkt" marker on the affected cell + a new "✗ Not in market"
  filter pill with a PO count.
Server: `not_avail_market` added to the order-plan and po-detail line queries.

e.g. GIFT-BOX-HOME-CHRYBMB on PO-56AULX2-BUNDLE (AU) — not available in AU → flagged.

Files: server.mjs, supply/inject.html. No migrations, no new env vars.

## v25.578 - Manufacturing tab updates silently after a PO/order-plan edit

`invalidateDerived()` now also clears the `manufacturing` cache (and its nav-badge count), so after editing
a finished-good PO's order-plan quantities the Manufacturing tab recomputes on next view — no hard refresh
needed. (Finished-good qty drives component demand, so it was going stale.)

Files: supply/inject.html. No migrations, no new env vars.

## v25.577 - Timeline: internal notes show the author (ben@), not "Dock & Bay"

Admin PO + shipment timelines now attribute internal notes to the author's shortened email (e.g. ben@)
instead of the generic "Dock & Bay" / "D&B". Two parts: the poster now passes the current user (ME.email)
so the server records who wrote it even when the SSO layer doesn't resolve authUser on that request; and
the display shows shortUser(author_email) for internal notes (falls back to Dock & Bay/D&B when no author
is stored, e.g. older/system notes). Supplier-facing portal still shows "Dock & Bay" (unchanged).

Files: supply/inject.html. No migrations, no new env vars.

## v25.576 - CONFIG: Portal + Portal Users next to General; default to General on menu click

Reordered the CONFIG sub-tabs so **Portal users** and **Portal** sit right after **General settings**.
Clicking the CONFIG top-menu now always lands on **General settings** (was: last-viewed sub-tab); hash
deep-links (e.g. #/config/portal) still open their specific sub-tab.

Files: supply/inject.html. No migrations, no new env vars.

## v25.575 - Portal Users: fix mobile squish (table now scrolls horizontally)

The v25.574 table was still forced to screen width because the global `#supply-root table{width:100%}`
rule out-specificity'd the `.pu-tbl{width:max-content}` style. Re-scoped the Portal Users CSS to
`#supply-root table.pu-tbl` (same pattern as the PO/shipment grids) so width:max-content wins, and added
column min-widths — the table now expands past the screen and scrolls across, with the Email column pinned.

Files: supply/inject.html. No migrations, no new env vars.

## v25.574 - Portal Users page: mobile-friendly rebuild

Rebuilt CONFIG ▸ Portal Users for mobile:
- Table no longer squished — it's a horizontal scroller (`width:max-content`) with a **sticky Email column**
  (col 1) that also holds the row's **Edit / Save / Cancel / Delete** buttons.
- Rows are **read-only until Edit**; only **Supplier / Contact / Access** are editable (email is the fixed
  identity). Save commits all three at once; Cancel reverts.
- **Supplier** now uses the standard **search-dropdown picker** (shpop cell-pick) instead of a native
  datalist combo — same for the "+ Portal user" add row.

Files: supply/inject.html. No migrations, no new env vars.

## v25.573 - Escalation email: deep link to the PO + clearer wording

- The email link for a PO escalation now deep-links to the supplier portal **PO card** (`/portal?po=<ref>`),
  which opens on its **TIMELINE** tab. Portal reads `?po=` on load → opens + filters to that PO. (Shipment/
  sample portal escalations still land on the portal root.)
- Wording now reads "**ben@ has escalated this message on PO <ref>:**" (was "A user has escalated this
  message:"), and the link renders as "Open <ref> →" instead of a raw URL.

⚠ Deep link works when the supplier has an active portal session; if they must log in via magic link first,
the `?po=` may be dropped on the auth redirect (they'll land on the portal root). Non-blocking.

Files: server.mjs, supply/portal-view.js. No migrations, no new env vars.

## v25.572 - Shipment drawer: clickable Flexport reference

The shipment drawer's Carrier ref is an editable field (no link). Added a dedicated **Flexport** field in the
drawer header showing the flex id / carrier ref as a clickable link to app.flexport.com, whenever a Flexport
reference is present.

Files: supply/inject.html. No migrations, no new env vars.

## v25.571 - Add UPS to shipment carrier options

Added "UPS" to the shipment carrier dropdown (carrierSel) and the carrier datalist.

Files: supply/inject.html. No migrations, no new env vars.

## v25.570 - Manufacturing (FOB) POs raise no ERP deviation exceptions

Manufacturing-branch POs are FOB — collected at the factory, not pushed to Cin7 — so they no longer raise
ERP-deviation exceptions. Excluded the Manufacturing branch from: the grid `erp_pending` ⚠ count, the
"Order-plan change pending ERP push" and "PO not in ERP" actions, and the ORDER PLAN ▸ ERP-deviations box.
The Cin7 push button stays available in the ERP tab (you *can* still upload if you want to).

Files: server.mjs, supply/inject.html. No migrations, no new env vars.

## v25.569 - Deposit picker: fresh list, fail-open region, always-available unassign

Fixes a valid AU deposit showing greyed ("✗ ? region") and no way to unassign, both traced to a stale
cached deposit list (country arrived blank) + the region check treating unknown country as non-AU:
- The picker now pulls a **fresh deposit list** each open (`depFull` reset) so country/supplier/paid are current.
- Region block only fires on a **definite** AU-vs-non-AU mismatch with BOTH countries known — a blank/unknown
  country no longer greys a deposit (the server still enforces region/supplier on save).
- **"✕ Unassign deposit"** is now always shown at the top of the picker (was hidden unless the PO's current
  deposit was known), and names the current ref.

Files: supply/inject.html. No migrations, no new env vars.

## v25.568 - Deposits: highlight blank FX / Country cells red

On the deposit register, the FX (Xero FX) and Country cells now show a red background when blank — a quick
visual prompt to fill them. Applies in both the locked and edit views.

Files: supply/inject.html. No migrations, no new env vars.

## v25.567 - Shipment completion override now flows to the PO (self-master + no +7)

Fix: a PO wasn't inheriting a completion override set on its (self-master) shipment — it kept showing the
calculated date. Two causes, both fixed in the purchase-orders date calc:
1. The shipment join was strict (`sh.shipment_ref = po.shipment_ref`); a self-master shipment row keyed by
   the PO ref was missed when the PO's shipment_ref column was blank. Now joins on
   `coalesce(nullif(po.shipment_ref,''), po.po)` so the PO picks up its own self-master shipment. (3 live POs
   were in this state.)
2. An explicit shipment completion override (`shipments.delivery_date` = sh_delivery) now lands on the PO's
   completion EXACTLY — the +7 warehouse check-in is skipped, since the override already represents the
   received date (matches the shipment drawer's "Completion" field). e.g. PO-55AUWK3: completion now 27-Aug
   (was 11-Aug / would've been 3-Sep with +7).

Files: server.mjs. No migrations, no new env vars.

## v25.566 - ASN pallet labels: drop redundant "PO" prefix

The PO line on the ASN label showed "PO PO-55AUWK3" (refs already start with "PO-"). Now shows just the
ref, e.g. "PO-55AUWK3".

Files: asnpdf.mjs. No migrations, no new env vars.

## v25.565 - Shipment: completion-date override now available for Flexport shipments

The shipment detail "Completion" date was hidden behind the Flexport lock along with departure/landing/
arrival. But completion (goods received) isn't a Flexport field — it's arrival + 7 days — so it now stays
overridable even for Flexport-linked shipments. The override starts blank (blank = arrival + 7); setting it
becomes the shipment's completion date (writes `delivery_date`). Locked banner reworded to explain.

Files: supply/inject.html. No migrations, no new env vars.

## v25.564 - ASN pallet labels: add the PO number

Each ASN pallet label page now shows a "PO <po>" line under the company name (above ASN# / PALLET).
Applied to both the admin and portal ASN downloads. `buildAsnLabelsPdf` takes the PO and omits the line
if none is supplied.

Files: asnpdf.mjs, server.mjs. No migrations, no new env vars.

## v25.563 - Assign-shipment picker: token-tolerant search

The assign-PO-to-shipment search now matches on each word of the query (AND) rather than the whole string,
so a stray trailing token like "PO-56AULX1 1" still finds PO-56AULX1 (both the shipment list and the
"becomes master" PO list). Added a shared `tokMatch()` helper.

Files: supply/inject.html. No migrations, no new env vars.

## v25.562 - Supplier portal: exclude prod ≤54 from actions + "Show all exceptions" pill

Supplier portal Purchase Orders:
- Action notifications (top PO badge + per-PO MANAGE badge) now ignore productions **54 and earlier** —
  only prod_no ≥ 55 raises actions. (Stale completed old-production POs were inflating the count, e.g.
  weireken had prod 40/46/49/51/53 completed POs contributing.)
- New **"⚠ Show all exceptions"** pill on the PO filter bar — shows every PO with ≥1 open action across
  ALL statuses (overrides the status pills, like search does), so the top-badge count is easy to reconcile.
- Refactored the per-PO action tally into a single shared `poActionCount()` used by the row badge, the top
  badge and the new filter (previously duplicated in two places).

Files: supply/portal-view.js. No migrations, no new env vars.

## v25.561 - Assign-shipment picker: search by Flexport reference

The "assign PO to shipment" search now also matches on the shipment's Flexport id / carrier ref (not just
shipment ref / master PO / market), and each result line shows "· FLEX <id>". So typing a Flexport
reference surfaces the shipment and its master PO.

Files: supply/inject.html. No migrations, no new env vars.

## v25.560 - Shipments grid: show client name under branch for Direct to Client

In PURCHASE ORDERS ▸ Shipments, when a shipment's branch is "Direct to Client" the master PO's client
name now shows on a second line under the branch. shipments query exposes `master_client` (from the
master PO's client field via the existing master-PO lateral join). Non-DTC / no-client rows unchanged.

Files: server.mjs, supply/inject.html. No migrations, no new env vars.

## v25.559 - Ships With label: bigger source/production text + boxed ships-with rows

Reformatted the SHIPS WITH master label (buildShipsWithSVG, both admin inject.html + portal
portal-view.js): SOURCE SUPPLIER and PRODUCTION REFERENCE rows +3pt (label 14→17, value 16→19);
SHIPS WITH SUPPLIER + SHIPS WITH PO now sit inside their own bordered box, with their values in
regular weight (not bold). Everything else unchanged. Reviewed via demo first.

Files: supply/inject.html, supply/portal-view.js. No migrations, no new env vars.

## v25.558 - "Awaiting supplier confirmation" not required once SHIPPING/DELIVERED

The "Awaiting supplier confirmation" action (and the PO-level badge + the metrics-summary count) no longer
fires for POs that are SHIPPING or DELIVERED — by then the order is on the water so chasing confirmation is
moot. READY TO SHIP still chases it; COMPLETE/FUTURE already excluded. Applied in three places: the actions
query, the client PO_ACTCOND.po_not_approved badge, and the awaiting_confirmation KPI.

Files: server.mjs, supply/inject.html. No migrations, no new env vars.

## v25.557 - PO search: fuzzy fallback when the exact query matches nothing

The PO search normalises the whole query into one token, so pasting e.g. "Edit Bill PO-56UKLX3-AIR"
(copied from Xero) matched nothing. Added a fallback: when the exact search returns 0, split the query
into words and match on the most PO-like token (one containing a digit, then longest), so it still finds
PO-56UKLX3-AIR. The count shows "(fuzzy match)" when this kicks in. Exact search behaviour unchanged when
it already hits.

Files: supply/inject.html. No migrations, no new env vars.

## v25.556 - Payment-issue actions: surface on completed POs from Production 55 onwards

The "Payment invalid" action (payment amount set with no payment date) now:
- also covers the **Final invoice amount set with no Final payment due** case (`supplier_invoice_total`>0 &
  `balance_due_date_overide` NULL) — matching the PAYMENTS-tab red flag added in v25.553, so it shows as a
  real action, not just an inline highlight;
- still raises on all non-complete POs, and now ALSO on **completed POs whose prod_no ≥ 55** (Production 55
  onwards). Completed POs from Production 54 or earlier (or non-numeric prod_no) stay suppressed.

Live check at build time: 2 non-complete + 0 complete-prod55 currently match; 5 older completed POs are
correctly excluded.

Files: server.mjs. No migrations, no new env vars.

## v25.555 - Cin7 push result: show TOTAL COST + TOTAL UNITS

The Cin7 line push (Update/Create Cin7 PO) result now shows a line under the "✓ Cin7 PO updated — N
line(s)" message: "TOTAL COST: <currency> x,xxx.xx · TOTAL UNITS: n,nnn". Totals are computed from the
PO's own order-plan lines (qty × pushed price / Σ qty), excluding the $0 crossdock extras carried on a
master shipment. Cost is in the supplier's currency. Endpoint now returns total_units / total_cost / currency.

Files: server.mjs, supply/inject.html. No migrations, no new env vars.

## v25.554 - Shipment drawer ▸ POs aboard: show Client name + sales ref for direct-to-client

Added a "Client" column to the POs-aboard table in the shipment drawer. For any PO carrying a client /
client sales ref (i.e. direct-to-client orders) it shows the client name and the sales ref stacked on
two rows in one cell; other POs show "—". shipment-detail endpoint now returns client / sales_order_ref /
branch.

Files: server.mjs, supply/inject.html. No migrations, no new env vars.

## v25.553 - Payments: flag missing Final payment due when a Final invoice amount is set

In PO ▸ Payments, if a Final invoice amount is entered but Final payment due is blank, the due-date
field now goes red with a "⚠ add a payment due date" note. It updates live (on `input`) as you type the
amount — no save/refresh needed — and clears the moment a due date is entered.

Files: supply/inject.html. No migrations, no new env vars.

## v25.552 - Docs: background upload + editable type; Invoice tab shows only invoice docs

**Background upload.** All PO document uploads (DOCUMENTS tab, shipment pre-ship docs, Client/FBA attach)
now go through a `bgUpload()` helper: a body-level toast reports progress/result so it works even after you
switch tabs (the fetch keeps running), the file input clears so you can re-pick, and the response is read
as text then JSON-parsed defensively — a size-limit reply ("Request Entity Too Large") now shows a clean
"file too large" message instead of the "Unexpected token 'R'…" JSON crash. Sandbox JSON body limit
raised 12mb→25mb (⚠ Diviyaj: Vercel caps request bodies at ~4.5MB regardless — large uploads need
direct-to-storage on live; noted in server.mjs).

**Editable document type.** DOCUMENTS tab Type column is now an inline dropdown (Commercial Invoice /
Packing List / Pallet Details / Barcodes & Labels / Client·FBA / Other). Changing it saves immediately
(`/api/supply/po-doc-category`) and silently refreshes the panel (keeps the open sub-tab).

**Payments ▸ Invoice tab** now lists only documents typed as an invoice (category `invoice`/
`commercial_invoice`) instead of every non-client doc — so e.g. a "Pallet Details" file no longer shows
there. Set the right type in the DOCUMENTS tab and the invoice list reflects it.

Files: server.mjs, supply/inject.html. No migrations, no new env vars.

## v25.551 - ERP deviations: a 0-qty plan line is NOT a deviation vs "not in ERP"

A line with plan qty 0 and no ERP counterpart was flagged as an ERP deviation ("0 → not in ERP"),
because `l.qty IS DISTINCT FROM el.qty` treats `0 IS DISTINCT FROM NULL` as true. But 0 and
absent-from-ERP are the same (nothing to push). Changed the quantity comparison to
`coalesce(l.qty,0) IS DISTINCT FROM coalesce(el.qty,0)` in the three display/count spots: the PO grid
`erp_pending` count, the order-plan grid `pending` flag, and the po-detail `qty_pending` (drives the
ORDER PLAN ▸ ERP-deviations box). Genuine new lines (qty>0, not in ERP) still flag as "N → not in ERP".
The PO-level deviation *action* already excluded this case (its HAVING requires ≥1 line present in ERP).
Example: PO-1725132 / GIFT-BOX-HOME-CACTMNTN no longer shows as a deviation.

Files: server.mjs. No migrations, no new env vars.

## v25.550 - Assign-deposit picker: add "Unassign (clear)" option

The deposit picker only had "— No deposit", which writes the `NO DEPOSIT` sentinel (means "this PO
needs none") — there was no way to clear an existing assignment back to blank. Added a distinct
"✕ Unassign (clear)" option (sets `deposit_ref` to empty), shown only when the PO currently has
something assigned; it reverts the PO to the "assign deposit…" needs-assign state. Relabelled the
sentinel option to "— No deposit needed" to make the two intents clear.

Files: supply/inject.html. No migrations, no new env vars.

## v25.549 - Mobile: cell/assign pickers render as a bottom sheet (no more clipping behind the grid)

The PO/shipments grid "assign" pickers (supplier, branch, production, batch, country, shipment, deposit,
crossdock/SKU add) opened as a small positioned dropdown. On phones that dropdown clipped / rendered
behind the grid (iOS `position:fixed` glitches during momentum scroll) so only a few options showed.
On phones (`isPhone()`), `placePop` now renders the popover as a full-width **bottom sheet** with a
tap-to-close backdrop, ~80vh tall, bigger tap targets, 16px search box (no zoom). Desktop unchanged.

Files: supply/inject.html. No migrations, no new env vars.

## v25.548 - Escalate email = magic-link method (best-effort); no mobile zoom

**Escalate "Load failed" fix.** Escalation emails now go through a shared `sendResendEmail()` helper —
the SAME best-effort method the supplier magic-link uses: it swallows any Resend failure (logs it) and
NEVER throws. Previously `escalateSend` threw on any non-2xx from Resend, which bubbled up and failed the
whole escalate action (surfacing as "Escalate failed: Load failed"). Now the timeline note + escalated
status are posted regardless, the user gets ✓, and any send problem is logged server-side + returned as
`emailError` (non-fatal). `sendMagicEmail` refactored onto the same helper so both are one method.
NOTE: deliverability still depends on Resend config on live (RESEND_API_KEY + verified PORTAL_FROM domain) —
that's Diviyaj's env, unchanged here.

**No mobile zoom.** Added `maximum-scale=1, user-scalable=no` to the viewport meta on the main app and
the supplier portal, so tapping an input/select no longer triggers iOS focus-zoom and pinch-zoom is off.

Files: server.mjs, artifact_v16.7.html, supply/portal.html. No migrations, no new env vars.

## v25.547 - Mobile PO/shipment sheet: show the PO (or shipment) ref in the back bar

The mobile full-screen detail sheet header only said "← Back to list". Added the PO number (or
shipment ref) on the right of that dark bar so you can see which record you're in. Passed through
`applyMobSheet(…, label)` from both call sites (PO expand → `data-po`, shipment expand → `data-ref`);
the bar is now a flex row (back text left, ref right, ellipsised on very long refs).

Files: supply/inject.html. No migrations, no new env vars.

## v25.546 - DEMAND: drop the status-footer info text

Removed the on-load "Inputs loaded live from Supabase (forecast_inputs)" status message and the
"Data extract last updated …" prefix on the footer. The footer now shows only the version (bold,
right-aligned), and `#st` is still used for transient save feedback ("✓ Saved … forecast inputs").

Files: artifact_v16.7.html. No migrations, no new env vars.

## v25.545 - SA report: fix sticky headers by removing the nested scroll container

The table was wrapped in its own `<div style="overflow:auto">`, so the `<thead>` pinned relative to
THAT inner div rather than the report's scroller — nested scroll containers break `position:sticky`,
which is why the column headers slid under the first category band and never stuck. Removed the inner
wrapper so there's a single scroller (the drawer body in the drawer; `.sa-report` in the reports tab);
the filter bar and column headers now both pin above the category bands in both contexts. Horizontal
scroll is now handled by that same scroller.

Files: artifact_v16.7.html. No migrations, no new env vars.

## v25.544 - SA report: show discontinued / out-of-scope SKUs that still hold stock

The Stock Availability report was built from `_SKU_RAW.p` (planning-scope only), so discontinued /
dropped SKUs that still carry residual stock or unreceived inbound were invisible. Added a new
`buildSAEXTRA()` (server) that returns out-of-scope products (`NOT in_planning_scope`) filtered to
those with a live signal (non-zero inventory, unreceived inbound, or an open PO line), in the same
entry shape as `p` and tagged `oos:true`. Injected as the `_SA_EXTRA` global and merged into `saRows`
(iterates SKUM ∪ _SA_EXTRA). Inbound/open-PO arrivals for these SKUs were already present in
`_SKU_RAW.i`/`.oi` (those queries have no scope filter), so no change needed there.

Files: server.mjs, artifact_v16.7.html. No migrations, no new env vars.

## v25.543 - SA report (reports tab): make column headers actually stick

In the REPORTS tab the page owns the scroll, so the SA table's sticky `<thead>` never pinned
(only the drawer worked, because `#sa-drawer-body` is a bounded overflow box). Fixed by giving
`.sa-report` its own bounded scroller (`max-height:calc(100dvh - 150px);overflow:auto`) when it's
not in the drawer — so the filter bar + column headers (SKU / Status / Type / Launch / Disc /
SOH 3PL / SOH FBA / Next inbound / 2nd inbound) pin identically in both places.

Files: artifact_v16.7.html. No migrations, no new env vars.

## v25.541 - SA report: sticky filter + column headers; clickable inbound reference

The market pills + SKU/category filter bar and the column-header row are now sticky in the SA report/drawer
(headers sit just below the filter bar, measured so they don't overlap). The inbound REFERENCE is now a link
— click it to open that purchase order (switches to SUPPLY ▸ Purchase Orders).

## v25.540 - SA drawer opens reliably + SKU wraps at 25ch

SA drawer now ensures itself under <body> (create-if-missing) so it opens on the current page every time -
it was trapped inside #app and only surfaced after navigating. SKU column caps at ~25ch and wraps beyond
(still never truncated).

## v25.539 - Update nudge: prominent yellow top bar

The "A new version of HORIZON is ready" nudge is now a full-width yellow bar pinned to the top of the screen
with larger text and a bold "Refresh now" button (was a small dark chip at the bottom). Applied to both the
main app and the supplier portal.

## v25.538 - Stock Availability: column/layout fixes + snappier SA drawer

- SKU column never truncates and is **pinned (sticky-left)** so it stays visible when the drawer scrolls.
- SOH 3PL / SOH FBA / SOH AWD columns narrowed to just fit their headings.
- Inbound cells now stack **qty / date / reference on three rows** (top-aligned).
- SA drawer now **paints instantly** (shows a Loading… state, then builds the table a tick later) and is
  wrapped in try/catch — fixes the "doesn't pop out quickly / or at all" lag on the big table.

## v25.537 - Fix: false "Unpaid payment" PO action for not-yet-due invoice balances

The PO-level "Unpaid payment" action fired on `is_final && balance_owing>0` regardless of due date, so any
in-flight PO with a recorded invoice and a future-due balance (e.g. PO-55UKLX2) showed the action even though
the PAYMENTS tab correctly showed nothing to do (it only flags OVERDUE payments, and excludes unpaid_payment
from its count). Dropped the invoice-balance clause: unpaid_payment now flags only an owed start deposit; a
balance becomes an action once overdue (via payment_overdue), matching the PAYMENTS tab.

## v25.536 - New "Stock Availability" report + "SA" drawer; remove legacy Help button

- New **REPORTS ▸ Stock Availability** report: country pills, all SKUs grouped by category, Status/Type/
  Launch/Disc (like the buy plan), SOH 3PL / SOH FBA / SOH AWD (AWD US-only), and the next 2 inbound
  deliveries to that market (qty · date · reference). SKU filter box + category select (buy-plan style).
  Built entirely from client-side globals (SKUM/SKUI/SKUOI/awdOf) — no new endpoint.
- New **"SA"** button top-right next to the "?" — pops the same report out as a **half-screen right drawer**.
- Removed the legacy top-nav **Help** button; ported access into the "?" popup via a "What to do & when
  (full guide)" link (opens the same guide).
- NOTE: the SA button/report live on the artifact views (DEMAND/BUY/FBA/REPORTS); it isn't on the SUPPLY
  harness nav yet — flag if you want it there too.

## v25.535 - Supplier portal: "Download shipment labels" under a PO's Barcodes & Labels

Added a **Download shipment labels** button to each PO's Barcodes & Labels sub-tab on the supplier portal
(the SHIPS-WITH master A4 label, e.g. SHIPSWITH-PO-…_A4.pdf). Shown whenever the PO is on a shipment (the
existing "Ship To pallet labels" row still covers the ships-under-another-supplier case). Also added a
supplier-scoped `/api/portal/ships-with/:po` endpoint + `EP.shipsWith`, and routed `dlShipsWith` through it —
previously it hit `/api/supply/ships-with` which the real portal (no planner key) couldn't reach.

## v25.534 - Fix: US AWD pill didn't appear on a country switch (pill bar wasn't rebuilt)

The BUY/FBA filter-pill bar (#bup) was only built by initUI (on view-switch); the country pill click calls
render() (table only), so switching to US never re-evaluated the market-dependent "AWD · FBA <3wk" pill.
Extracted the pill build into buildBuPills() and now call it on country change (and from initUI). So the AWD
pill appears the moment US is selected — whether via the country pill or #/fba/us.

## v25.533 - Fix: per-country BUY/FBA URLs never switched market (so #/fba/us showed UK → no AWD pill)

The v25.528 router called a bare `setFilters(...)` to apply the market from `#/fba/us` etc., but the BUY/FBA
engine is an IIFE (`var BP=(function(){…})()`) — `setFilters` isn't global, so the call was a no-op and the
market stayed UK. That's why `#/fba/us` didn't show the US-only "AWD · FBA <3wk" pill. Now uses
`window.BP.setFilters(<CC>)`. Fixes both the missing AWD pill on `#/fba/us` and per-country deep-links generally.

## v25.532 - Auto-update on the supplier portal too

Extended the auto-update (new-version + 30-min staleness reload, silent-when-safe / else nudge) to the
supplier portal (portal.html), which is a separate page and had none of it. `/api/version` is now gate-exempt
(public — returns only version + a data timestamp) so a portal session (no planner key) can poll it; the
portal page is now served `no-store` with the version stamped in. Portal uses version + staleness only (not
the ETL data signal — suppliers don't view that data).

## v25.531 - Hard 30-minute staleness reload + idle-reload

Belt-and-braces on top of the version/data poll: a tab open longer than 30 minutes is treated as stale and
refreshes at the next safe moment. "Safe moment" = tab backgrounded (silent reload) OR visible-but-idle for
90s (no mouse/key/scroll) → reload; if the user is actively working, the small Refresh nudge shows instead
and retries every 30s. So no one sits on a stale session, and no one gets yanked mid-edit.

## v25.530 - Auto-update now also catches stale DATA (not just stale code)

Extended the auto-update poll to reload when the underlying source DATA changes, not only on a code deploy.
The demand/buy-plan data is baked into the page at load and frozen for an open tab, so an ETL sync (new
sales / inventory / on-order) would otherwise never reach an open tab. `freshness()` now returns the latest
change across the ETL-fed SOURCE tables (sales_actuals, products, inbound_shipments, flexport_shipments) —
NOT user-edited tables (forecasts/POs/deposits), so a user's own edits never trigger a reload. `/api/version`
returns `{version, data}` (freshness cached 60s); the client reloads (silent when backgrounded, else nudge)
when either changes.

## v25.529 - Silent auto-update (stops users getting stuck on old versions)

New `GET /api/version` (no-store) + a client poll in the harness: every 5 min / on tab focus / 15s after load
it compares the server version to the tab's booted version; on a newer deploy it reloads SILENTLY when the tab
is backgrounded, else shows a small "Refresh" nudge. Main app HTML is already served no-store so reloads are
fresh. Advisory doc for Diviyaj (edge-cache confirmation + what we need) in ADVISORY_2026-07-14_auto-update.md.

## v25.528 - Fix broken FBA pills; per-country URLs for BUY/FBA

- **FIX:** the v25.527 AWD filter pill referenced `_CU` (only defined inside render()), which threw in the
  pill-builder function and broke the FBA tab (it fell back to showing the Buy-plan pills). Uses `CUR` now, so
  the FBA pills — and the US-only "AWD · FBA <3wk" filter — render correctly.
- **Per-country URLs** for the BUY and FBA tabs: clicking a country pill now writes `#/buy/<cc>` / `#/fba/<cc>`
  (e.g. `#/fba/us`, `#/buy/uk`), and those URLs deep-link straight to that view + market. applyRoute sets the
  market from the country segment before switching in.

## v25.527 - FBA tab: "AWD · FBA <3wk" filter (US); reverted the AWD→FBA transfer rec

Reverted the previous AWD→FBA transfer-recommendation change (FBA transfer logic is back exactly as before).
Instead added a simple **US-only filter "AWD · FBA <3wk"** on the FBA tab: shows SKUs where AWD on hand > 0
AND FBA cover is under 3 weeks (FBA on-hand + inbound ÷ avg weekly FBA demand over the next 90 days). Pure
filter over the existing view — no new columns, no calc changes.

## v25.526 - Deposits PROD# picker sources from CONFIG > Productions (active)

Re-pointed the deposits PROD# searchable picker at the CONFIG > Productions table (planner.prod_numbers,
ACTIVE only) via /api/supply/prod-numbers, instead of the grouped /api/supply/productions (_prodList) used
in v25.525. Lists every active production number (even those without POs yet); cached after first load.

## v25.525 - Deposits PROD#: searchable picker over active productions (fix v25.523)

Replaced the deposits PROD# dropdown with the searchable cell-picker (the preferred dropdown UI) over the
ACTIVE productions from the PRODUCTIONS table. v25.523 wrongly bound it to the global prodList of strings
(vs the deposit view's `_prodList` of production objects), so it was broken. Now lists active productions
(PROD# · supplier · units) with a search box, saves the deposit's prod_no, and re-renders.

## v25.524 - Samples timeline shows supplier+email; +Deposit visible under Remaining·open

- Sample timeline notes from a supplier now show the supplier name and the portal user's email
  (e.g. "Lixin (sherry@)") instead of the generic "Supplier". D&B / "D&B as <supplier>" labels unchanged.
- The Deposits "Remaining · open" filter now also shows brand-new/blank deposits (amount not yet entered), so
  a freshly-created +Deposit appears in the default view instead of being hidden until you fill in an amount.

## v25.523 - Deposits: PROD# is now a dropdown

The PROD# field in the Deposits register is now a dropdown (production numbers from lookups, newest-first,
current value always included) instead of free text. Falls back to a text input if the lookup list is empty.

## v25.522 - Deposits date-field UX + custom close dialog; SUPPLY tab defaults to Purchase Orders

- **Deposits date inputs** now fill their column and left-align (mirrored the working `.dates-tbl` datewrap
  rules into `#deptbl`; widened the Due/Likely/Paid columns). Fixes the cut-off/right-aligned date inputs.
- **Close-with-remaining** now uses a custom dialog with **Cancel** / **Yes, close** buttons (instead of the
  native OK/Cancel).
- **SUPPLY top tab**: coming from CONFIG (or any non-supply state) now lands on **PURCHASE ORDERS** instead of
  rendering a blank page (it was trying to re-select the 'config' section).

## v25.521 - Deposits: hide Close while editing; confirm Close when money remains

- While a deposit row is being edited, the Close button is hidden — only Save shows (edits auto-save; Save just
  relocks the row).
- Clicking Close on a deposit that still has a remaining balance now prompts: "There is remaining deposit of
  $X — are you sure you want to close?" (OK = close, Cancel = keep open). Fully-drawn deposits close with no prompt.

## v25.520 - Deposits register: add editable Country column

Added a Country column (editable select UK/AU/EU/US/CA) to the Deposits register. This is the field that
decides a deposit's region for PO assignment (AU is isolated), but there was no way to see/set it in the UI —
so directly-entered deposits landed with country NULL and couldn't be matched to a PO (e.g. P57-AU-XR1 to an
AU PO). Auto-saves inline like the other cells; server already accepted `country`.

## v25.519 - Buy-plan → PO modal: add optional Batch number

Added a Batch dropdown (optional, newest-first) to the "Create POs from Buy Plan" modal, alongside
Production. The chosen batch is stamped onto every PO created in that run (buyplan-pos now sets batch_id).
Branch already auto-defaults by destination×channel (UK 3PL → UK ILG, UK FBA → UK FBA, etc.).

## v25.518 - Portal users: Magic link button copies silently (no more 2 popups)

The Magic link button in CONFIG ▸ Portal users used to fire two alerts (copyText's confirmation + a second
alert with the URL). Now it copies the link straight to the clipboard and just flashes "✓ Copied" on the
button — no popups (error still alerts).

## v25.517 - PO grid Batch/PROD# cell picker sorts descending (newest first)

The Batch (and PROD#) cell picker in the Purchase Orders grid — the dropdown when you click a Batch cell to
assign it — sorted ascending. Now sorts descending (numeric, newest first), matching the filter dropdowns.
Supplier/branch pickers stay alphabetical.

## v25.516 - Fix: buy-plan PO creation now links supplier_id (was name-only)

`/api/supply/buyplan-pos` (BUY PLAN → PURCHASE ORDERS) inserted `supplier_name` but never resolved
`supplier_id`, so POs created from the buy plan landed unlinked. With no supplier link there's no production
lead time → no computable ETA → the inbound never appeared on the buy plan's timeline (e.g. PO-57UKLX5's 752
units). Now resolves supplier_id by code (fallback to name) at insert. The manual po-create path already did
this. Existing unlinked POs still need a one-off data fix (set supplier_id by name).

## v25.515 - Non-GRS transfer: round up to cartons + send-all above 65% of pool

Refined the non-GRS FBA transfer (`fbaTransferNonGrs`): still demand-driven, but now rounds the quantity
**up** to whole cartons where possible (capped at what we hold), and if the demand requirement exceeds
**65%** of the SKU's entire non-GRS pool it sends the whole pool. No 3PL protection cap.

## v25.514 - FBA "Transfer FBA (non GRS)": demand-driven, not "send everything"

The non-GRS transfer used to suggest ALL non-GRS stock in the market (e.g. 1,474 units regardless of FBA
demand). It's now **demand-driven**: sized to forecast FBA demand over the FBA-target weeks minus current
FBA cover (on-hand + inbound + AWD), capped by the available non-GRS pool. No 3PL protection cap (3PL never
uses non-GRS stock). Refactored the shared sizing into `fbaTransferSized(sku, mkt, capUnits)` — the normal
3PL transfer passes the 50%/Amazon-only cap, the non-GRS transfer passes the full non-GRS pool; identical
demand + carton logic otherwise.

## v25.513 - FBA tab: highlight SOH FBA + SOH AWD columns light yellow

On the buy-plan FBA view, the SOH FBA and SOH AWD columns (header + cells) now have a light-yellow
background (#fef9c3). Scoped to the FBA view — SOH FBA isn't highlighted in the other buy-plan views.

## v25.512 - Fix: portal PO query never returned production_status (dropdown always blank)

Root cause of "production status blank in the supplier portal": POS_SQL_PORTAL never selected
`production_status`, so the portal PO grid + timeline dropdown always rendered blank regardless of the DB
value. Added `coalesce(production_status,'') production_status` to the final projection (the admin PO query
already had it). **Requires a live deploy** to take effect on the live portal — the migration 117 data fix
alone isn't visible until this code is deployed.

## v25.511 - Migration 117 fix: exclude "READY TO SHIP" from the shipped backfill

Corrected migration 117 to use `status ILIKE 'ship%'` (not `'%ship%'`) so it no longer catches
"READY TO SHIP" (a pre-ship status). Verified against live: would set 1,175 COMPLETE POs to shipped and
leave the 11 READY TO SHIP untouched. Still needs to be RUN on live (not yet applied there).

## v25.510 - Migration 117: backfill production_status='shipped' for completed/delivered POs

Added `migrations/117_completed_delivered_prodstatus_shipped.sql` — extends migration 115 (which covered
SHIPPING only) to also set production_status='shipped' for POs whose status is COMPLETED or DELIVERED (and
SHIPPED/SHIPPING). Idempotent, safe to re-run. **Run on live** (Diviyaj) as part of the next deploy. No code change.

## v25.509 - Portal: master PO marked 'shipped' → its shipment advances to Shipping

- When a supplier sets a **master PO's** production status to **shipped**, its shipment is now advanced to
  **Shipping** (unless already Completed). Fires only for a master PO — a child/consolidated PO leaves the
  shipment untouched. Shared `shipmentShippingFromMasterPO()` helper.
- **Fix:** the real portal submit endpoint (`/api/portal/submit`) previously ignored `production_status`
  entirely — production-status changes made on the live portal weren't saved. It now applies it (matching the
  internal preview handler), which is also what powers the trigger above.
- Portal refreshes _ppData silently after a 'shipped' change so the Shipment Plan reflects the new status.

No migration.

## v25.508 - Portal: PO Status column colours aligned to production-status palette

The Status column on the supplier-portal Purchase Orders grid now follows the same progression as the
production-status dropdown: planned/future grey → production amber → shipping blue → completed/delivered
green (was: shipping/ready shown red).

## v25.507 - Portal: swap production-status colours (In production amber, Ready to ship blue)

## v25.506 - Portal: colour-coded production status dropdowns (PO grid + timeline)

The supplier-portal production-status dropdown (shared by the Purchase Orders grid and the Timeline sub-tab)
is now colour-coded: grey for —/Not started, blue for In production, amber for Ready to ship, green for
Shipped. Recolours live on change and after the value syncs across both selects.

No migration.

## v25.505 - Portal: silent refresh after a Shipping save (no Loading flash / view reset)

The post-Shipping portal refresh is now silent — instead of reload() (which blanked the view with "Loading…"
and reset the current tab), the Shipping save re-fetches the bootstrap data in the background and swaps _ppData
quietly. The PO tab shows the advanced production status + completion date next time it's viewed, with no flash.

No migration.

## v25.504 - Fix: shipped PO shows production status + completion date; stamp completion date on shipping

Following on from v25.503 (the propagation was actually working server-side, but the portal showed stale/blank
values):
- **Duplicate `completion_date` alias fixed.** POS_SQL_PORTAL aliased BOTH end_production_overide AND
  pay_completion_date as `completion_date`, so the payment one shadowed the production one — the portal's
  "Completion date" always read the (blank) payment date. Production completion is now returned as
  `prod_completion_date`; poCdVal reads it.
- **Completion date stamped on shipping.** propagateShippingToPOs now also sets end_production_overide =
  today when it's blank (completion date → today if blank), alongside status=SHIPPING / production_status='shipped'.
- **Portal refreshes after a Shipping save.** Marking a shipment Shipping now reloads the portal so the PO tab
  immediately reflects the advanced production status + completion date (was stale until manual reload).

No migration.

## v25.503 - Fix: master PO recognises its own shipment; Shipping propagation reaches the master + preview

Two fixes for the consolidated-shipment case (a master PO whose own shipment_ref is blank, with child POs
pointing at it):
- **Per-PO Shipments tab** no longer shows "No shipment assigned yet" for the master PO. The portal + admin
  PO queries now derive `shipment` as shipment_ref OR the shipment whose master_po = this PO.
- **Marking a shipment Shipping now advances ALL its POs** — children (shipment_ref=ref), the ref itself,
  AND the master PO (whose shipment_ref was blank) — to SHIPPING with production_status='shipped'. Extracted
  to a shared `propagateShippingToPOs()` helper, now also fired by the internal shipment update (so the CONFIG
  portal preview and the admin status→Shipping behave the same as the supplier portal).

No migration.

## v25.502 - Portal Shipment Plan: update box on top, ship→PO propagation, inherited dates, coloured status

- **"📝 Update this shipment" box moved to the top** of each card, above the POs-on-board.
- **Marking a shipment Shipping propagates to its POs.** When a supplier sets the shipment to Shipping, every
  PO on board still in PRODUCTION is advanced to SHIPPING with production_status='shipped' (mirrors the
  internal "→ set shipping" action). Handled in POST /api/portal/shipment/:ref.
- **Inherited/estimated dates.** When a shipment has no departure/landing/arrival, they're now calculated from
  the master PO: ship = production-end + 7 days, landing/arrival = ship + branch transit lead (air vs sea).
  Shown with a small "est" marker; the editable Ship-date field stays blank so the supplier enters the actual.
  (buildShipmentPlan now returns sea_lead/air_lead + *_est flags.)
- **Coloured status dropdown** — orange for Planned, green for Shipping (recolours live on change).

No migration.

## v25.501 - Portal Shipment Plan: supplier status limited to Planned / Shipping

Suppliers can only set a shipment to **Planned** or **Shipping** (their final stage) — 'Completed' stays
Dock & Bay-controlled. If D&B has already marked a shipment Completed, the portal shows a read-only
"Completed — set by Dock & Bay" label instead of the dropdown. The `POST /api/portal/shipment/:ref`
endpoint now rejects any status other than Planned/Shipping. Internal supply-plan grid keeps all three
stages unchanged.

## v25.500 - Portal Shipment Plan: supplier can update the shipment (carrier/tracking/ship date/status) + add a charge

Restored/added inline editing on each real-shipment card in the supplier portal Shipment Plan:
- **"📝 Update this shipment"** panel — Carrier, Tracking code, Ship date (departure), Status
  (Planned / Shipping / Completed). Saves **directly** to the shared shipment (same model as the PO-side
  tracking/carrier write) via new `POST /api/portal/shipment/:ref` (supplier-scoped; whitelisted fields).
  When the supplier sets/changes the ship date, a timeline note "<supplier> set the ship date to <date>"
  is posted so both sides see it.
- **"💰 Freight charges"** panel — lists existing charges and lets the supplier add one (freight cost +
  description), routed to Dock & Bay to review via the existing shipment-charge endpoint. Charges lazy-load
  when a card is expanded.
- buildShipmentPlan now returns the shipment `status` so the status dropdown reflects saved values.
- Same UI shows in the CONFIG portal preview (writes go to the internal `/api/supply/shipment/:ref`).

No migration (uses existing planner.shipments columns + supplier_charges).

## v25.499 - Portal: larger black timeline message text; faster FLAG tooltip

- Shipment-plan timeline messages (both real-shipment and FOB timelines) now render the message body at
  13px in near-black (#1a1a1a) via a shared `.tl-msg` class, instead of the tiny 9.5px grey-ish text. The
  timestamp/author line stays small and muted.
- The per-note "⚑ Flag" tooltip is now a CSS tooltip that appears after 120ms (instead of the slow native
  browser `title` delay). Applied to all Flag buttons via a shared `.tip` class + `data-tip`.

No migration.

## v25.498 - "Escalate shipment" posts a timeline note + emails supply chain; red focus star

Two changes:
- **Escalate shipment → timeline note + email.** When a supplier clicks "Escalate shipment" (real shipment or
  FOB), escalateCore now also posts a timeline note "<user> escalated this shipment" (shipment_notes for real
  shipments, supplier_notes for FOB POs) and emails the supply-chain recipients as if the message was flagged
  (via the `post_note` flag on the escalate endpoints). The timeline re-renders immediately so the note shows.
- **Red focus star for escalated shipments.** On the SUPPLY ▸ Shipments grid, escalated shipments now show a
  RED focus star (was amber/yellow) and are surfaced by the Focus filter alongside starred shipments.

No migration.

## v25.497 - "Escalate shipment" now sets the escalated STATUS (filterable both sides)

"Escalate shipment" previously only emailed. It now also raises the shipment's `escalated` status (via
escalateCore when the portal passes set_escalated), so the shipment appears in the "Escalated" filter on the
supplier portal AND the supply-plan Shipments grid (red card / ⚑ ESCALATED badge). Per-note "Flag" stays
email-only. FOB escalations (no shipments row) remain email-only. No migration.

## v25.496 - Portal: per-note "Flag" on ALL timelines

Relabelled the per-note escalate to "⚑ Flag" (emails that note to the supply planner) across every portal
timeline — Purchase Orders, Shipment Plan, FOB, and Samples. Shipment "Escalate shipment" button unchanged.
FOB Flag is delegated so it survives the note-list re-render. No migration.

## v25.495 - Portal Shipment Plan: "Escalate shipment" button + per-note "Flag"

Renamed the top button to "⚑ Escalate shipment" (sends a shipment-level escalation email). Restored a
per-note "⚑ Flag" button on the supplier's latest timeline note — emails that specific note to the supply
planner recipients. Both route through /api/portal/escalate. No migration.

## v25.494 - Portal Shipment Plan: prominent Escalate on every card (incl FOB), above the timeline box

The escalate control was a preview-only flag button tucked in the card header and absent on FOB (and not
wired on the live portal at all). Replaced with a prominent "⚑ Escalate to Dock & Bay" button at the top of
the timeline section — on every card. It emails D&B (via /api/portal/escalate, which works for any ref):
real shipments escalate as kind=shipment, FOB entries as kind=po (no shipment record). Sends the supplier's
latest note as the message, else a general alert. Removed the per-note escalate + header flag button; the
red "⚑ ESCALATED" badge still shows if the shipment is flagged. No migration.

## v25.493 - Portal ORDER PLAN Additional costs: fixed table layout (no overlapping inputs)

Root cause of the "floating qty": the Additional costs table used auto layout inside the expanded detail row,
where `tr.exp-row .tw>table{width:max-content}` + the auto column algorithm squished the cells so the Qty
input overlapped the Description box. Switched to an explicit colgroup + `table-layout:fixed;width:540px`
(same as the working Payments table) and dropped the `.tw` wrapper. No migration.

## v25.492 - Portal PAYMENTS: only show CONFIRMED (dated) payments

The portal PAYMENTS tab showed the calculated Starting deposit / Completion deposit / Balance milestones even
before a paid date was assigned — projections, not payments. Now each milestone row only renders once it has
a paid date (confirmed); shows "No payments recorded yet." when none are. Total invoice value row unchanged.
No migration.

## v25.491 - Portal ORDER PLAN Additional costs: wrap table + force-static detail headers

Wrapped the Additional costs table in the standard `.tw` container (max 540px) so it can't bleed out, and
made the detail-panel sticky-header override `!important` (belt-and-suspenders vs the floating "Qty").
Awaiting a screenshot to confirm the floating-qty is resolved. No migration.

## v25.490 - Portal ORDER PLAN add-SKU dropdown renders above the grid (body-fixed popover)

The add-SKU search dropdown was position:absolute inside the grid, so it was clipped by the table overflow /
hidden under the next row's sticky cells. Now it's a body-appended position:fixed popover (z-index 99999)
placed at the input, closing on scroll/resize — so it renders on top of the PO grid. No migration.

## v25.489 - Portal ORDER PLAN: stop the sticky "Qty" header floating; left-align add-SKU search

- The global sticky table-header rule was applied to the small tables inside an expanded PO detail too, so the
  order-plan "Qty" header floated over the sections below (Additional costs) while scrolling. Detail-panel
  tables (inside `.ppx`) now have static headers.
- Add-SKU search input is left-aligned (`.fci` defaults to right-align). No migration.

## v25.488 - Portal ORDER PLAN SKU width + search dropdown; shipment-plan PO not linked; DTC action gating

- ORDER PLAN SKU column now min 30ch (+ nowrap) so long SKUs aren't cut off.
- Add-SKU box is now a filterable search dropdown (type to filter the supplier's SKUs not already on the
  order; click to pick) instead of the native datalist.
- Shipment Plan: the master PO number in the card header is plain text (no longer hyperlinks to Purchase Orders).
- Direct-to-Client approval no longer counts as an action once the PO is shipping/shipped/delivered/complete
  (the tab + approve UI stay, but the "A" badge/count drops).
No migration.

## v25.487 - Portal invoice downloads fixed (portal-scoped endpoint + real file download) + label

The portal Tax Invoice buttons used `window.open('/api/invoice/...')`, which opens a tab but doesn't download
on the portal host (only `/api/portal/*` is routed there). Added portal-scoped, supplier-scoped endpoints
`/api/portal/invoice/shipment/:ref` and `/api/portal/invoice/po/:po` (portalAuth), and switched the buttons to
a fetch->blob download so a file actually saves. Added the label "Download a consolidated shipment tax
invoice" above the Shipment Plan button. CONFIG preview keeps the admin `/api/invoice/*` routes via EP. No migration.

## v25.486 - Portal Shipment Plan date bands: real shipments now get a production-end date

The shipment-plan builder only set `prod_end` on FOB entries, so real shipments all fell into the "No
production end date" band. Now each real shipment gets `prod_end` = the latest production-end across its POs
aboard (override ▸ start + supplier days) — so they sort into the DUE NOW / DUE SOON / UPCOMING / 6+ bands.
Verified: 38/39 real shipments now carry a date. No migration.

## v25.485 - Samples: SKU edits save with ✓ Done (no separate Save SKUs button)

On SUPPLY ▸ Samples, editing SKUs no longer needs its own "Save SKUs" button — the SKU lines now persist as
part of the "✓ Done" save (other fields already auto-save on change). Removed the separate button. No migration.

## v25.484 - Payments refresh after final-cost edit + narrower Credit amount box

- Editing an order-plan line's final cost now marks the PO detail stale; opening the Payments (or Landed
  Costs) sub-tab rebuilds it with the recalculated figures (was showing stale plan-price calcs).
- Credit amount input narrowed (~8 chars, fits "9,999.00"). No migration.

## v25.483 - Payments: Credit amount moved under Final invoice amount

On SUPPLY ▸ Purchase Orders ▸ Payments, the "Credit amount" field moved from the payment-plan table up into
the Order-value form, directly under "Final invoice amount". No migration.

## v25.482 - ERP push mirror + qty-0 removal + final price used everywhere

Four ERP / order-plan fixes (all live-relevant; Diviyaj deploys):
- **ERP mirror after push**: the push now also DELETEs mirror rows for SKUs no longer on the order (zeroed /
  removed), so the "Update ERP" drift flag clears immediately instead of lingering against stale rows.
- **qty 0 removes the line**: setting an order-plan line to 0 now DELETEs it (removed from the order plan)
  rather than keeping a 0-qty row.
- **Final price is authoritative**: `po-line-final` now stamps `confirmed_at`, so a D&B-entered final cost is
  actually used by the ERP push, the Cin7 verify/discrepancy popup (was showing plan price), and value calcs.
- **Payments + PO grid values use the final price**: PO value (Σ qty × cost) now uses `coalesce(final_cost,
  cost_price)` instead of plan cost — feeds the payment milestones, PO grid value, and deposit-allocation est.

⚠ Deploy note: existing `final_cost` rows set BEFORE this (on live) have `confirmed_at` NULL, so they won't be
picked up until re-saved. Either re-enter the final price, or backfill:
`UPDATE planner.portal_line_costs SET confirmed_at=now() WHERE final_cost IS NOT NULL AND confirmed_at IS NULL;`
No migration.

## v25.481 - Supplier portal Barcodes: add INNER barcode download

Added the missing INNER option to the portal Barcodes tab: a batch-level "⤓ Download inner barcodes"
button, plus an Inner barcode column + per-SKU "⤓ Inner" download in the SKU list (shown when the SKU has
an inner barcode). No migration.

## v25.480 - Supplier portal Barcodes: per-SKU list + filter

On the supplier portal Barcodes tab, selecting a batch now shows a list of every SKU in that batch —
swatch picture, SKU (+ name), product barcode number, carton barcode number — each with per-SKU download
buttons (Product / Carton). Added a filter box above the list so a supplier can find and download barcodes
for specific SKUs. The existing batch-level "download all product/carton" buttons remain. No migration.

## v25.479 - Barcodes page + carton/inner label tweaks

- Barcodes grid search box: paste now filters (added an onpaste handler — paste didn't reliably fire input).
- Barcodes grid: **labels** (download) column moved to column 1.
- Settings ▸ Batch dropdown now sorted **descending** (newest batch first).
- Carton/Inner label PDF: added clearance below the DOCK & BAY logo so the "BOX OF n x …" header no longer
  sits tight against the wordmark. No migration.

## v25.478 - Timeline notes shown newest-first across all timelines

Every timeline note thread now renders newest→oldest (was oldest→newest). Applied to all six render sites:
supplier portal (purchase orders, shipment plan, samples) and supply plan (purchase orders, shipments,
samples), via a shared `tlDesc()` descending sort by created_at. No migration.

## v25.477 - Portal "mark unread" renders as a small text button (not a Mark-read-style button)

On the supplier portal PO timeline, after marking a Dock & Bay note read the control now becomes a small
underlined text button ("mark unread") instead of keeping the solid "Mark read" button styling. The in-place
toggle now restyles the element to match each state (Mark read = button; mark unread = small text). No migration.

## v25.476 - Completion-date days badge on READY TO SHIP / SHIPPING / DELIVERED POs

Added the same colour-coded days-to-go badge to the PO grid Completion column, shown only when the PO status
is READY TO SHIP, SHIPPING or DELIVERED (mirrors the END-date badge which shows only in PRODUCTION). No migration.

## v25.475 - END-date days badge only on PRODUCTION-status POs

The colour-coded days-until-end badge in the PO grid END DATE column now shows only when the PO status is
PRODUCTION (hidden for Future / Shipping / Complete etc.). No migration.

## v25.474 - PO grid FLEX badge uses the standard flex-badge style

The Shipment-column FLEX badge (v25.472) now uses the same `.src fx` style as the flex badges next to the
Arrival/Delivery date, instead of a custom blue chip. No migration.

## v25.473 - Shipment drawer: Tax Invoice button moved to the "POs aboard" tab

In the shipment popout drawer, the "📄 Tax Invoice" button moved from the Dates & tracking tab to the POs
aboard tab, with the caption "Download the consolidated tax invoice for all purchase orders on this
shipment." No migration.

## v25.472 - PO grid Shipment cell: clickable FLEX badge for Flexport-linked POs

In the SUPPLY ▸ Purchase Orders grid Shipment column, a Flexport-linked PO now shows a clickable "FLEX ↗"
badge (next to the "master" badge, under the shipment ref) that opens the shipment in Flexport. Shown
whenever the PO carries a flex_id / flexport_reference. No migration.

## v25.471 - PO grid END DATE: replace the "M" source tag with a colour-coded days-until-end badge

On SUPPLY ▸ Purchase Orders, the END DATE cell no longer shows the "M" source icon. Instead it shows the
number of days until the (effective) production-end date (negative = overdue), colour-coded: <=0 red,
<=7 dark orange, <=14 light orange, <=30 light blue, >30 light green. No migration.

## v25.470 - PO production grouping: consolidated members indented under their master PO

Within each P# production group, POs are now clustered by shipment (master PO first) and the consolidated
member POs are visually indented beneath their master (the "└ " child-row style used by the Master-shipment
grouping). Standalone POs (no shipment) stay flush. No migration.

## v25.469 - PO production grouping keyed off the shipment's MASTER PO production number

The supply-plan PO grid's Production grouping now groups each PO by the production number of its shipment's
master PO, so a PO consolidated onto another production's master shipment sits under that master's P# (e.g. a
prod-54 PO on a prod-55 master shipment now shows under "P# 55"). Falls back to the PO's own prod_no when it
isn't on a shipment; the master PO sorts first within its group. Each row's own production still shows in the
PROD# column. No migration.

## v25.468 - Grouping-row text smaller still on mobile

Reduced the mobile grouping-header font from 9–10px to 8px (with tighter padding) across all four grouping
headers (portal PO groups + shipment bands; supply-plan PO groups + shipment bands). No migration.

## v25.467 - Smaller grouping-row text on mobile + Production is the default PO grid grouping

- Mobile: reduced the text size of the new grouping headers (portal PO groups + shipment date bands; supply
  -plan PO production groups + shipment date bands) so they don't dominate on small screens (font-size 9–10px).
- The supply-plan Purchase Orders grid now defaults to **Production** grouping (was Master shipment) — the
  grey "P# … — N PO's" headers with expand/collapse. Still switchable via the Group dropdown. No migration.

## v25.466 - Supply-plan Shipments grid grouped by production-end date (same bands as the portal)

Applied the same date-band separation to the main-app SUPPLY ▸ Shipments grid: DUE NOW (< 1 week) / DUE SOON
(1–3 weeks) / UPCOMING (3–6 weeks) / 6+ weeks / no date, keyed off each shipment's production-end date.
Added a derived `prod_end` to the /api/supply/shipments query = MAX(production end) across the POs aboard
each shipment (override ▸ start + supplier days). Grid sorts into the bands (soonest first) with coloured
header rows; excluded the new group rows from the sh-tbl sticky columns. No migration.

## v25.465 - Supplier portal Shipment Plan grouped by production-end date

The portal Shipment Plan now groups shipment/FOB cards under date headers based on Production End Date:
DUE NOW (< 1 week) / DUE SOON (1–3 weeks) / UPCOMING (3–6 weeks) / 6+ weeks / no date yet. Cards are sorted
into those buckets (soonest first, then by prod end within a bucket). Grouping applies to the current
filtered view. No migration.

## v25.464 - Grouping-row label "P# 54 — 2 PO's" + same feature in the supply-plan PO grid

- Relabelled the portal grouping row from "Production 54 — 2 POs" to "P# 54 — 2 PO's".
- Brought the same summary feature to the supply-plan PO grid (SUPPLY ▸ Purchase Orders, Group ▸ Production):
  a grey grouping header per production ("P# 54 — 2 PO's") with expand/collapse (▾/▸, default expanded).
  Collapsing hides that production's PO rows + any open detail rows; expanding shows the PO rows. Reuses the
  existing per-row data-g group tag; headers use the grp-row/cat-hdr styling (excluded from the sticky
  columns). No migration.

## v25.463 - Portal PO grid: production grouping row grey + expand/collapse

The "Production 54 — 2 POs" grouping row on the supplier portal PO grid was rendering white — the sticky
first-column rule (more specific) was overriding the intended grey. Excluded `.pp-grp` from that rule so it
shows light grey (#e5e7eb). Added an expand/collapse toggle on the grouping row (▾/▸, default expanded):
clicking collapses that production's PO rows and any open detail cards; clicking again shows the PO rows.
No migration.

## v25.462 - Timeline messages capped at ~640px for readability (full width on mobile)

Timeline note rows were stretching the full page width on desktop, making long threads hard to read. Capped
each note row at max-width 640px across all timelines (PO / shipment / sample, on both the supplier portal
and the supply plan). On mobile the viewport is narrower than 640px, so rows stay full width. No migration.

## v25.461 - Timeline controls on the LEFT across ALL timelines (shipment + sample), escalate own-notes-only

v25.460 moved the PO timeline controls left; this extends the same treatment to the remaining timelines so
every timeline behaves identically: shipment + sample, on both the supplier portal and the supply plan.
Mark-read sits on the incoming (other-party) notes on the left; escalate sits on your OWN latest note on the
left (portal: supplier's own → emails D&B; supply plan: internal's own → emails supplier). Escalate no
longer appears on the other party's notes on any timeline. (Mark-read was already left on shipment/sample;
this makes escalate consistent and own-notes-only.) No migration.

## v25.460 - Portal diff box sizing + timeline escalate/read on the left, own-notes-only

- **"Changes since you approved" box**: was stretching full-width (global `table{width:100%}`) and clipping
  the SKU (e.g. "TOWLB-CAB-LG-BL…"). Box now capped at 540px, table sized to content and horizontally
  scrollable, SKU column min 30ch + nowrap so the full SKU + Was/Now qty always show.
- **Timeline controls moved to the LEFT** of each note (was right), both the supplier portal and the
  supply-plan PO timeline.
- **Escalate now only on your OWN notes**: on the portal the supplier can escalate only their own latest
  message (emails D&B); in the supply plan an internal user can escalate only their own latest message
  (emails the supplier). Escalate no longer appears on the other party's notes. Mark-read still sits on the
  incoming (other-party) notes. No migration.

## v25.459 - CONFIG portal preview parity: "changes since you approved" diff now shows there too

The CONFIG > Portal preview assembles its data client-side (loadPortalData) rather than from
/api/portal/bootstrap, and it was missing `approvedByPo` — so the "⚠ Changes since you approved" diff
banner only rendered in the real supplier portal, not the admin preview. Added `approved_lines` to the
shared /api/supply/purchase-orders projection and built `approvedByPo` in loadPortalData. Verified the
v25.458 portal changes (CSV, SKU fit, completion-aware status) already share portal-view.js and render
identically in both views; this closes the last data-parity gap. No migration.

## v25.458 - Portal ORDER PLAN: CSV export, SKU fit, completion-aware timeline + main-app SKU picker

Batch of supplier-portal + main-app ORDER PLAN fixes:
- **(portal) Download to CSV** — ORDER PLAN tab now has a "⤓ Download to CSV" button exporting every SKU +
  qty (with est/your cost + line total) for the PO.
- **(portal) SKU column fit** — SKU cells are now `nowrap` and the plan table scrolls horizontally, so long
  SKUs always show in full (was truncating/wrapping on narrow panels).
- **(portal) Completion-aware production status** — `prodAttention` now uses the effective completion date
  (latest supplier-submitted completion_date overrides the calculated prod_end), matching invoiceDue. Fixes
  the false "⚠ Past completion date (30-Jun-26) but status is In production" timeline action on PO-1693118
  when the supplier had already submitted a later completion (29-Aug-26).
- **(main app → portal) Order-plan edit invalidates approval** — editing/adding SKUs or qtys in SUPPLY > PO >
  PLAN > ORDER PLAN on an order the supplier already confirmed now (a) posts a "<user> made an edit to the
  order plan" timeline note (deduped to one per edit burst) and (b) clears the supplier's confirmation so the
  portal shows it for re-confirmation (with the existing "changes since you approved" diff).
- **(main app) ORDER PLAN add-SKU picker** — the add-SKU field now opens the same searchable popover used for
  BATCH/crossdock on the PO grid (type-to-filter), replacing the plain datalist.

No migration (uses existing approved_lines from mig 116).

## v25.457 - CONFIG portal preview payments also derived (not the ledger)

The CONFIG > Portal preview uses /api/supply/supplier-payments/:name, which still read the import-only
payment_transactions ledger — so plan-entered payments were missing in the preview even after v25.453 fixed
the real portal. Switched this endpoint to the same derived source (PO completion/balance + deposit register
+ other). Verified: Lixin preview now returns 128 payments incl. newly-added test entries. No migration.

## v25.456 - Deep-link each supplier portal preview: #/config/portal/<name>

The CONFIG portal preview is now deep-linkable per supplier, e.g. #/config/portal/lixin — opens CONFIG >
Portal preview acting as that supplier. Selecting a supplier updates the URL; the name segment is matched
case-insensitively. No migration.

## v25.455 - Portal own-carrier dropdown: DHL / Fedex / SF Express / Local Delivery / Other

Updated the supplier-portal carrier dropdown (under 'shipped with own carrier account'): removed Flexport,
renamed FOB to 'Local Delivery', added 'SF Express'. No migration.

## v25.454 - Portal: move PO invoice download into the INVOICE & DOCUMENTS tab

Removed the commercial-invoice icon between MANAGE and the PO number on Purchase Orders. Added a "⤓ DOWNLOAD
GENERATED TAX INVOICE FOR THIS PO" button at the top of the INVOICE tab (above Documents), and renamed the
tab to "INVOICE & DOCUMENTS". No migration.

## v25.453 - Portal payments derived from the report source; order-plan diff vs what the supplier approved

- **Payments (root-cause fix)**: the supplier portal read the `payment_transactions` ledger, which is
  import-only and never captures payment dates/amounts entered in PURCHASE ORDERS > Payments / Deposits /
  Other. The portal now **derives payments from the same source-of-truth as the admin Payments Report** — PO
  completion + balance milestones, the deposit register, and Other payments (starting deposits excluded).
  Verified on sandbox: Lixin now shows 126 payments (was 51 from the ledger). Fixes the missing 01-Jul-26 payment.
- **Order-plan "what changed"**: now diffs the current plan against a **snapshot of what the supplier
  approved** (migration 116 `approved_lines`, captured on confirm) rather than the ERP sync — the ORDER PLAN
  tab shows "Changes since you approved" (SKU Was -> Now) only after they've approved and something changed.

## v25.452 - Portal: show order-plan changes for re-approval + case-insensitive payment match

- **What changed on re-approval**: when a PO order plan is amended (differs from the last-synced ERP), the
  supplier portal ORDER PLAN tab now shows a "Changes to approve" panel listing each SKU Was -> Now (added /
  removed / +/- delta), so the supplier sees exactly what they are approving. (Needs `erp_qty`, now included
  in the portal line payload; only shows once a PO has been synced, so a brand-new order isn't all "added".)
- **Payment match**: the portal payments filter now matches `transaction_supplier` case-insensitively /
  trimmed, so a payment whose supplier name differs only by case/whitespace still shows. No migration.

## v25.451 - SHIPPING => production_status shipped; invoices only from production 57+

- Any PO in SHIPPING status now defaults production_status to "shipped" (SHIPPING implies production done +
  shipped): backfill migration 115 (run on sandbox; Diviyaj runs on live) + the set-shipping endpoint now
  sets it going forward. Backfilled 55 sandbox POs.
- Supplier-portal INVOICE exception now only applies to production 57 and later — production 56 or earlier no
  longer flags an invoice-due exception (invoiceDue returns false for prod_no < 57).

## v25.450 - DEMAND: lighter discontinued red (#FF746C) + border on "disc" cells

Discontinued-rundown cell outline is now a lighter red (#FF746C, was #dc2626), and cells showing "disc"
(stock exhausted) now get the same red border. No migration.

## v25.449 - Crossdock SKU picker uses the batch/branch search-popover format

The "add crossdock SKU" control on Client/FBA now uses the same searchable cell-pick popover as "assign batch"
(a "＋ add crossdock SKU ▾" button opening a type-to-search list) instead of the datalist input. Multi-add is
preserved (chips + remove); picking a SKU appends it and saves. No migration.

## v25.448 - Default landing is SUPPLY (no DEMAND flash)

The app painted DEMAND (hardcoded active tab) then redirected to SUPPLY, causing a flash + DEMAND underline.
Removed DEMAND's default `active` and gated the artifact's initial render() so it only paints a demand-side
view when the URL asks for one; a plain first load goes straight to SUPPLY (harness route) with no DEMAND
flash. Clicking DEMAND (or a #/demand deep link) still renders it. No migration.

## v25.447 - Fix "today is not defined" on the PO SHIPMENTS panel

poShipPanel (PLAN > SHIPMENTS) referenced a bare `today` (pre-shipment-doc overdue checks) with no local
definition, throwing "today is not defined" when the panel rendered. Added a local `today`. No migration.

## v25.446 - Portal MANAGE count: drop no-shipment-yet term (matches sub-tab)

The per-PO MANAGE (N) badge on the supplier portal still added 1 for "no shipment/tracking yet", so it read
one higher than the sub-tabs (MANAGE 5 vs 4). Removed that term so MANAGE matches the SHIPMENTS sub-tab and
the top PO badge. No migration.

## v25.445 - Portal PLAN > SHIPMENTS sub-tab: drop the no-shipment "(1)"

Confirmed the "(1) next to SHIPMENT" is the per-PO PLAN > SHIPMENTS sub-tab badge (supplier portal > Purchase
Orders > PLAN). It counted "no shipment / tracking submitted yet" as 1 action for every PO not on a shipment.
Removed that term — the badge now only reflects a real outstanding crossdock quantity entry. (portal.html
already cache-busts portal-view.js per load, so a fresh portal open shows it; the earlier persistence was a
non-reloaded page.) No migration.

## v25.444 - Portal: remove the "(1)" on SHIPMENT for POs with no shipment

The SHIPMENT sub-tab badge counted "no shipment/tracking submitted yet" as 1 action for every PO not yet on
a shipment. Removed that term — the SHIPMENT badge now only reflects a real outstanding crossdock quantity
entry. No migration.

## v25.443 - Portal: no-shipment PO is not an action; own-carrier tickbox

On the supplier portal, a PO with no shipment assigned is a passive state, not an action. Enlarged the "No
shipment assigned yet…" message and moved the carrier / tracking ref / freight-charge inputs behind a new
tickbox "Supplier shipped this with own carrier account (ie. DHL / Fedex)" — unticked shows just the message
(nothing to do); ticking reveals the inputs + "Create shipment & save". Combined with v25.441 (blank
destination no longer FOB) this clears the phantom shipment action. No migration.

## v25.442 - Created-note wording + attribute to the real user (DEV_USER on sandbox)

- Timeline note now reads **"<user> created a new purchase order"** (added the missing "a").
- The note showed "A user" on the sandbox because the tunnel has no auth proxy (nothing tells the server who
  you are). Added an optional **`DEV_USER`** env fallback in `authUser()` so the sandbox attributes actions to
  you (set `DEV_USER=ben@dockandbay.com` in the sandbox `.env`); **live always sends a real forwarded auth
  header, which takes precedence** — do NOT set `DEV_USER` in production. Fixed PO-TEST1234's existing note.
  No migration.

## v25.441 - Fix new-PO portal: blank destination isn't FOB + created-note follows late-assigned supplier

Two portal bugs on a freshly-created PO (no branch/country yet, supplier assigned after creation):
- **Not FOB**: a PO with a blank destination was badged **FOB** in the supplier portal (`ppIsFOB` treated
  "no import warehouse" as FOB even when unset). Now a blank destination is **not FOB** (FOB needs the
  manufacturing branch or an explicit non-major destination). Also tightened the server FOB shipment-plan rows
  the same way, so a blank-destination PO no longer shows a phantom FOB shipment.
- **"created new purchase order" note now reaches the supplier**: the note is stamped with the PO's supplier
  at creation, but if the supplier is assigned *afterwards* it was left unscoped (`supplier_id` null) so the
  portal couldn't show it. The supplier-assign endpoint now **back-fills** the supplier on any unscoped notes
  for that PO. (Existing PO-TEST1234 note back-filled.) No migration.

## v25.440 - New PO: single form (supplier dropdown, branch, dates, prod/batch)

Replaced the two-step prompt() dialogs for "+ New PO" with a single modal form: PO number (prefilled "PO-"),
Supplier (searchable dropdown), Branch (searchable), Production start date, Production number, Batch number.
One POST to /api/supply/po-create (extended to accept prod_no + batch_id); resolves supplier_id and drops
the new PO into the grid search on success. No migration.

## v25.439 - PAYMENTS panel: left-align amount inputs

The payment amount input boxes (deposit / completion / balance) are now left-aligned instead of right, matching the grid default. No migration.

## v25.438 - PO grid: remove the "ERP match: ... in sync ... not in ERP" summary line

Removed the ERP-reconciliation summary strip from the top of the purchase-order grid (per-row ERP status + the ORDER PLAN action already convey this). No migration.

## v25.437 - PO badge: don't double-count an overdue-and-unpaid payment

The PO action badge counted `payment_overdue` and `unpaid_payment` separately, but an overdue payment is
inherently unpaid — the PAYMENTS tab already shows it as one line and snoozes both together. Now when
`payment_overdue` fires, `unpaid_payment` is dropped from the badge count, so the badge matches the tabs
(PO-57UKLX3: 4, not 5). `unpaid_payment` still stands alone when a payment is owed but not yet overdue.
No migration.

## v25.436 - ORDER PLAN: ERP deviation is ONE action (A + snooze), not N lines

The ORDER PLAN tab counted the number of ERP-differing lines (e.g. 10) as 10 actions. It's really **one**
action — "push to align with ERP". Added a first-class `erp_lines` PO action (mapped to the ORDER PLAN tab)
that counts as **1**, shows an inline **"A"** next to the "Upload to ERP" button in the deviations box, and is
**snoozable** like every other action. It also now shows on the PO-ref action badge. (PO-57UKLX3 now reads 1,
not 10.) No migration.

## v25.435 - Fix DATES phantom count + snooze date format + label wrap

- **DATES count with no "A" fixed**: the "Not confirmed by supplier" action (`po_not_approved`) was counted
  on the DATES tab but its "A" marker lives on the MASTER DATA tab's Supplier-confirmation row. Remapped it to
  **MASTER DATA** (new `master` exception bucket + count badge), so the count and the marker are on the same
  tab. (This was PO-57UKLX3's mystery DATES counter.)
- **Snooze date format**: the "Snoozed → …" label now shows **dd-mmm-yy** (e.g. `14-Jul-26`) instead of ISO.
- **Label wrap**: the DATES "Supplier production status (set by supplier / here)" hint now sits on a second
  line so it no longer clips. No migration.

## v25.434 - Action-badge popover: single SNOOZE ▾ dropdown

In the row action-badge popovers (PO and shipment), replaced the inline 1d / 3d / 7d / ∞ buttons with a
single **SNOOZE ▾** button that opens the shared snooze dropdown (1 day / 3 days / 7 days / Indefinitely) —
tidier, matching the inline "A" marker. No migration.

## v25.433 - PO grid: Supplier column narrower + no L/R padding

Tightened the Supplier column further (cell-pick max-width ~82px, no left/right padding on the button + cell) so it takes minimal width; names still wrap onto a second line at 10px. No migration.

## v25.432 - PO grid: narrower PO column + note icon next to the star

The PO reference now wraps onto a second line past ~15 characters (narrower PO column), and the "N" note
icon moved into the first cell — between the ★ focus star and the PO number — filling the blank space
instead of trailing after the reference. No migration.

## v25.431 - PO grid Ship-to: "(branch)" on its own line + Direct shows "OT"

The inherited "(branch)" hint now sits on a second line below the value (not after it), and the Ship-to cell
displays anything that isn't UK/US/AU/EU/CA (i.e. Direct / other) as **"OT"**. Grid display only; the picker
options and stored `country_code` are unchanged. No migration.

## v25.430 - PO grid: Ship-to matches Branch cell-pick + narrower Supplier column

- **Ship to** now uses the exact **cell-pick** control as Branch — value + a small ▾, opening the same popover
  (country list: UK / US / AU / EU / CA / Direct / "— use branch"). Saves the `country_code` override in place;
  a "(branch)" hint shows when inherited. (Replaces the native select from v25.428/429.)
- **Supplier** column narrowed: long names now **wrap onto a second line** and the text is **1pt smaller**
  (10px, max-width ~104px) so the column takes less width. No migration.

## v25.429 - PO grid Ship-to dropdown: subtle grey styling

Styled the grid Ship-to country dropdown to match the Branch cell-pick — transparent border, no fill, grey
text, light hover — so it blends into the table instead of the prominent blue `.fci` look. No migration.

## v25.428 - PO grid: inline-editable Ship-to country dropdown

The **Ship to** column on the PO grid is now an inline **country dropdown** (UK / US / AU / EU / CA / Direct /
— use branch) instead of read-only text. Changing it saves the PO's `country_code` override immediately with
no page refresh (same `.fci` in-place save as the Status column); when left blank it shows the inherited
branch country as a grey hint. No migration.

## v25.427 - Analyse consolidation: target chooser at top + left-aligned table

Moved the **Create new consolidation shipment / Add to existing shipment** chooser to the **top** of the
modal (directly under the recommendation banner, in a light panel) instead of below the candidate table.
Left-aligned the candidate table cells (PO etc.) to match the grid default. No migration.

## v25.426 - Snooze indefinitely (all snooze surfaces)

Added a **Snooze indefinitely** option everywhere an action can be snoozed — a snoozed state with no expiry
(stored as `snooze_until = NULL`, still `status = 'snoozed'`), so it stays snoozed until manually woken.
Surfaces: PO inline "A" snooze menu + row-badge popover, shipment inline "A" menu + row-badge popover, the
SUPPLY ▸ Actions lifecycle buttons, and DEMAND ▸ Actions cards. Labels show "indefinitely" instead of a
date. Detection (client + server, both supply_action_state and demand_action_state) now treats a null-expiry
snooze as active. No migration (columns already nullable).

## v25.425 - Shipment sub-tab "A" markers + sub-nav badge stays on one line

Fixes v25.424 gaps:
- **Inline "A" markers**: a shipment-expand sub-tab could show an action count with nothing visible behind it
  (e.g. PO-57AUBL1's "over 20 pallets" counted on POs aboard but no marker). Each panel (Dates / POs aboard /
  Timeline) now renders a red **"A" banner** naming the action with a **SNOOZE ▾** / wake control — full parity
  with the PO inline markers. Snoozing mutes the marker + drops it from the counts.
- **Sub-nav counter on one row**: the PLAN / Shipments / Manufacturing count badge now stays on the same line
  as the tab label (white-space:nowrap) instead of wrapping below, on mobile and desktop.

## v25.424 - Shipment actions (A badge + snooze) + sub-menu notification counters

Brings the PO action system to SHIPMENTS and adds tab counters.
- **Shipment "A" count badge + snooze** (same UX as POs): each shipment row shows a red action-count badge;
  click it → popover listing each action with 1d/3d/7d snooze + wake ("Snoozed by <user>"). Snooze reuses the
  shared `/api/supply/actions/state` store with key `shipact|<ref>|<code>`. Action conditions: no POs linked,
  no Flexport match, over 20 pallets (planned), escalated, shipment dates missing, ETA passed. The old inline
  ⚠ exception tag is superseded by this badge. Shipment-expand sub-tabs (Dates / POs aboard / Timeline) also
  carry per-tab action counts.
- **Sub-menu notification counters**: PLAN, Shipments and Manufacturing sub-tabs now show a count badge of
  rows needing action (open = snoozed excluded). PLAN = POs with open actions; Shipments = shipments with
  open actions; Manufacturing = unaccepted discrepancy SKU rows. Counts compute client-side (consistent with
  the per-row badges) and prefetch in the background so all badges show from any sub-tab. Verified on sandbox:
  Shipments 68, Manufacturing 6. No migration.

## v25.423 - Shipments grid: Planned/Shipping split + FOB filter

PURCHASE ORDERS ▸ SHIPMENTS filters reworked. The old **Active** pill is split into **Planned** and
**Shipping** (by shipment `status`), **defaulting to Planned**. Added a **FOB / Non-FOB** filter (dropdown in
the country/branch row) driven by `mode_eff==='fob'` — "FOB & non-FOB" (all), "Non-FOB only", "FOB only".
Verified counts on live sandbox: Planned 64 · Shipping 15 · Completed 587 · FOB 96 · Non-FOB 570. No migration.

## v25.422 - Analyse consolidation: recommend one container + spillover note

Reverted to a **single 40ft container** recommendation (per Ben) but with a clear overflow note. Phase 1
best-fits nearby POs into one 20-pallet container without overshooting; Phase 2 — only when it's still
notably under-filled and just larger POs remain — adds the smallest PO that tops it over 20 and reports the
spill: **"plus N pallets from PO xxx that won't fit — place on another shipment."** Clean 20/20 fills show no
note (verified: PO-1672805 / PO-55USLX1 fill exactly 20). Oversize anchor reports its own spill. No migration.

## v25.421 - Analyse consolidation: recommendation fills up to two containers

Extended the engine to consolidate **up to two 40ft containers (~40 pallets)**, not just one. A knapsack over
nearby POs finds the **largest total that keeps container utilisation ≥85%**, so it opens/extends into a
second container only when it can fill it well — and it prefers consolidating more goods (40) over stopping
at 20. **Large POs can now be used and span containers** (e.g. a 21–23-pallet PO fills one 40ft and starts a
second, which nearby stock tops up to 40). Verified on live sandbox: PO-1672805 (anchor 0.2) now recommends
40.0 pal across [20,20] at 100%; PO-55USLX1 (anchor 18.9) fills 39.8 at 99%. Oversize POs still show red +
"split off N". No migration.

## v25.420 - Analyse consolidation: smarter recommendation engine + oversize split flags

Rebuilt the recommendation. The old engine just added POs until it crossed 20 pallets, which overshot the
container (e.g. 22.2 → a 30-slot two-container plan, 74% full). The new engine does a **best-fit pack of one
40ft container (20 pal, preferred)** seeded with the anchor, **without overshooting** — on the same example
it now picks 4 POs summing to exactly 20.0 (**100% full**). The banner shows the fill % and prompts to tick
more for a second container. Small totals still recommend a 20ft (10 pal).

**Oversize POs:** any PO over one container (>20 pal) is now shown with its **pallets in red** and a
**"⚠ split off N"** note (N = pallets above whole 40ft loads), on both the anchor summary and the table.
Oversize POs are excluded from the auto-recommendation (they must be split first); if the anchor itself is
oversize the banner says so. No migration.

## v25.419 - Analyse consolidation: sticky Select+PO columns, Pallets to col 3, compact

Mobile table tweaks: the **Select** and **PO** columns are now **sticky/pinned** to the left while the rest
scrolls horizontally; **Pallets** moved to **column 3** (right after PO, so the container-fill size stays
visible with the pinned columns). Tightened the **Select** column (24px, minimal padding — removed the extra
whitespace around the checkbox) and reduced cell padding on mobile (≤640px) for a compact grid. No migration.

## v25.418 - Analyse consolidation: readable anchor line + dd-mmm dates

Anchor summary in the consolidation modal now spans two lines with generous line-height (was squished on
mobile), and the 💡 recommendation chip wraps as a block instead of breaking its background. All dates in
the view are shown as **dd-mmm** (e.g. `30-Jun`) via a `cdate()` formatter — anchor completion, candidate
completion column, and the "no nearby POs" message. No migration.

## v25.417 - Analyse consolidation: mobile fixes

Made the Analyse-consolidation modal usable on mobile: added an always-visible **✕ close button** in the
header (the backdrop was hard to tap on a full-width phone modal), and wrapped the candidate table in a
**horizontal-scroll container** with a `min-width` so columns keep their width and the table scrolls
sideways instead of squashing. No migration.

## v25.416 - Shorten dockandbay.com user in ALL note timelines (incl. demand planner + portal)

Extends the `ben@` shortening to timeline note **bodies and authors** everywhere they render, so older
"<user> created ..." notes (whose full email is baked into the stored body) also show short. A `shortNotes()`
normalizer shortens each notes array at load: supply PO/shipment/sample timelines (inject) and the supplier
**portal** PO/shipment/sample timelines (portal-view). Demand-planner forecast-note authors were already
shortened (v25.415). Display-only; stored data unchanged. No migration.

## v25.415 - New-PO timeline note + shorten dockandbay.com user to "ben@"

Two changes:
1. **New-PO timeline note** — when a PO is **first created**, an internal note **"<user> created new purchase
   order"** is posted to the PO timeline (resolves the PO's supplier, so it notifies them on the portal).
   Fires on genuine creation only across all four PO-creation paths: `po-create`, Cin7 import (new only),
   bulk upload (new rows only), and buy-plan PO creation (insert-detected via RETURNING). Author = the
   logged-in user.
2. **User display shortened** — a dockandbay.com address now shows as just the local part + "@"
   (`ben@dockandbay.com` -> `ben@`) everywhere the user is attributed: the created-shipment / created-PO note
   bodies, escalation emails (server, via `shortUser()`), and — display-side — timeline note authors, snooze
   "by" labels, and forecast-cell note authors. Stored identities (author_email) keep the full address; only
   the shown text is shortened. Other domains are unchanged. No migration.

## v25.414 - New-shipment timeline note (notifies the supplier)

When a shipment is **first created**, an internal timeline note **"<user> created a new shipment"** is now
posted automatically (author = the logged-in Vercel/auth user; falls back to "A user" where no auth email is
forwarded, e.g. sandbox). Because it's an unread internal note, it shows on the supplier's **portal Shipment
Plan** as a Dock & Bay notification. Fires on genuine creation only (not on re-save/edit or an on-conflict
no-op) across all four creation paths: make-master assign, `shipment-create`, the shipment upsert
(insert-detected via `xmax=0`), and Analyse-consolidation. No new endpoint, no migration.

## v25.413 - Analyse consolidation (fill containers from nearby POs)

New **"⊕ Analyse consolidation"** option in the assign-shipment dropdown (under Unassign). For the anchor PO
it opens a modal listing every **same-country** PO whose completion (production-end) date falls within
**±3 weeks**, with each PO's **estimated pallets** (Σ line qty ÷ sku pallet_qty). It recommends a fill,
greedily pre-selecting POs toward a **20-pallet (40ft, preferred)** container and showing the live container
breakdown (20 / 10 pallet slots, splitting overflow e.g. 30 -> 20+10). Tick the POs you want and assign them
to either an **existing shipment** (dropdown of nearby shipments) or a **new master-less consolidation
reference** (pre-filled `P<prod_no>-<COUNTRY>-CONSOL-<n>`, e.g. `P57-UK-CONSOL-1`). Candidates include both
loose POs and POs already on other shipments (so you can merge). FOB / manufacturing-branch POs are excluded.
Endpoints: `GET /api/supply/consolidation?po=`, `POST /api/supply/consolidate`. No migration.

## v25.412 - Crossdock derivation excludes completed POs

The crossdock-into-master-PO derivation now skips linked POs whose status is COMPLETE. Applied in both
places: the `po-detail` `crossdock_lines` query (on-screen ORDER PLAN sub-table) and the Cin7-push append
(`POST /api/supply/po/:po/cin7-lines`). Completed POs' crossdock SKUs are already fulfilled, so they no
longer show as derived rows or get pushed to ERP again. No migration.

## v25.411 - Crossdock SKUs flow into the master PO's order plan (+ $0 + ERP)

When a master-PO shipment has linked POs carrying crossdock SKUs, those crossdock SKUs now appear in the
**master PO's ORDER PLAN** as a derived "Crossdock SKUs on this shipment" sub-table (every crossdock SKU
across the shipment, qty = supplier-entered `crossdock_shipments`, **cost $0** to the master; source PO +
client shown). `po-detail` returns `crossdock_lines` (only when the PO is a shipment master).

They're treated as an **ERP deviation**: once the master PO is **shipped** (status shipped/shipping/deliver/
complete), the order plan flags them as an exception, and the **Cin7 push includes them at $0** (appended to
`/api/supply/po/:po/cin7-lines`, qty>0 only). Derived display; no PO-line data write.

## v25.410 - DB streamlining: drop unused tables (migration 114)

Live audit found dead/orphan tables. **Migration 114** (all DROP IF EXISTS) removes:
- Dead app tables: `buy_plan` (buy plan is client-side, never persisted -- Ben confirmed), `inventory_snapshots`,
  `prepack_bom` (both 0 rows, 0 code refs).
- 9 dated backup snapshots (`*_bak_20260626`, `z_products_bak_20260708/10`, `z_product_countries_bak_20260710`,
  `erp_lines_pruned_20260626`).

**Not dropped (flagged for Diviyaj):** `planner.product_inventory` (~17.7k rows, ETL-fed) is ORPHANED --
`v_product_inventory` unpivots `planner.products.inventory_*` and nothing reads `product_inventory`. Retire
its n8n write step first, then drop the table. Confirmed: **all app on-hand reads resolve to
`planner.products`** (directly for AWD/NonGRS, or via `v_product_inventory`).

## v25.409 - Escalate on shipment + sample timelines

Extended the escalate button (v25.407) to the **shipment** and **sample** timelines, on both the main grid
(internal -> supplier's portal users) and the supplier portal (supplier -> routed internal list). Server
routing refined: a supplier-escalated **shipment** now resolves its master PO's branch for Direct-to-Client
routing; a **sample** routes to the **Product development** list when its `purpose` includes `product`
(the 5 purposes are sales / product / photography / marketing / operations), else the **Samples** list.
No migration.

## v25.408 - Sales Planning: narrower month selector

The month dropdown on SCENARIO > Sales Planning is capped at 20ch wide (was min-width 120px).

## v25.407 - Escalate a timeline message by email + CONFIG ▸ General Settings

- **Escalate button** on the **most recent** timeline note, on both the main-grid PO timeline and the
  supplier portal timeline. Sends that message as an email — subject `horizon escalation - <ref>`, body
  "<user> has escalated this message" + the message + an audience-matched deep link.
- **Routing:** a **supplier** escalation → the CONFIG list matching the context (sample+product-dev →
  Product development; other sample → Samples; branch Direct-to-Client/JLEW/NEXT → Direct-to-Client; else →
  Supply chain), link → planner. A **Dock & Bay** escalation → that supplier's active portal user(s),
  link → portal.
- **CONFIG ▸ General Settings** — new **first** tab (also the default landing) with 4 comma-separated email
  recipient lists. New `app_settings` key/value table (**migration 113**).
- Endpoints: `GET/POST /api/app-settings`, `POST /api/supply/escalate` (internal + preview),
  `POST /api/portal/escalate` (real portal, session-scoped). Live send via Resend; **sandbox has no key so
  nothing sends**. `/api/app-settings` gated as CONFIG.

Note: escalation applies to PO timelines now; shipment/sample timeline escalation reuses the same endpoint
(kind shipment/sample) and is a fast-follow on those surfaces.

## v25.406 - CONFIG ▸ Portal Users: per-supplier open-action counter + reminder email

Each portal-user row now shows an **Open actions** count for that supplier — the same items the supplier
sees in their portal (PO: submit invoice, enter tracking+freight, unread D&B messages, crossdock qty,
confirm order, completion date, production status, DtC approval; Samples: accept, expected date, status).
Computed client-side from `/api/supply/purchase-orders` + new `/api/supply/portal-signals` (bulk unread
notes + submissions) + crossdock + samples, so it matches the portal badges.

Clicking the count opens a **drawer** listing every open action (grouped PO / Sample), with a **✉ Send
reminder email** button — emails the supplier's registered portal address(es) **live via Resend** (new
`POST /api/supply/portal-remind`; recipients derived server-side from active portal users, so an arbitrary
address can't be targeted). Confirm dialog before sending. **Sandbox has no `RESEND_API_KEY` → nothing is
sent there.** No migration.

Note: shipment-plan actions currently surface via their master PO (completion/notes); shipment-note-level
actions are a fast-follow.

## v25.405 - Forecast cell notes (double-click to add)

Per-cell notes on the demand PLAN grid forecast cells (SKU + sub-category rows). **Double-click** a
forecast cell (not the input) opens an "Add note" popup — no plus button. Each note records the text, the
timestamp and the logged-in user. Multiple notes per cell; edit/delete any (DEMAND edit rights). Cells with
notes show a small blue **"N"** badge; a **120ms hover tooltip** lists the notes (text · user · date/time).
Keyed `level|item|country|channel|month` (matches the forecast override key). New table `forecast_notes`
(migration 112); endpoints `GET/POST /api/forecast/notes`, `POST /api/forecast/note/:id`.

## v25.404 - Demand grid: dark-grey gridlines + red border for discontinued

- The demand PLAN grid (`#t`, category + SKU levels) now has **dark-grey cell borders** (#9a9a9a) so every
  cell is visible (was a near-invisible #f0f0f0 bottom border only).
- The small red **"d" badge** on discontinued-rundown months is replaced by a **red border** around the cell
  (inset outline; keeps the "discontinued this month — selling down" tooltip).

## v25.403 - New PURCHASE ORDERS report: Crossdock

New **CROSSDOCK** sub-tab under PURCHASE ORDERS. On-hand + inbound for every `CROSSDOCK%`/`PREORDER%` SKU
across the four 3PL warehouses (UK/US/EU/AU), with:
- **Attribution ("what is this stock?")** in priority: inbound→PO (client/sales-order) ▸ preorder
  (ref/ship date) ▸ assigned crossdock PO (candidates by matching country / non-major-country routing).
- **Unknown** rows (nothing explains the stock) flagged amber, with an editable **note** — auto-wiped once
  that SKU's on-hand + inbound in the warehouse returns to 0 (shipped out). New table `crossdock_notes`
  (migration 111).
- **Crossdock assigned to open POs not yet showing inbound** listed separately (SKU / PO / client / sales
  order / destination / shipped qty).

New endpoints `GET /api/supply/crossdock-report`, `POST /api/supply/crossdock-note`. **Migration 111.**

## v25.402 - Sales Planning: slow-moving + recommended-for-clearance

Added two flags to the Sales Planning report (per SKU, for the selected country+channel):
- **Slow moving** — >26 weeks of trailing cover (units sold in the channel over the last ~13 weeks) or
  no sales in that window. Tooltip shows days-since-last-sale + trailing cover.
- **Rec. clearance** — discontinued with stock that won't clear by the month, OR a badly overstocked
  slow mover (>52wk trailing cover).
Both as columns, both as "Only" filter toggles (combine with the discontinued grouping), and both in the
CSV export. Thresholds (26/52 wk) are easy to tune. Query extended to read trailing sales from
`sales_actuals`.

## v25.401 - Sales Planning: FBA and 3PL as separate columns

Per Ben: on the FBA report, FBA and 3PL are now distinct columns. FBA cover pool = **FBA + AWD (US)**;
**3PL is a separate "(transfer)" column** — stock that could be moved to FBA, not included in the cover
math. Projected/weeks now reflect the true FBA position (can go negative = FBA shortfall).

## v25.400 - New SCENARIO report: Sales Planning

New SCENARIO ▸ SALES PLANNING tab. For a chosen country + channel (3PL/FBA) + month, per SKU:
- **On hand now** (FBA pools FBA + AWD [US] + 3PL, components shown — 3PL is transferable to FBA),
- **Projected stock at the start of the month** = on-hand + inbound landing before the month (incl.
  on-order POs with calculated ETAs) − forecast sell-through before the month,
- **Weeks of cover** at that date (projected ÷ selected-month forecast ÷ 4.33; colour-flagged <4 / <8 wk),
- **Discontinued** by that date (per-country discontinue from planner.products).

Forecast = latest committed SKU-level run (`planner.forecasts`). Sort by on-hand or weeks; group by
discontinued status or flat; export to CSV (filename `sales-planning_<COUNTRY>_<CHANNEL>_<date_time>.csv`).
New endpoint `POST /api/scenario/sales-planning`. No migration.

## v25.399 - FOB POs no longer raise an "unassigned shipment" action

`unassigned_shipment` was `status not complete AND no shipment_ref` — with no FOB exclusion, so FOB POs
(which never take a shipment) were wrongly flagged (e.g. live PO-1700673, branch Manufacturing, country
OT). Now mirrors `isFOBdest`: the flag is suppressed when the branch is Manufacturing OR the destination
country isn't UK/US/AU/EU/CA. Query-only, no migration.

## v25.398 - CONFIG in the mobile menu

CONFIG was missing from the mobile hamburger drawer: the drawer builder kept only `.view-toggle`
buttons with a `data-view` plus `supply-btn`/`scenario-btn`, and the injected `config-btn` has neither
— so it was skipped. Added `config-btn` to the allow-list, tracked its active state, and mirrored the
CONFIG sub-nav (Tax/Freight/Duty/…/Permissions) in the drawer like SUPPLY/SCENARIO.

## v25.397 - PO country filter: DIRECT pill → OTHER (any non-major destination)

The PURCHASE ORDERS country filter's **DIRECT** pill is now **OTHER** and matches any PO whose country
is not one of UK/US/AU/EU/CA (DIRECT, OT, blank, etc.) — previously it only matched the literal `DIRECT`
country and missed things like `OT`. New `ctryMatch()` maps majors to themselves and everything else to
OTHER. (Only the grid filter pill changed; DIRECT remains a real destination for assigning/editing a PO.)

## v25.396 - Retire planner.product_countries (consolidate onto planner.products)

`product_countries` was only still used by the availability view's discontinue gate and a dead per-SKU
duty override (that column was 100% empty). Ben maintains only `planner.products`, so we've consolidated:
- **Migration 110** redefines `v_product_availability` to take the per-country discontinue date from
  `planner.products` (`discontinue_date_au_final` for AU, `discontinue_date_ca` for CA, else
  `discontinue_date_final`), then `DROP TABLE planner.product_countries`.
- Server: removed the dead `product_countries` duty-override join and the launch/discontinue fallback
  (both now read `planner.products` only).
- Availability is now *more* accurate: it correctly excludes 247 in-scope SKUs with a past discontinue
  date in products that `product_countries` had been missing (sandbox available rows 4,760 → 4,673).
- ⚠ Ship migration 110 **with** the v25.396 code (the code drops the last references; the migration drops
  the table).

## v25.395 - Launch/discontinue dates read from planner.products

The demand plan sourced launch/discontinue from `planner.product_countries`, but that table is barely
populated (and Ben only maintains `planner.products`). Result: SKUs like TOWLB-CAB-MD-BLUE (launch 2027)
showed no launch/discontinue dates and were treated as ACTIVE now — forecasting from the current month
instead of being gated FUTURE until launch.

- `buildSKURAW` now reads launch/discontinue per country from `planner.products`
  (`launch_date_<c>_final ▸ launch_date_<c>`, `discontinue_date_final` / `_au_final` / `_ca`), with
  `product_countries` kept only as a coalesce fallback (so a live sync that populates that table still works).
- SKUs now correctly show their launch/discontinue dates and pre-launch SKUs are gated FUTURE.

## v25.394 - On-order POs get a calculated landing date + show as inbound

On-order POs not yet in the freight/inbound feed used to carry no ETA — so they were invisible to the
buy plan's stock projection (it silently ignored placed-but-unshipped POs, over-recommending buys) and
only appeared as a bare "not shipped" count.

- **Server** computes a landing ETA for each such PO using the same logic as the SUPPLY PO view:
  `prod_end (override ▸ start + supplier days) + 7 (ship) + branch sea transit`.
- **Artifact** carries that ETA into `md.inb`, so these POs now land in the SOH projection at their
  computed date (correctly reducing the recommended buy) and appear in the stock-column inbound list +
  hover (marked "on order"). Dedup is intact (open POs are those *not* in the feed).
- The old "On order · not shipped" card is now "On order · no landing date" and only lists POs whose
  production dates are missing (a genuine data gap to fix).

## v25.393 - ERP date deviation counts on the overall PO badge

The ERP delivery-date deviation was showing on the DATES tab but not on the overall PO-ref badge
(they diverged). Promoted `erp_date` to a first-class `PO_ACTCOND` action (mapped to the DATES tab),
so the PO badge now equals the sum of the sub-tab notifications. The DATES count now comes from the
snooze-aware mirror loop (removed the duplicate explicit push). Consequence: a PO whose only
outstanding item is an ERP date deviation now also appears in the ACTION ITEMS filter (previously
excluded) — flag if that's not wanted.

## v25.392 - ERP date deviation snoozable + "Snoozed by <user>" label

- **ERP delivery-date deviation is now snoozable** on the DATES tab: inline Ⓐ + SNOOZE on the
  "⚠ ERP delivery date needs updating" banner (key `erp_date`). Snoozing drops it from the DATES
  tab exception count; the banner + "⬆ Update ERP" button stay. It's deliberately kept out of the
  PO-grid ACTION ITEMS filter (not a `PO_ACTCOND`), matching how ERP deviations are tracked.
- **Snooze label now shows the user**: the inline "Snoozed → date" now reads
  "Snoozed by <email> → date", where the email is the logged-in Vercel/Cloudflare user captured
  server-side (`authUser`). Shows on live; blank on the sandbox tunnel (no auth). The badge popover
  already showed the snoozed-by user.

## v25.391 - "Late — should have shipped" action moved to DATES

`production` ("late — should have shipped") is ship-date-driven, so its inline Ⓐ + snooze now sits on
the **DATES** tab next to the Ship date (was on SHIPMENTS). SHIPMENTS keeps only `unassigned_shipment`.
Also flipped `PO_ACT_TAB.production` shipments→dates so the tab badge count, the PO-ref badge deep-link
and the marker all agree.

## v25.390 - Migration 109 null-safety + sandbox product refresh

- **Migration 109 fix:** the derived-scope trigger + backfill now wrap the expression in
  `coalesce(…, false)`. A null `variant_type` gives `(null='MASTER') AND true = null`, which
  violates the NOT NULL constraint on insert/update. **This matters for live** — without it the
  product sync would fail on any null-variant row that's available. Treat "unknown" as out of scope.
- **Sandbox data:** refreshed `planner.products` from the current Airtable `sku_child` grid export
  (1,043 SKUs, all 172 columns; canonical `product_name`/`supplier`/`case_pack_size` derived from the
  `*_final`/`carton_qty` sources; `in_planning_scope` re-derived → 723 in scope). Sandbox-only, no
  migration — realistic current numbers for testing. (No live impact.)

## v25.389 - Fix "po is not defined" on PURCHASE ORDERS ▸ PLAN

Regression from v25.388: the CLIENT-tab action marker used a bare `po`, but its enclosing
function (`payPanel`) only has `r`. Changed to `r.po`. (The other four markers were already
in functions with a `po` param or used `r.po`.)

## v25.388 - Inline Ⓐ + snooze rolled out to all action types

The inline red Ⓐ (120ms rule tooltip) + SNOOZE ▾ control — previously only on overdue payment
due-cells — now sits next to every action condition, in the tab it belongs to:
- **DATES ▸ Completion** — `late` (should be completed)
- **SHIPMENTS ▸ Shipment/FOB** — `production` (should have shipped) + `unassigned_shipment`
- **SHIPMENTS ▸ Pre-shipment docs** — `preship`
- **CLIENT/FBA ▸ Supplier approval** — `dtc_not_approved`
- **MASTER DATA ▸ Supplier confirmation** — `po_not_approved`

Each marker is gated on its `PO_ACTCOND`, so it shows exactly when the badge counts it, and snoozing
it silently drops the PO-ref badge, the tab count and the ACTION ITEMS filter (v25.387 machinery),
while still showing "Snoozed". "Show snoozed" brings them back.

## v25.387 - Snooze now clears the PAYMENTS tab count too

A snoozed payment (e.g. the completion payment on PO-1700649) cleared the PO-ref badge and the
ACTION ITEMS filter, but the PAYMENTS sub-tab still showed "(1)". The tab count came from
`poExceptions.pay[]`, which pushed the overdue items directly with no snooze check.

- `poExceptions` overdue pushes (start / completion / balance) are now guarded by the
  `payment_overdue` snooze state — so a snooze drops them from the PAYMENTS tab count, consistent
  with the badge and the ACTION ITEMS filter. "Show snoozed" brings them back.
- The snooze stays **silent**: `refreshActInPlace` now also recomputes the open drawer's
  PAYMENTS/DATES/CLIENT/SHIPMENTS tab badges in place (from the stashed PO detail) — no refetch,
  no re-render.

## v25.386 - Planning scope now derived (sync-proof), not sync-fed

Root cause of the LIVE BUY/FBA outage: the overnight n8n product sync clobbered
`in_planning_scope` to false for everything, emptying the planner. Fixed by making
scope **derived in the DB** so a sync write can never break it again.

- **New rule** (Ben, agreed): a SKU is in planning scope iff `variant_type = 'MASTER'`
  **AND** it is available in ≥1 country/channel (any `available_<country>_<channel>` = TRUE).
  SET variants and rows available nowhere are out of scope.
- **Migration 109** adds a `BEFORE INSERT OR UPDATE` trigger on `planner.products`
  (`planner.set_in_planning_scope`) that recomputes the flag on every row write, plus a
  one-time backfill. The sync may keep sending the column; the trigger overrides it.
- No server query changes: all 11 `in_planning_scope` predicates and `v_product_availability`
  keep working unchanged. Per-country/channel granularity still flows via `v_product_availability.av`.
- Sandbox result: 678 SKUs in scope (was 722 — dropped SET variants + MASTERs available nowhere).

## v25.385 - Buy plan on-order: reconcile the PLAN detail with the grid

Not a calc bug — the three figures were three views. Made the PLAN detail reconcile:
- **On Order card now shows the total** (3PL + FBA) with the split as its subtitle (e.g. "5,283 3PL · 960
  FBA" = 6,243), matching the grid (was showing 3PL-only).
- **Open POs counted in on-order but not yet in the inbound feed** (no inbound_shipments record, so no ETA)
  now surface as an **"On order · not shipped"** card with the PO refs — so the inbound line items reconcile
  with On Order (inbound + not-shipped = total). Server injects these as `_SKU_RAW.oi` (same dedup/mapping as
  the on-order calc); artifact reads `SKUOI`.

## v25.384 - Snooze polish: fix "today", silent in-place update, Ⓐ stays as "Snoozed"

- Fixed `today is not defined` on snooze (`poActSnoozed` now computes the date itself).
- Snoozing/waking updates **silently in place** — no screen/panel refresh: the marker swaps to "Snoozed →
  date · wake" and the PO-ref action count recomputes, without reloading. Applied to the inline Ⓐ, the SNOOZE
  menu, and the badge popover.
- The **Ⓐ stays visible** when snoozed (muted red) reading "Snoozed → date"; only the count badges drop it.
  The tooltip also notes who snoozed it and until when.

## v25.383 - Inline action snooze: single SNOOZE button with a 1/3/7-day popup

Replaced the three inline day-buttons with one **SNOOZE ▾** that pops a **1 / 3 / 7 days** menu (Ⓐ + tooltip
unchanged).

## v25.382 - Inline action marker: red Ⓐ + 120ms tooltip + snooze (payments first)

New reusable inline indicator: a **red Ⓐ** (A = Action) with a **120ms tooltip** explaining the action + its
rule, plus **1 / 3 / 7-day snooze** (or "wake") right next to the exception. Keyed to the same condition as
the PO-ref badge, so snoozing the Ⓐ, the badge, or the popover are one and the same. Wired first to the
**overdue payment dates** in the PLAN ▸ payments grid (your example). Rolls out to the other exception types
(late / should-have-shipped / DtC / pre-shipment) next.

## v25.381 - Fix: PO-ref badge count now matches the detail sub-tabs

The red PO-ref badge counted `PO_ACTCOND` conditions (e.g. late / should-have-shipped / DtC-not-approved)
that the detail's `poExceptions` sub-tabs never surfaced — so a PO could show "(3)" with empty tabs and no
red highlighting. `poExceptions` now **mirrors the badge conditions onto their sub-tabs** (DATES / SHIPMENTS /
CLICK-FBA / CLIENT), snooze-aware, so the tab badges light up consistently with the count. (Snooze the items
by clicking the red badge → popover.)

## v25.380 - Snooze actions part 2: PO-grid badges + ACTION ITEMS counter are snooze-aware

- Clicking a PO's **red action badge** now opens a **popover** listing each action item with **1 / 3 / 7-day
  snooze** (or "wake"), the **"snoozed → date by email on time"** label, and an **open ↗** deep-link.
- Snoozed items drop off the red badge **and** the **ACTION ITEMS** count until they expire (keys
  `poact|<po>|<condition>` in the shared `supply_action_state`). The ACTION ITEMS filter now mirrors the red
  badges (snooze-aware) rather than the broader poExceptions set.
- New **"show snoozed"** toggle next to the **⚠ All exceptions…** dropdown — surfaces snoozed items back in
  the badges/counts so they can be reviewed/woken.
- New `GET /api/supply/actions/state` feeds the grid the snooze map.

## v25.379 - Snooze actions: "snoozed by … on …" label, 1/3/7-day presets, show-snoozed toggle

SUPPLY ▸ Actions snooze upgrades (part 1 of the snooze feature):
- Snooze now records **who** (email via authUser) and **when** (`supply_action_state.snoozed_by` +
  `snoozed_at`, migration 108) — shown as a **"snoozed by ben@… on 2026-07-10 05:37"** label on each
  snoozed/dismissed card.
- Snooze presets changed to **1 / 3 / 7 days** (were 1wk/1mo).
- New **"show snoozed as active"** toggle on the Status bar — surfaces snoozed items back in the Open view
  so they can be reviewed/un-snoozed.
- (Next: make the PO-grid red badges + ACTION ITEMS counter snooze-aware.)

## v25.378 - Fix: FBA Cartons pills (Any/Full/Partial) active state stuck

The cartons pills only called `render()` on click and relied on a toolbar rebuild to repaint the active
pill — which didn't happen reliably, so after a click the selected pill's colour didn't update. Now they
toggle their own active class + opacity in-place on click (same pattern as the Buy pills), then render.

## v25.377 - Pre-shipment docs: supplier portal downloads

- **ASN pallet labels** now downloadable on the supplier portal for Coghlans POs (new gate-exempt
  `GET /api/portal/asn-labels/:po` + a "⤓ ASN Pallet Labels" button in the PO's Documents section).
- **Carton/pallet barcodes + IDN labels** already surface on the portal automatically — they're
  `portal_attachments` (non-'client'), so the portal's per-PO Documents list shows them with download links.
- Remaining nicety: a "NEW …" unread timeline counter when docs are added (downloads work regardless).

## v25.376 - Pre-shipment docs: grid-level overdue counter

The pre-shipment overdue now shows on the **red PO-ref action badge** in the Purchase Orders grid (new
`preship` condition, routes to the SHIPMENTS tab) as well as the ACTION ITEMS filter (already counted via
poExceptions). Covers all three rules (ASN / FBA barcodes / EU IDN labels).

## v25.375 - Pre-shipment docs Rules 2 & 3: FBA/AWD barcode + EU IDN-label uploads

On the SHIPMENTS sub-tab, branch-conditional upload blocks (admin uploads → supplier downloads on the portal),
reusing `portal_attachments` with a category tag:
- **FBA / AWD** (UK/US/CA FBA, US AWD): **Carton barcodes** + **Pallet barcodes** upload/list/download.
- **EU iFulfillment**: **IDN pallet labels** upload/list/download.
Each shows an ⚠ overdue note when production has ended and the doc is missing, and feeds the same
SHIPMENTS-tab exception counter (scoped to PRODUCTION/ready-to-ship, suppressed by "not required").
PO payload now carries `doc_cats` (categories present) so the exception detects missing uploads.

## v25.374 - Pre-shipment docs: scope to PRODUCTION/ready-to-ship + "not required" tick

- The pre-shipment overdue exception now fires **only for PRODUCTION or ready-to-ship POs** (not
  future/shipped/complete).
- New **"Not required"** checkbox on the SHIPMENTS sub-tab (any branch with a doc rule) → suppresses the
  overdue action for that PO. Stored as `purchase_orders.preship_not_required` (migration 107); the shared
  field-save handler now supports checkboxes.

## v25.373 - ASN overdue exception + PROD/BATCH dropdowns + Commercial Invoice button moved

- **Pre-shipment docs Rule 1 exception:** a Coghlans PO past its production-end date (override ▸ computed)
  with no ASN numbers now raises an overdue exception — red count on the PO's SHIPMENTS sub-tab + a red
  "⚠ ASN pallet labels overdue" banner in the panel. (Row badge + SUPPLY ▸ Actions integration next.)
- **PROD / BATCH filter dropdowns:** both list **most-recent first (descending)**; **PROD shows ACTIVE
  productions only** (server: `status='ACTIVE' ORDER BY prod_no DESC`; batches already descending).
- **Commercial Invoice button moved:** from the PO detail sub-nav to **under "Total amount due", above the
  Payment plan grid**.

## v25.372 - Pre-shipment docs (Rule 1): AU Coghlans ASN entry + pallet-label PDF

First slice of the pre-shipment documents feature. On a PO's PLAN ▸ SHIPMENTS sub-tab, the **ASN numbers**
entry now shows **only for AU Coghlans** POs (1 ASN per pallet, comma-separated) with a **⤓ ASN PALLET LABELS**
button. New `asnpdf.mjs` (dependency-free) + `GET /api/asn-labels/:po` generate an **A4 landscape** PDF, one
page per ASN: large centred `DOCK & BAY PTY LTD` / `ASN# …` / `PALLET n`.
(Still to come: the overdue exception/counter, the portal download + "NEW ASN" timeline, and Rules 2/3
uploads for FBA/AWD + EU iFulfillment.)

## v25.371 - Invoice/Packing List download buttons (4 surfaces)

Wired the generator endpoints into the UI:
- **Supply ▸ Purchase Orders ▸ PLAN** — "📄 Commercial Invoice" button in the PO detail sub-nav.
- **Supply ▸ Shipments** (drawer) — "📄 Tax Invoice" button under Freight & tracking.
- **Portal ▸ Purchase Orders** — "📄" download in each PO's MANAGE cell (Commercial Invoice).
- **Portal ▸ Shipment Plan** — "📄 Tax Invoice" button in each shipment's expanded body.
Each opens `/api/invoice/po/:po` or `/api/invoice/shipment/:ref`.

## v25.370 - Shipment drawer: Flexport reference is now a clickable link

The "🔗 Linked to Flexport (FLEX-xxxxx)" reference in the shipment drawer now links to the Flexport
shipment page (`https://app.flexport.com/shipments/<id>`, matching the existing ↗ link in the shipment
list row).

## v25.369 - Invoice + Packing List generator (Commercial / Tax) — endpoints + engine

New `invoice.mjs` (ExcelJS) fills the supplier template as a formatting shell with live data.
- `GET /api/invoice/po/:po` → **Commercial Invoice** (one PO). `GET /api/invoice/shipment/:ref` → **Tax
  Invoice** (all POs on that shipment; lines merged by SKU, header from the master shipment PO's supplier).
- Header A1 = supplier company name + `Textile Exchange-ID (TE-ID): …` when set (new `suppliers.te_id`,
  migration 106; seeded Lixin=TE-00055808). Consignee/notify by delivery country (UK fallback). Lines carry
  SKU, invoice title, HS code (per country, US fallback), qty, unit price, amount; CERT "GRS" / "100%" only
  when `grs_approved='1 checked out of 1'`. Packing List: carton size, cartons, pcs, GW, order qty (centred).
- Table auto-expands past the template's 27-row block for large shipments (verified on a 126-SKU shipment).
- Adds the **exceljs** dependency + bundles `templates/invoice-packing-template.xlsx` (runtime shell).
- Buttons (portal + supply) come next.

## v25.368 - Import PO from Cin7: auto-filter the grid to the imported PO

After a successful import, the imported PO number is dropped into the Purchase Orders search box so the grid
immediately filters to just that PO (search spans all statuses, so it shows regardless of the status pill).

## v25.367 - Import PO from Cin7: land as PRODUCTION (not FUTURE)

Newly imported POs were created with status FUTURE, which the Purchase Orders grid's default "In progress"
filter hides — so an imported PO looked missing until you switched to Future/All. Imported POs now land as
**PRODUCTION** so they show under the default filter. (Overwriting an existing PO still leaves its status
untouched.)

## v25.366 - Fix: move Consignees endpoints off /api/supply/ (route collision)

The consignee routes were shadowed by the generic `/api/supply/:section` (GET) and `/api/supply/:po`
(POST) catch-alls. Moved them to `/api/consignees`, `/api/consignee`, `/api/consignee/:country/delete`
and gated the writes as config in the permission guard. Verified: list works, sandbox write allowed,
read-only live user blocked (403).

## v25.365 - CONFIG ▸ Consignees + invoice product fields (invoice-generator groundwork)

Groundwork for the Commercial/Tax Invoice + Packing List generator.
- **CONFIG ▸ Consignees** (new sub-tab, styled like Import tax): consignee + notify-party (+ port of
  discharge) addresses per delivery country, editable. **Any country not listed falls back to UK.**
  Table `planner.invoice_consignees` (migration 105), seeded UK/US/EU/AU from the template. New endpoints
  `GET /api/supply/consignees`, `POST /api/supply/consignee`, `.../:country/delete` (config-gated).
- **products invoice fields** (migration 104): `sku_invoice_title` + `hscode_uk/us/eu/ca/au`, sourced from
  Ben's CSV (Airtable-owned). Generator uses `hscode_<country>` with `hscode_us` as the fallback.

## v25.364 - FBA Cartons filter: add "Any" (default) + scope to Transfer FBA modes

Fix: the Full/Partial cartons sizing defaulted to **Full**, which zeroes the transfer for any SKU whose
90-day FBA demand is under ~0.7 of a carton — so under **Transfer FBA** (which hides rows with 0 transfer)
the grid showed nothing.
- Added **Any** (new default): full shortfall within the 50% cap, no carton rounding and no min-size floor,
  so every SKU with real FBA need shows.
- The Any / Full / Partial pills now appear **only** under **Transfer FBA** or **Transfer FBA (non GRS)**
  (carton sizing is irrelevant otherwise).

## v25.363 - Permissions enforcement: server guard + read-only UX

Phases 3 + 4 of access control (the actual lock).
- **Server guard** (server.mjs): one middleware before all routes classifies every write request as
  demand / supply / config and blocks it (403 `{code:'readonly'}`) unless the caller holds the grant.
  **Live-only** — sandbox/local has no auth-proxy email so every request passes (Ben never locks himself
  out). Reads (GET) always open. Never gated: supplier portal (`/api/portal/*`), SCENARIO, `/api/me`,
  `/api/ai`, and the permissions API (self-checks admin). Config writes accept SUPPLY *or* DEMAND edit.
  All five seeded users are full-access, so no one is restricted today — the guard only bites on future
  partial grants.
- **Client UX**: a global 403-readonly toast (covers every view incl. DEMAND/FBA) + a read-only banner on
  SUPPLY/CONFIG when you lack the edit right. FBA Override + SCENARIO stay editable by all.

## v25.362 - Permissions: table + API + admin-only Config panel

Phase 2 of access control (see migration **103_app_permissions.sql**).
- New table `planner.app_permissions` (email, supply_edit, demand_edit, is_admin) — seeded with ben /
  diviyaj / sarah / andy / abi @dockandbay.com, all admin + full edit.
- Server: `permsFor(req)` resolves the caller's rights from the Gmail email (`authUser`); **live-only** —
  no auth proxy (sandbox) = full access. New endpoints: `GET /api/me` (what to enable client-side), and
  **admin-only** `GET/POST /api/config/permissions` + `DELETE /api/config/permissions/:email`
  (with a last-admin lockout guard).
- UI: a **Permissions** sub-tab under CONFIG, shown only to admins — grant/revoke SUPPLY / DEMAND / Admin
  per email, add by email, changes save immediately.
- No enforcement yet (that's the next phase) — this adds the model, API and admin surface.

## v25.361 - CONFIG promoted to a top-level menu item (out of SUPPLY)

- **CONFIG is now its own top-level view** in the header nav (alongside DEMAND / SUPPLY / BUY / FBA /
  REPORTS / SCENARIO), no longer a sub-tab under SUPPLY. Reached via a new `CONFIG` button and the
  `#/config` route (legacy `#/supply/config/...` links still resolve to it). It reuses the SUPPLY render
  surface but hides the SUPPLY section sub-nav (`config-mode` class); its own sub-tabs (Import tax,
  Freight, Suppliers, …) are unchanged. First of the permissions work — Config is being separated so it
  can carry the access model.

## v25.360 - PO filters: tighter labels, "Prod", drop "Exceptions" + "Ship to" labels

- Reduced the label→control gap on mobile filter items (`gap:5px` → `3px`).
- Renamed the **Production** filter label to **Prod**.
- Removed the **Exceptions** label (the dropdown's own "⚠ All exceptions…" text is self-explanatory).
- Removed the **Ship to** label (the country pills are self-explanatory).

## v25.359 - Purchase Orders filters really go 2-per-row on mobile

The 50/50 filter items were still stacking one-per-row on phones: the `≤640px` `.bar{gap:5px 6px}`
rule added a **6px column-gap**, so two items at 50% + 6px > 100% and wrapped. Added
`column-gap:0!important` on `#po-ctry`/`#po-act` so the pairs sit two-up (label + dropdown/pill fit in
each half via `box-sizing:border-box` + `padding-right:8px`). Row-gap and Ship-to's own row unchanged.

## v25.358 - Import PO from Cin7: no phantom ERP drift + light-blue toggle on the left

- **Import from Cin7 now mirrors the ERP lines.** Previously an imported PO showed an immediate
  qty discrepancy because only `purchase_order_lines` was written (stamped `proposed`), while the
  drift comparison reads `planner.erp_purchase_order_lines` — which was left empty. Now the import
  populates the ERP mirror with the SAME qty and cost it just imported, sets `erp_qty`/`erp_cost` on
  the planner lines, and clears `proposed_at`/`proposed_by`. Result: a freshly imported PO reads as
  fully in-sync with the ERP (no "Needs ERP" / drift flag). Cost is taken from Cin7's `unitCost`.
- **Import/Export button** is now **light blue** and sits **on the left**, on the same row right after
  the "Filter PO / supplier" box (was pushed to the far right with `margin-left:auto`).

## v25.357 - Import PO from Cin7 button uses up arrow

- Changed the "Import PO from Cin7" button glyph from ⬇ to ⬆ (import pulls a PO up into the planner).

## v25.356 - Default landing = SUPPLY ▸ Purchase Orders + fix mobile filter columns

- **Default landing page is now SUPPLY ▸ Purchase Orders** — on a fresh load with no URL hash, the app routes
  to `#/supply/purchase-orders` (deep-links to other views still open as before).
- **Fixed mobile filters** (v25.355 regression): the 50/50 items were forced to one column by the phone
  `#po-ctry>*{margin:… 4px …}` rule pushing two items past 100%. Now `margin:3px 0` + `!important` widths so
  they pair 2-per-row. Ship-to tightened further (label margin 2px, pill padding 2px 4px) so all country pills
  (incl. DIRECT) fit on one line.

## v25.355 - Purchase Orders filters: 2-per-row on mobile

Wrapped each PO filter (Supplier, Branch, Production, Batch, Action items, Needs ERP, Exceptions, Group) in
a `.po-filt-item`. On mobile (≤700px) they lay out **2 per row (50/50)** in order — Supplier/Branch,
Production/Batch, Action items/Needs ERP, Exceptions/Group — with label padding removed and controls filling
their half. **Ship-to** sits on its own full-width row with tighter pill padding so all country pills fit on
one line. Desktop layout unchanged (inline).

## v25.354 - Purchase Orders: hide count + ERP-match summary on mobile

On phones (≤700px) the "N / M POs" count line and the "ERP match: … in sync / drift / date ≠ ERP" summary
are hidden to save space; both still show on desktop.

## v25.353 - Purchase Orders: "Import/Export" pop-down for the action buttons

Consolidated the row of PO action buttons (+ New PO, Upload POs, Import PO from Cin7, CSV for Fulfil, Sync
Cin7 dates) behind an **"⇅ Import/Export"** toggle on the same row as the "⚙ Filters" button — it pops down a
bar showing all five (was a wide row of buttons, awkward on mobile). Button ids/handlers unchanged.

## v25.352 - Import a PO from Cin7 into the planner

New **"⬇ Import PO from Cin7"** button on SUPPLY ▸ Purchase Orders → popup: enter a Cin7 PO number, it reads
that PO from Cin7 and imports it into the planner.
- Maps supplier (reverse `suppliers.cin7_member_id`, else the Cin7 company name), branch (Cin7 branchId →
  branch name), and the line SKUs + quantities (imported as-is, incl. unknown SKUs). Also brings the delivery
  date (→ `delivery_date_overide`) and shows the Cin7 currency.
- Preview first (supplier / branch / currency / delivery / lines / "already exists" flag), then Import.
- If the PO already exists, its lines are **overwritten** from Cin7. Mirrors the Cin7 id so future pushes
  update rather than duplicate. Endpoint `POST /api/supply/po-import-cin7` (preview vs confirm).
- Note: currency is shown but not stored on the PO (no column — it's derivable from the supplier).

## v25.351 - Remove the "open Cin7 PO" link from the Cin7 upload modal

Removed the "— open Cin7 PO ↗" link from both push results (lines + date) in the SUPPLY ERP/Cin7 upload modal.

## v25.350 - Cin7: keep estimatedDeliveryDate on update + corrective PUT

Moved `estimatedDeliveryDate` (completion date) into the shared `poFields`, so the update and the corrective
PUT carry it too — previously only the create sent it, so a follow-up PUT could drop the delivery date.

## v25.349 - Cin7 UPDATE now re-asserts PO fields (fixes update→sales-order)

The update PUT only sent `{id, lineItems, memberId, isApproved}` — missing `company`/`branchId`, which let
Cin7 reclassify the order as a **sales order** on update. Now create, update AND the corrective PUT all send
the same PO-anchoring fields (`memberId` + `company` + `branchId` + `isApproved:false` draft) via a shared
`poFields`; branchId is resolved up-front for both paths. Update no longer preserves a stray `isApproved:true`.

## v25.348 - Cin7 PO create: drop the `stage` field

Removed `stage: 'New'` from the Cin7 PO create payload — let Cin7 apply the account's default PO stage.
The account's real POs use a custom stage ('Production'); forcing 'New' put new POs in the wrong workflow
stage. (Update calls never sent a stage.)

## v25.347 - Log every Cin7 API call to a file (server-side, for analysis)

`cin7Fetch` now appends every Cin7 call (timestamp, method, url, request body, HTTP status, response body)
to `cin7-calls.jsonl` (gitignored) and a short line to the server log. Covers all Cin7 traffic, not just the
push. Response body read from a clone so callers are unaffected.

## v25.346 - Cin7 push shows an API-call trace in the popup (debugging)

The Cin7 push now returns `cin7_trace` — each Cin7 call it made (reference pre-check, create/update) with the
request payload, HTTP status and response — and the SUPPLY PO popup shows it in a collapsed "Cin7 API calls"
section (on success and error). Makes it visible what was sent/returned when debugging PO-vs-sales-order issues.

## v25.345 - Cin7 reference-collision error reflects void-only (cannot delete)

Cin7 can only void orders, not delete, and a voided order still reserves the reference — so the collision
error now says to push under a unique reference (there is no delete option).

## v25.344 - Cin7 reference-collision fix + FBA Cartons pills

- **Cin7 push no longer fails silently on a reference collision.** Before creating, we look up any existing
  Cin7 order (PO or SO, incl. voided) with that reference: if a live PO exists we reconnect and update it; if
  a voided/sales order holds the reference we return a clear error (Cin7 won't create a duplicate — delete/
  rename it in Cin7 or use a new reference). Also surface a create that returns no id (was silent).
  Root cause of PO-55USWK1: a voided sales order (id 1632868) held that reference, blocking the create.
- **FBA Cartons filter is now pills** (Full / Partial) next to the FBA mode pills, FBA-view only — moved out
  of the hidden Settings panel.

## v25.343 - FBA tab: SKU+Category on one row; Type badges (S/C) + header tooltip

Moved SKU search onto the Category row (SKU first); Type column shows single-letter badges (Seasonal=green S,
Core=blue C, Non-core=orange C) with a "Core or seasonal" tooltip on the header.

## v25.342 - FBA transfer: CARTONS Full/Partial filter + robust case-pack

- New **Cartons: Full (default) / Partial** toggle on the FBA transfer toolbar. Full = whole cartons only
  (the existing full-carton logic); Partial = ship the exact shortfall within the 50% cap (part-cartons
  allowed), keeping the min-size floor.
- **`cp` (case pack) now falls back to `carton_qty` when `case_pack_size` is empty** (server PROD_CONST).
  Previously ~65% of SKUs had no case_pack_size → cp defaulted to 1 → the full-carton rounding was a no-op
  and recommendations came out as raw numbers (e.g. 111). Now they round to the real carton.

Note: for SKUs that DO have a case pack (e.g. TOWLB-CAB-LG-KHAKI-R = 40 on both live+sandbox), the
recommendation already rounds — a non-multiple there means the "Transfer FBA (non GRS)" mode (ships all
non-GRS stock, unrounded) or an adjacent SOH/demand column, not the recommendation.

## v25.341 - Cin7: store supplier memberId + send on update + throttle all calls

- **Migration 102**: `planner.suppliers.cin7_member_id` — stores each supplier's Cin7 contact id (seeded
  for 9 single-match suppliers incl. Weireken=22962; ambiguous/no-match left NULL → falls back to name lookup).
- Cin7 PO push now resolves the supplier `memberId` **once** (stored id → name lookup) and **sends it on BOTH
  create and update** — an update now re-asserts the supplier link (previously updates sent only id + lines +
  approval, so a mis-filed order couldn't be corrected).
- **All 11 Cin7 API calls now go through a throttled `cin7Fetch`** — serialised with a ~400ms gap (~2.5/sec,
  under Cin7's 3/sec cap) and auto-retry on HTTP 429 honouring Retry-After. Fixes the rate-limit rejections.

## v25.340 - Fix FBA Transfer Upload file (US errors)

Matches Amazon's current Send-to-Amazon template and clears the upload errors:
- **Default prep owner = Seller** and **Default labeling owner = Seller** rows added for ALL regions
  (were only on the metric/UK layout — US was missing them → the B0 errors). Layout now: title r1,
  owners r3-4, section labels r7, headers r8, data r9.
- **Zero-quantity rows are no longer emitted** (fixes the B8/B9/F8/F9 invalid-quantity/boxes errors and
  the "qty 0 should never happen" issue).
- **Box dimensions rounded to whole numbers** (0 decimals).
- **Case-pack columns (units/box, #boxes, box dims) only when the ticked qty is an exact multiple of the
  case pack** (Amazon requires Quantity = Units per box × Number of boxes → fixes the E11/F11 mismatch).
  Non-multiple quantities are sent as loose units with the case-pack columns blank.

## v25.339 - Samples: flag past-expected-date-while-in-production conflict

Common-sense check: if a sample's Expected completion date is in the past but status is still
"In production", that's contradictory — now highlights the Status + Expected fields red, shows a
"⚠ Expected completion date has passed but status is still In production" message, and counts as a
sample action (top + per-row badge).

## v25.338 - Samples completion date + status save silently (no reload)

The Samples Status and Expected-completion-date fields now auto-save on change and refresh in place
(the one sample card + its row/top badges) instead of triggering a full `reload()`. So entering them
updates silently without a screen refresh, the must-enter badges clear immediately, and the tab/scroll
position is kept. The Save button is silent too.

## v25.337 - Samples: status dropdown + must-enter exceptions + admin read-through

- Migration **101_sample_production_status.sql**: adds `production_status` to `planner.sample_requests`.
- Portal Samples card: new **Status** dropdown (Not started / In production / Ready to ship / Shipped),
  mirroring the PO production status. Auto-saves on change (and on Save).
- **Exceptions (count as sample actions):** blank **expected completion date** and blank **status** each
  show a red "⚠ Must enter…" badge and count on the Samples badge (top + per-row), same as POs. Also a past
  expected date while still in production counts. Gated to active (non-cancelled/complete) samples.
- **Read-through:** the supplier's production status now shows on the SUPPLY ▸ Samples grid under the status chip.
- server: `sample-update` accepts `production_status`; both samples queries (portal + admin) return it.

## v25.336 - Fix portal completion-date binding/reset/badge

The completion-date handler saved the submission but never updated local state, so: (a) it didn't
sync to the PO grid row, (b) changing production status re-rendered from stale data and blanked it, and
(c) the "Must enter completion date" badge stayed. Now on save it updates `_ppData.subsByPo`, syncs every
`.pp-cd-grid` input for the PO, re-renders the open row, and refreshes the badges — so grid + TIMELINE
stay in sync, the date survives a status change, and the red badge clears once a date is entered.

## v25.335 - Portal TIMELINE completion date + revised production statuses

- **Completion date on the TIMELINE tab** (under Production status): a date field bound to the PO's
  production-end (`end_production_overide`) — the same value the PO grid edits, kept in sync. Saved as a
  `completion_date` submission for Dock&Bay approval (staged, per Ben).
- **Blank completion date = exception**: red "⚠ Must enter completion date" badge + it counts on the
  TIMELINE sub-tab badge and the Purchase Orders action badges. Gated to confirmation-required, not-yet-shipped POs.
- **Past completion date while In production** stays a red production-status exception (counts as an action).
- **Production statuses revised** (portal + main grid + server mapping): removed "Nearing completion" and
  "Complete", added "Ready to ship". Supplier ends at Shipped; statuses map to the main grid stages
  (ready_to_ship → production-complete). Updated BI-alert + payment-milestone logic that referenced 'complete'.
- POS_SQL_PORTAL now exposes `completion_date` (raw end_production_overide) so the portal can tell an
  entered date from a derived one.

## v25.333 - Portal shipment-plan FOB label "Production end date" -> "Ship Date"

FOB shipment-plan card label renamed to "Ship Date".

## v25.332 - Portal deposits fix + 2dp money + bigger samples text

- **Deposits Drawn down / Remaining were wrong** — the portal read the stored `deposits` columns;
  the main plan *computes* them. Portal now computes identically (used = Σ PO start-deposit assigned per
  ref; remaining = pooled amount − used), so they match SUPPLY ▸ Purchase Orders ▸ Deposits. Verified
  against Lixin.
- Deposits now **sorted newest-first** (date_paid desc); summary totals deduped by reference.
- **Payments & deposits now show 2 decimal places** (money format), not rounded to integers.
- **Samples card text enlarged** — card base 13px, labels 11px, `.tiny`/`.mut` scaled up (Ship to,
  SKUs & quantities, Purpose, Completion required, etc.).

## v25.331 - Portal SHIPMENT PLAN notifications + samples unread-as-action

- **Shipment Plan notifications:** top-menu badge next to "Shipment Plan" + a per-shipment counter
  before the PO number on each card. Counts = FOB production-end pending (not submitted / rejected)
  + unread Dock&Bay timeline notes. Opening a shipment's timeline marks its D&B notes read → clears it.
- Wired the previously-missing **portal shipment-note endpoints** (they were never reachable while the
  Shipment Plan tab was empty): GET `/api/portal/shipment-notes/:ref`, POST `/api/portal/shipment-note`,
  POST `/api/portal/shipment-notes-read` (all ownership-checked). Bootstrap now attaches `unread_dnb`
  per real shipment. Escalate button hidden on the real portal (D&B-only action).
- **Samples:** an unread Dock&Bay message now counts as a per-sample action (not just the top badge) —
  so a sample like SR-6 shows a notification on its row too. `sampActions` = needs-accept + unread.

Note: the empty Shipment Plan tab on LIVE for Lixin is the **deploy gap** — the shipmentPlan-in-bootstrap
work (v25.327+) isn't on live yet. Data is fine (Lixin: 37 POs / 38 shipments, name matches). Deploy the
branch and it populates.

## v25.330 - Portal PURCHASE ORDERS top-menu action badge

Added an action-count badge next to "Purchase Orders" in the portal top menu (mirrors SAMPLES).
Counts genuine supplier actions across all POs: invoice due, needs-confirm, unread D&B notes,
crossdock qty missing (when shipping), production exception, DTC pending. Deliberately excludes the
per-PO "no shipment yet" term (a passive state — would show ~1 per in-production PO). Shipment Plan
badge placeholder added; its action definition pending Ben.

## v25.329 - Portal SAMPLES top-menu badge shows action count

The SAMPLES tab badge (top menu) now counts supplier actions — samples needing (re-)accept PLUS
unread Dock&Bay notes — not just unread notes. So an unaccepted sample (e.g. Lixin's "(1)") now
surfaces as a notification next to SAMPLES.

## v25.328 - Portal Samples card: force left alignment

The Samples card on the supplier portal had right-aligned items (Completion required, Charges,
Timeline, "No timeline entries yet"). Forced the whole card left-aligned and removed the
`margin-left:auto` on Completion required. Portal content should always be left-aligned.

## v25.327 - Portal Shipment Plan now populated for real suppliers (Samples follow-on)

Closes the deferred Samples/portal item: the real `/api/portal/bootstrap` didn't return `shipmentPlan`,
so the supplier portal's Shipment Plan tab (and its freight-charge form) was empty for real suppliers —
only the admin CONFIG▸Portal preview had it.

- server.mjs: extracted the shipment-plan logic into a shared `buildShipmentPlan()` helper; the admin
  `/api/supply/shipment-plan` case now calls it (behaviour unchanged, verified 64 shipments).
- `/api/portal/bootstrap` now returns `shipmentPlan`, filtered to shipments the supplier is on — as the
  consolidator (master) OR with a PO aboard (so they see who consolidates their goods / whose POs share
  their shipment). Verified: Lixin gets 22 entries.
- inject.html admin preview filter widened to match (supplier on the shipment as master OR member), so the
  preview equals the real portal.

## v25.326 - Cin7 PO push: use supplier default_currency (not hardcoded USD)

The Cin7 PO currency now comes from `planner.suppliers.default_currency` instead of a hardcoded
'USD'. All suppliers are USD today, but GBP/EUR/AUD/CAD are supported for when one changes.

- server.mjs `cin7-lines`: PO's supplier lookup now joins `planner.suppliers` (by `supplier_id`,
  falling back to name) to get `default_currency`; the create payload sets
  `currencyCode: <supplier currency>` (default USD).
- Price validation simplified to a direct compare (factor 1) for all currencies — line cost is held
  in the supplier's currency, which is the order currency, so no rate conversion is needed (a GBP
  order has currencyRate=1 vs the GBP account base — same calculation).
- Follow-on: Fulfil invoices should align to the same supplier currency when that integration lands.

## v25.325 - Cin7 PO push: force currencyCode=USD

Cin7 PO creates now set `currencyCode: 'USD'` (all suppliers invoice in USD). Previously the PO
defaulted to the account currency (GBP) and our USD line costs were mislabelled as GBP — e.g.
PO-57USLX3 showed a £61,481.99 total that was really the USD figure. Cin7 looks up the rate itself.

- server.mjs `/api/supply/po/:po/cin7-lines`: add `currencyCode: 'USD'` to the create payload.
- Price validation is now currency-aware: for USD orders it compares line `unitPrice` to plan USD
  directly (no rate math); legacy non-USD (GBP) orders still convert via `currencyRate`.
- Only affects newly-created POs. Existing GBP POs keep their currency until re-created.

## v25.324 - Inventory sourced from planner.products + all inventory fields numeric

All on-hand inventory reads now come from `planner.products.inventory_*` instead of the
legacy `planner.product_inventory` table (fresher, live/Airtable-fed, and carries the extra
us_awd / uk_nongrs / us_nongrs pools). The inventory columns are also normalised to numeric.

- Migration **100_inventory_from_products.sql** (revised — self-contained, safe to re-run):
  - Converts the 10 text inventory columns (`inventory_*_3pl/fba` + `inventory_us_awd`) to
    **numeric**; the two nongrs columns were already numeric — so ALL inventory fields are now
    numeric. Data verified junk-free on sandbox + live; defensive cast (non-numeric/blank → NULL).
  - Creates `planner.v_product_inventory` — a view unpivoting products' 9 warehouse columns into
    the same `(sku, warehouse, available)` shape the old table had (identical aggregation semantics).
  - No `safe_int` helper needed any more (columns are numeric).
- server.mjs: repointed all 15 `product_inventory` reads → `v_product_inventory`. AWD pool
  re-sourced `awd_us` → `inventory_us_awd` at all sites. NonGRS already read `inventory_uk/us_nongrs`.
- The old `planner.product_inventory` table is left in place (unused) — **safe to DROP on live
  once verified.**
- ⚠️ **n8n/ETL note for Diviyaj:** now that these columns are numeric, the Airtable→Supabase sync
  must write numbers or NULL — an empty-string write (`''`) into a numeric column will now error.
  Confirm the sync coerces blanks to NULL.

## v25.316 - Orange SANDBOX ONLY banner (sandbox only, never live)

Server shows a fixed orange "SANDBOX ONLY" strip at the top of the app + portal whenever the DB is NOT the
production Supabase (ref oolwklahstnvocaugryg). Live never shows it. Keyed off the real prod DB ref so it is
correct wherever it runs.

## v25.315 - Supplier portal PRODUCTIONS pivot: drop Product, widen SKU, add EAN + Size

On-screen batch pivot columns are now SKU (wider, ~190px, sticky) + EAN + Size (size_long), then the PO qty
columns. Removed the Product title column. (XLSX export unchanged — still matches the main order plan.)

## v25.314 - Supplier portal: new PRODUCTIONS tab (batch order plan + XLSX export)

New master tab: pick a batch ID -> order-plan pivot (SKUs x POs x qty) for that batch, with a Download that
builds the SAME ORDER PLAN .xlsx as the main SUPPLY plan (ported the XLSX writer into portal-view.js; enriched
the portal supplier-SKU data with EAN/carton/size/colour/release so the export columns match).

## v25.313 - Supplier portal invoice action: refined rules (invoiceDue helper)

Invoice notification now: never on FUTURE POs; never once invoice_value submitted; production end date =
supplier-submitted completion_date preferred, else calculated prod_end; if no end date at all, do not show;
otherwise show only when that date is past. Applied via one invoiceDue() helper across tab badge + MANAGE counter
+ recompute. (So PO-57UKLX5, being FUTURE, no longer shows the invoice (1).)

## v25.312 - Supplier portal: invoice action only fires once production end is past

The INVOICE tab badge + MANAGE action counter flagged a missing invoice value on ANY PO (even FUTURE). Now the
invoice action only counts when the production end date is in the past AND no invoice_value submitted — gated in
all three calcs (tab badge, MANAGE counter, recompute).

## v25.311 - Supplier portal: MANAGE column widened to 104px (82px cut off the button)

82px was too tight — the button+counter overflowed and was hidden behind the sticky PO column. Set to 104px
(PO offset moved to match) so the full MANAGE button + counter shows.

## v25.310 - Supplier portal: tighten MANAGE column (narrow to hug button) + snug counter

MANAGE column narrowed 100px->82px (PO column offset moved to match) so the white button no longer sits in a
wide white cell that read as side-padding; the action counter badge margin reduced to 3px.

## v25.309 - Supplier portal PO grid: "Ship to country" header -> "CTRY"

Renamed the column header to CTRY (full label kept as a tooltip).

## v25.308 - Supplier portal: tighten MANAGE column padding

First column (MANAGE) cell padding tightened to 5px each side (was 8px); MANAGE button horizontal padding
reduced to 2px (was 4px).

## v25.307 - Supplier portal: MANAGE button is now white with black text

Flipped .pp-exp from black/white to a white button with black text + black border (light-grey hover).

## v25.306 - Supplier portal layout: full-width + PO table fills screen (mirror Diviyaj's prod fixes)

Mirrors two CSS fixes Diviyaj already applied to production (portal.html): (1) #pv-wrap dropped max-width:1100px/
margin:auto so the portal uses full width; (2) added `#pv-wrap #supply-root .tw{max-height:calc(100vh-160px)}`
to remove the dead strip at the bottom of the PO table. The double-ID selector is needed to beat
portal-view.js's injected `#supply-root .tw{max-height:calc(100vh-210px)}` (equal specificity + load order).

## v25.305 - DEMAND grid: data-point text +1pt

Bumped the SKU demand grid's numeric cells by 1pt for readability: td.trd (monthly values) 10→11px, td.totu
(total units) and td.totr (total revenue) 11→12px.

## v25.304 - Supplier portal PAYMENTS: narrower table, deposit ref filled, style always refreshes

- PAYMENTS tab content capped at ~560px so it isn't full-screen width.
- Deposit reference was blank (the ledger's deposit_ref is empty for balance/completion rows) — now falls back
  to the PO's own deposit_ref (both /api/portal/bootstrap and /api/supply/supplier-payments).
- injectStyle() now always (re)applies the latest CSS instead of skipping when a #pv-style already exists — a
  stale style from an earlier load in the admin SPA was keeping the old MANAGE/divider styling in the preview.

## v25.303 - Admin app: cache-bust portal-view.js too (CONFIG ▸ Portal preview was using stale code)

The CONFIG ▸ Portal "preview as supplier" uses window.DBPortalView from portal-view.js — but inject.html loaded
`<script src="/portal-view.js">` with no cache-bust, so the admin app kept using a STALE cached portal-view.js
(v25.302 only cache-busted the standalone portal.html). Now inject.html loads it as ?v=__APP_VERSION__, so the
preview reflects the latest portal code on every version bump. Also wired the preview's data (loadPortalData)
to include `payments` (new /api/supply/supplier-payments/:name endpoint) so the master PAYMENTS tab populates
in the preview too, not just the live portal.

## v25.302 - Supplier portal: cache-bust portal-view.js (stale CSS/JS/data was hiding recent changes)

portal.html loaded /portal-view.js with no cache-bust, so the browser/tunnel served a STALE copy — recent CSS
(grey production separator, black compact MANAGE button) and the new master PAYMENTS tab data appeared broken
even though the code was correct. Now loaded as /portal-view.js?v=<ts> to always fetch the latest. Verified via
one-shot headless screenshot (grey separators + black MANAGE render correctly) and end-to-end bootstrap
(Lixin returns 51 payments).

## v25.301 - Supplier portal: master PAYMENTS tab + deposits table cropped

- New master-level PAYMENTS tab: the payments MADE to the supplier (from the payment ledger, scoped by
  transaction_supplier), grouped by payment run into collapsible cards (date + total), expanding to the line
  breakdown — PO reference, type (Deposit/Completion/Balance/Other), amount, deposit reference. Bootstrap now
  returns a `payments` payload.
- Deposits table no longer stretches full width — capped (max-width 720px, width:auto) for readability.

## v25.300 - Supplier portal PO grid: grey separator fix, MANAGE button, P# column

- Production separator was still white: a sticky <td> drops its background in Chrome (border-collapse). Dropped
  position:sticky on the group row so the grey banner paints.
- MANAGE button: smaller, black, reduced padding; first column widened to 100px (PO column offset moved to
  match) so the button + always-on action counter fit and aren't clipped.
- "Production" column renamed to "P#" and narrowed (~38px) to fit the short production number.

## v25.299 - Supplier portal: Shipment Plan (collapse, FOB/country pills, PO links) + PAYMENTS/grid polish

Shipment Plan:
- Each shipment/FOB card is now collapsed to a summary header with an expand (▸) toggle.
- New filter pills: 📦 FOB (FOB collections only) and one per destination country (added `country` to the
  shipment-plan rows server-side, from the PO/branch country).
- PO references (card header + POs-aboard table) now link back to the Purchase Orders tab and auto-open that PO.
PO grid / PAYMENTS:
- Production group separator is now a clear grey banner line (was pale blue).
- PAYMENTS table is fixed-layout with a wide first column (190px) so labels + dates no longer clip.

## v25.298 - Supplier portal: pinned sub-menu + new PAYMENTS sub-tab

- The expanded PO's sub-menu (Timeline / Order Plan / …) now stays pinned to the left while the wide grid
  scrolls sideways — same JS scroll-translate as the main PURCHASE ORDERS grid (bindPortalScrollPin translates
  the .ppx detail panel by the grid's scrollLeft).
- New PAYMENTS sub-tab: total invoice value + payment due date, starting deposit (amount/date/deposit ref),
  completion deposit (amount/date), balance payment (amount/date), and an Amount paid / Amount due summary.

## v25.297 - Supplier portal: fix blank "Ships With" + Production column/grouping + compact MANAGE

Two portal-grid changes:
- **Fix (bug):** the portal's "Ships With" column was always blank while the admin plan showed shipments. The
  admin app derives ships_with client-side from ALL POs, which the supplier-scoped portal can't see, and
  POS_SQL_PORTAL never computed it. Added `ships_with` (shipment ref) + `ships_with_supplier` (the shipment's
  master-PO supplier) to POS_SQL_PORTAL. (Server query change; live portal.)
- **Feature:** added a Production column and grouped the grid by production number with a pinned sub-heading row;
  MANAGE button made smaller; the action-count badge now always shows (grey 0 = nothing outstanding, red N).

## v25.296 - ORDER PLAN filter pills: counters show impacted ORDERS, not SKUs

The Partials / ⚠ ERP / Supplier-risk / Discontinued pill counters counted matching SKU lines. They now count
distinct POs (orders) impacted, via a poCount() helper.

## v25.295 - ORDER PLAN: ERP "⬆ Upload" button now opens the PO's ORDER PLAN sub-tab

The per-PO "⬆ Upload" button on SUPPLY ▸ ORDER PLAN opened the inline ERP-upload modal. It now redirects to
PURCHASE ORDERS ▸ that PO ▸ ORDER PLAN sub-tab (via gotoPO(po,'oplan')), where the full order-plan review + ERP
push lives — so all ERP pushing happens in one place. Still shows only when the PO has pending changes.

## v25.294 - Cin7 push: never resurrect a voided/deleted PO (create fresh instead)

If the ERP mirror's `erp_po_id` pointed at a Cin7 order that had since been **voided** (or deleted), the
/cin7-lines update path PUT `lineItems` + the old `isApproved` straight onto it — un-voiding / re-approving a
dead order (Ben's catch: a voided-then-repushed order flips back to approved). The pre-update read now also
fetches `isVoid`/`status`; if the mirrored order is voided or missing, we drop the stale mapping and CREATE a
fresh PO instead of updating the dead one.

## v25.293 - ERP completion-date deviation: 5%-of-lead threshold with a 3-day floor

The date-drift flag (erp_date_pending) used a 10%-of-days-until-completion ratio with no floor, so a 1-day gap
on a near-term PO tripped it. Now it flags only when the gap (days) ≥ 5% of days-until-completion, with a
minimum of 3 days: 100 days out → ≥5 days; 30 days out → ceil(1.5)=2 → floored to 3; anything ≤2 days never
flags. Per Ben.

## v25.292 - PO DATES tab: source always references/links the assigned shipment

The DATES source only named the shipment ("from shipment X") when the shipment actually supplied the date
(ship_src='S'). A PO on a brand-new shipment with no dates showed "calculated" with no shipment reference.
srcLbl now also links the assigned shipment when the date is still calculated ("calculated · 🚢 X") and links
the ship ref for self-master 'S' rows too — so once a PO is on a shipment you can always see + click through
to it from the DATES tab.

## v25.291 - PURCHASE ORDERS: assigning a shipment now live-updates the open PO detail (DATES)

Follow-on to v25.290: the silent row patch left the expanded PO detail stale, so a newly-assigned shipment
didn't show in the DATES sub-tab (Ship/Arrival/Completion still calc-based). patchPoRow now also calls
refreshOpenPanel(po): if that PO's detail is open, it re-renders the panel via poRefetchPanel (re-fetches the
PO row → poBy, keeps the active sub-tab) so DATES and other row-driven tabs reflect the shipment immediately —
still no collapse / full refresh.

## v25.290 - PURCHASE ORDERS: assigning a shipment is now silent (no grid re-render / lost place)

Assigning (or unassigning) a shipment in the default shipment-grouped view called refreshGrid(), which
re-rendered the whole grid and collapsed any open PO detail — losing your place. Now it routes through the
existing silentRowRefresh(po): re-fetches data and swaps only that PO's main row in place (its shipment cell
updates), leaving the expansion open and scroll intact. Trade-off: the row doesn't jump to its new shipment
group until the next natural full render — worth it to keep the user's place.

## v25.289 - PURCHASE ORDERS: grid no longer sticks on "all" (no filter) after a PO jump

Jumping to a specific PO (from an action / link / search) seeded the grid state with f:'all' + the PO # in the
search box, so it could find a completed PO. But a text search already spans ALL statuses (filt ignores the
pill), so the 'all' filter was redundant — and it PERSISTED, so once the search was cleared the grid showed
everything instead of defaulting back to In progress. Now the jump seeds f:'in_progress' (the default) and
relies on the search to find the PO across statuses. Result: the grid always defaults to In progress.

## v25.288 - Shipment drawer: date overrides now recompute the chained dates live

Entering a departure/landing/arrival override in the shipment popout (drawer) saved to the DB (the full
Shipments tab showed it on reload) but the drawer never re-rendered — so the derived Ship/Arrival/Completion
"final" dates stayed blank/stale. bindEdits only live-refreshed PO rows, never shipments. Added: after a
shipment field save (ep = /api/supply/shipment/REF), call _shipPatchRow(ref) so the drawer / grid row
re-renders with recomputed dates. Also fixes the same staleness for carrier/status/mode edits.

## v25.287 - PURCHASE ORDERS: pin expanded PO detail via JS (CSS sticky can't)

CSS sticky fundamentally can't pin the expanded PO detail: the colspan cell fills the full table width, so
sticky has no containing-block slack. Replaced with JS — bindPoScrollPin() adds one passive, rAF-coalesced
scroll listener on the grid's .tw container that translateX()es the .po-detail-wrap by scrollLeft (compositor-
only, no layout/paint). applyPoPin() also runs on panel load so it's positioned if the grid is already scrolled.
Removed the dead sticky CSS from v25.284/285.

## v25.286 - ORDER PLAN export: always ordered-only SKUs (ignore the All-SKUs pill)

Per Ben, the XLSX download should always contain only the SKUs that actually have order lines within the
current supplier/batch/prod/category/etc. filter — never the extra master SKUs the "All SKUs / All in category"
pill adds to the on-screen grid. Switched the export's row set from rowsFor(cl) (scope-driven) to the distinct
ordered SKUs from the filtered lines, sorted by category then SKU.

## v25.285 - PURCHASE ORDERS: sticky PO detail — stick the <td>, not a child div (v25.284 fix)

v25.284's sticky on the wrapper div didn't hold: position:sticky on a div inside a <td> is unreliable in
table layouts (Chrome/Safari). Switched to sticking the exp-row <td> itself (PO grid only), the same pattern
the frozen first columns use — so the expanded PO detail (sub-tabs + panels) now stays pinned to the left
while the wide grid scrolls sideways.

## v25.284 - PURCHASE ORDERS: expanded PO detail (sub-tabs) pinned when scrolling the grid

The PLAN sub-tab menu (Payments/Dates/Client-FBA/…) scrolled sideways with the wide PO grid. The v25.275
sticky was on .po-subnav, but its containing block is the narrow 1340px wrapper that sits at the far left of
the 19-column colspan cell — so it slid off once you scrolled past it. Moved the sticky to the wrapper itself
(.po-detail-wrap), whose containing block is the full-width td, so the whole detail panel now stays pinned to
the left of the horizontally-scrolling grid.

## v25.283 - ORDER PLAN: no scroll-jump on approve, + fast explanatory tooltips

(1) Approving a partial (the p✓ tick), "approve all partials", supplier/discontinue approvals, and confirming
a supplier change all rebuilt the grid via view(), jumping to the top. Routed them all (plus the fresh-line
rebuild) through a new viewKeep() that preserves window + pivot scroll. (2) Added fast 120ms hover tooltips on
the grid: a qty cell explains "Red = changed — differs from the ERP/Cin7 qty… use ⬆ Upload" (and shows the
4c/150r shortcut hint when unchanged), and the partial badges explain what a partial carton is. Reuses the
existing #po-note-tip element via a delegated handler on #op-grid.

## v25.282 - ORDER PLAN: Carton to col 2 (sticky), colour search, past-discontinue highlight

Three tweaks to the ORDER PLAN pivot: (1) the sticky Carton column now sits in column 2, immediately after
SKU (Release shifts to column 3); both stay frozen. (2) The filter search now matches SKU OR the SKU's colour
long (placeholder updated to "filter SKU / colour…"). (3) Rows whose discontinue date is already in the past
are tinted light red, with the discontinue date cell in a stronger red/bold for visibility.

## v25.281 - ORDER PLAN cell shortcuts: "Nc" (cartons) and "Nr" (round up to carton)

In any ORDER PLAN quantity cell you can now type a shortcut instead of a plain number, resolved against the
SKU's carton qty (skuAttr.cq): "4c" → 4 × carton qty (carton 12 → 48); "150r" → round 150 UP to the nearest
full carton (carton 12 → 156). On blur the cell normalises to the resolved number, and that number is what's
saved. A small tip note explaining both shortcuts now sits next to the ★ Focus button. If a SKU has no carton
qty, the suffix is ignored and the leading number is used.

## v25.280 - Fix: ORDER PLAN cell edit no longer jumps to top of page

Typing a quantity into an empty ORDER PLAN cell (a PO×SKU pair that wasn't yet a line) triggered a full grid
re-render via view() to add the new line, which reset scroll to the top. Now the fresh-line re-render
preserves and restores window scroll + the pivot container's scrollLeft/scrollTop, so the view stays put.
Editing an already-existing line was unaffected (it never re-rendered).

## v25.279 - Fix: ORDER PLAN / Create-3PL-PO "PLAN" button now opens the buy-plan popup

The "PLAN" button on the ORDER PLAN grid (and in the "Create 3PL POs from Buy Plan" modal) did nothing because
the buy-plan detail overlay `#ov` lives inside `#buy-wrap`, which the artifact builds LAZILY on the first BUY
render — so on the SUPPLY/ORDER PLAN page it didn't exist yet, and the reveal CSS was also out-specificity'd by
the supply-active hide rule. Fixes: (1) artifact exposes `window.ensureBuyPlanScaffold()` that builds
`#buy-wrap`/`#ov` on demand (data PD/SL is already loaded) without switching the visible view; the SUPPLY
handlers call it before `window.open_(sku)`. (2) Reveal CSS bumped to specificity (3,2,0) via `:not(#supply-root)`
so it beats the hide rule (3,1,0), and the buy grid behind the overlay is suppressed so only `#ov` shows.
Country switching inside the popup works via the existing market tabs. No new env vars / migrations.

## v25.264 - Cin7 lines push: read-back validation + auto qty-0 correction

After the PUT, the /cin7-lines endpoint now GETs the Cin7 PO back and confirms every line matches what was
sent (qty + presence; unitCost skipped — currency). If Cin7 kept SKUs we didn't send (e.g. removed lines, if
the PUT merged rather than replaced), it re-PUTs those extras at qty 0 to force exact alignment, then
re-reads to confirm. Result surfaced in the UI ("✓ verified exact match" / "auto-corrected N stray SKUs" /
"⚠ still off — check Cin7"). Response carries a `validation` object. Needs CIN7_AUTH (prod) to exercise live.

## v25.263 - Cin7 modal reverted to drift-based visibility; full-push kept as a direct button

Per Ben's spec: the Update-ERP modal buttons are drift-based and price-agnostic again — date-only drift shows
the date button; SKU/qty drift shows date + lines; price is never a visibility factor. The "⬆ Push to Cin7
(full)" button on the ORDER PLAN tab now fires the full lines override DIRECTLY (confirm → /cin7-lines) rather
than opening the (now drift-gated) modal, so a price-only change can still be force-pushed. Refines v25.262.

## v25.262 - Cin7 per-PO lines push always available (full override, incl. price-only changes)

Diagnosis of PO-56EUXR1: qty matched Cin7 but 9 lines kept stale prices. Root cause — the per-PO
"Update Cin7 PO (SKUs/Qty/Price)" push (a full override: every SKU + qty + price) was only *offered* when
QUANTITY differed, so a price-only invoice change never surfaced it. Fix: the lines push is now always
available — always shown in the Update-ERP modal, plus a new "⬆ Push to Cin7 (full)" button on the PO's
ORDER PLAN tab. Per-PO date push and the bulk date-only sync are unchanged. (NB: internal ERP mirror is USD;
Cin7's default CSV export is GBP — export in USD to compare.) No schema change.

## v25.261 - Admin PO detail (mobile): sticky sub-tab strip

In the mobile full-screen PO sheet (SUPPLY ▸ PURCHASE ORDERS ▸ open a PO), the PO sub-tab strip
(PAYMENTS / DATES / SHIPMENTS / …) now sticks just below the already-sticky back header, so it stays
reachable while scrolling a long panel. CSS-only.

## v25.260 - Supplier portal mobile polish: badge, PO wrap, sticky sub-nav, font sizes

Mobile (≤640px) portal fixes: (1) first column widened to 60px so the MANAGE "M" shows its action-count
badge; (2) PO number column wraps after ~12 chars; (3) the PO-detail sub-menu (TIMELINE / ORDER PLAN / …)
is a sticky, horizontally-scrollable strip instead of wrapping across multiple rows; (4) stop iOS text
inflation (text-size-adjust:100%) and trim oversized headings (section headers, invoice/packing-list). CSS-only.

## v25.259 - PO detail: new DOCUMENTS tab (list / download / delete / upload)

Added a DOCUMENTS sub-tab to the admin PO detail panel (SUPPLY ▸ PURCHASE ORDERS) showing every file held for
that PO across all categories (invoices, supplier uploads, client/FBA docs) — filename, type, uploaded
date/by, size — with download + delete, plus an admin upload (all held in planner.portal_attachments, bytea).
Confirmed all uploads incl. the portal "upload invoice" already persist to the DB. New endpoints:
po-doc-delete (deletes any doc incl. client), po-doc-upload; PO-detail payload now returns all_docs.

## v25.258 - Supplier portal mobile: MANAGE button → "M"

On mobile (≤640px) the Purchase Orders MANAGE button shows a compact "M" (badge still shows), and the pinned
first column narrows to 40px to reclaim space. Desktop unchanged. CSS-only + a label span.

## v25.257 - Supplier portal: mobile-friendly tab strip + sticky PO columns

Two portal fixes: (1) the sub-menu tab strip (Purchase Orders / Shipment Plan / Barcodes / Deposits /
Samples) becomes a full-width horizontally-scrollable row on mobile (≤640px) instead of wrapping/overlapping;
(2) the Purchase Orders grid now pins the MANAGE + PO columns (position:sticky) while the wide grid scrolls
sideways — data rows only, the expanded detail row is excluded. CSS-only (portal STYLE block).

## v25.256 - Shipment Plan: Direct-to-Client details + label downloads

Shipment-plan cards (both real shipments and FOB) now surface a Direct-to-Client block for any DtC PO on the
card: client name (+ sales ref), delivery address, and client requirements, plus download buttons for the
Ships-With shipment labels and (if the PO has crossdock SKUs) crossdock labels — reusing the existing
dlShipsWith + BC.crossdock label generators. No schema change or new endpoints.

## v25.255 - FOB shipment-plan cards: editable production end date (submit for approval) + PO timeline

The portal Shipment Plan FOB cards are no longer display-only. Added: (1) a Production end date field the
supplier submits for Dock & Bay approval — reuses the existing completion_date submission flow (applies to
end_production_overide on approval), with awaiting/approved/rejected status; (2) a Timeline of notes on the
purchase order (FOB has no shipment, so notes attach to the PO) — reuses the PO-notes store/endpoints. No
schema change or new endpoints (reuses portal submit + note).

## v25.254 - Supplier portal Shipment Plan now shows open FOB orders (display-only)

FOB orders (no shipment to us — collected at the factory / delivered to a nominated forwarder) now appear in
the supplier-portal Shipment Plan alongside real shipments. Included: open FOB POs (PRODUCTION/FUTURE; not
complete/shipped/delivered) where the PO has no shipment_ref AND is either on the Manufacturing branch or a
destination that isn't a UK/US/EU/AU/CA import warehouse (mirrors the app's isFOBdest rule). Shown as a
display-only card (📦 FOB — no shipment) with status, ready/production-end date, client & deadline, and the
PO/pallet members table; no escalate button or timeline (no shipment to track). shipment-plan endpoint now
appends these FOB entries (is_fob:true). No schema change.

## v25.253 - SUPPLY ▸ Actions: PRIORITY category + 3-column Type filter

Added a new ⚠ PRIORITY category (PO not in ERP, Shipment escalated, Manufacturing mismatch, Client deadline
at risk) — it now renders first in both the Type filter and the action-card list. Type filter is now a fixed
3-column layout (col 1: Priority + Payments, col 2: Dates + Other, col 3: 💡 Recommendations); popover 660px.

## v25.252 - SUPPLY ▸ Actions: Type filter categorised + 2-column layout

The Type filter dropdown now groups the (many) action types under their categories (Payments, Dates, Other,
💡 Recommendations) and lays them out in two columns. Each category has an "all" toggle to select/clear its
whole group; the group toggle and individual ticks stay in sync. Wider popover (460px).

## v25.251 - Manufacturing (a): "📦 FINISHED Open order" header no longer clipped

Applied the same width:max-content fix to the (a) open-orders table so its header (and rows) show in full.

## v25.250 - Manufacturing mismatch → SUPPLY ▸ Actions card + Prod. end shown dd-mmm-yy

Two changes:
- **Mismatch action cards:** each parent bundle SKU with an UNACCEPTED component mismatch (short/over vs
  demand) now raises a card in SUPPLY ▸ Actions ("Manufacturing mismatch"; high if any shortage, else amber)
  listing the offending components and an "Open Manufacturing ▸" jump. Dismiss/snooze/done lifecycle applies
  like other actions; accepting the mismatch (or fixing the qty) clears it. Refactored the manufacturing
  demand/supply computation into a shared helper reused by the endpoint and the action generator.
- **Prod. end format:** the (a) open-orders "Prod. end" column now displays dd-mmm-yy (e.g. 30-Jun-26);
  sorting still uses the underlying date.

## v25.249 - Manufacturing (b): Open MFG orders column no longer clipped (table sizes to content)

Force the (b) table to width:max-content so the "Open MFG orders" header + rows get their full width
(scrolls within the panel if the total exceeds it). Supersedes the min-width approach in v25.248.

## v25.248 - Manufacturing (b): widen the "Open MFG orders" column (no longer cut off)

Gave the Open MFG orders column a min-width and kept each PO ×qty on one line; widened the (b) table so
the column header and order rows are no longer truncated.

## v25.247 - CONFIG ▸ Manufacturing BOM: delete an entire bundle

Each bundle group now has a "🗑 Delete entire bundle" button (confirm) that removes all of that parent's
component rows in one go. manufacturing-bom-delete now deletes the whole parent when no component_sku is
given (single-row delete unchanged).

## v25.246 - Manufacturing (a) open orders: add Production end date + sort earliest→latest

Section (a) open finished orders now shows each PO's production end date (end_production_overide, else
start_production + supplier production_days) and sorts the orders by that date, earliest first (blanks last).
Endpoint's demand query joins suppliers for production_days and returns prod_end per finished PO.

## v25.245 - Manufacturing: (a) open orders and (b) components sit side by side per bundle

Within each bundle card, section (a) open finished orders + total demand and section (b) component/MFG-order
coverage now lay out side by side (flex; wraps to stacked on narrow/mobile). No logic change.

## v25.244 - Manufacturing tab restructured: per-bundle (a) open orders + total, (b) component MFG orders + mismatch

Reworked SUPPLY ▸ PURCHASE ORDERS ▸ Manufacturing around Ben's model. One card per bundle SKU with two
sections: (a) the open finished orders and quantities with a bold Total demand row; (b) a component table
showing each component SKU, its required qty, the itemised open Manufacturing orders + quantities, supplied
total, and the mismatch (match/short/over) with per-component Accept. Component supply is now measured
open-vs-open: the manufacturing SUPPLY query also excludes COMPLETE/DELIVERED/SHIPPING (matches the demand
scope). Dropped the standalone Manufacturing-POs table (now shown inline per component). No schema change.

## v25.243 - CONFIG ▸ Manufacturing BOM is now editable (add / edit qty + save / delete)

The Manufacturing BOM config tab is no longer read-only. Per bundle you can edit a component's qty/unit
and Save, Delete a component row, or Add a new component; a "New bundle" box creates a parent+first
component. Backed by two new endpoints — POST /api/supply/manufacturing-bom-save (upsert) and
/api/supply/manufacturing-bom-delete — writing planner.manufacturing_bom. No schema change.
NOTE for prod: if a future Airtable→Supabase sync feeds manufacturing_bom, decide authority (app vs
Airtable) so in-app edits aren't overwritten.

## v25.242 - Manufacturing demand = open POs only (exclude complete/delivered/shipping)

Manufacturing bundle DEMAND now counts only finished-product POs still needing assembly — POs with a
COMPLETE / DELIVERED / SHIPPING status are excluded (they're already built/shipped, so their components
are consumed). Component supply still counts all Manufacturing-branch POs. No schema change.

## v25.241 - Manufacturing tab redesign: MFG vs FINISHED POs clearly distinguished

Reworked SUPPLY ▸ PURCHASE ORDERS ▸ Manufacturing UX so the two PO populations read at a glance:
coloured badges (🏭 MFG amber / 📦 FINISHED blue), a KPI strip (MFG POs, Finished POs, Bundles,
Short, Over), and a prominent **Manufacturing POs** list showing each MFG PO and the component SKUs
it supplies. Per-bundle coverage cards retained (Required / On MFG POs / Diff / Accept sign-off).
No schema change; derives both PO lists client-side from the existing `manufacturing` endpoint.

## v25.240 - ORDER PLAN PO search: works from 3 chars; no misleading full-grid fallback

The PO(s) search box now filters from 3 characters (was 5) and, when it has text below that, shows no rows
instead of silently falling back to the full unfiltered grid. Fixes "type 1631 shows items without 1631".

## v25.239 - ORDER PLAN country pills: no "All", empty = all (like PURCHASE ORDERS)

Removed the "All" country pill on ORDER PLAN; default is now no country selected = all countries shown, and
deselecting all shows everything (matches the PURCHASE ORDERS behaviour). Status pills keep their All pill.

## v25.238 - PURCHASE ORDERS: Ship-to pills drop the count

The Ship to country pills now show just the flag + code (e.g. 🇬🇧 UK) without the per-country count.

## v25.237 - PURCHASE ORDERS: Branch filter

Added a Branch dropdown filter to the PURCHASE ORDERS grid (next to Supplier), filtering POs by their branch.

## v25.236 - Manufacturing tab: demand-vs-supply matching + accept tick

Reworked to Ben's model: finished-bundle demand (parent SKU qty on finished-product POs) × BOM = the component
qty the Manufacturing-branch POs must carry. Per bundle, shows each component Required vs On-mfg-POs vs Diff
(shortage/overage), with an Accept tick to sign off a mismatch (persisted, migration 097). Demo mfg PO now
carries components.

## v25.235 - SUPPLY Manufacturing tab (mock) + BOM config

Mock of a Manufacturing feature: new PURCHASE ORDERS sub-tab "Manufacturing" (after Shipments) + CONFIG
"Manufacturing BOM" tab. A manufacturing PO = branch set to Manufacturing; its finished/bundle SKUs explode
via the BOM (planner.manufacturing_bom, migration 096, seeded from CSV) into required components, matched
against component-PO quantities to show coverage/shortfall. Sandbox seeded with a demo mfg PO for review.

## v25.234 - ORDER PLAN report: wider A-G, Branch to row 3, centred + wider H+ columns

- Column widths A-G sized to their text; H+ (PO/qty) columns ~50% wider.
- "Branch" moved up to row 3 (others shift down); SKU header stays row 9.
- H onward data (metadata + qty) centre-aligned.

## v25.233 - ORDER PLAN report: freeze panes (col A + rows 1-9) + bold PO/SKU header rows

Froze the first column and the top 9 rows (metadata + SKU header) so they stay visible when scrolling, and
bolded row 2 (PO) and row 9 (SKU header). Added freeze-pane support + a bold cell style to the XLSX writer.

## v25.232 - ORDER PLAN report fixes: shipment hierarchy + supplier + QTY header

- "Shipments with this PO" now populates only for the MASTER PO (lists the member POs with their supplier,
  e.g. "PO-DILLARDS-3222503002 (Lixin)"); blank for member/non-master POs. Uses shipments.master_po (the
  master PO often has a blank shipment_ref, so grouping by PO.shipment alone missed it).
- "Ships with" (member rows) = the master shipment ref + the master supplier.
- SKU qty-column headers now say "QTY" instead of repeating the PO number (the PO row already labels them).

## v25.231 - Add size_long to products; ORDER PLAN export Size = long description

Added a size_long column to planner.products (migration 095 + seed from SKU_CHILD-NEW FIELDS.csv, 904 SKUs).
Surfaced in the SKUs query; the ORDER PLAN XLSX export "Size" column now shows the long size description
(e.g. "Extra Large (200x90cm)") instead of the short code. NOTE for Diviyaj: n8n must map Airtable
sku_child.size_long into planner.products for ongoing sync.

## v25.230 - Parse invoice: set order-plan SKUs not on the invoice to 0

When parsing a supplier invoice, SKUs that are on the PO order plan but NOT on the invoice are now proposed as
qty 0 (they weren't shipped/invoiced) — previously they kept their old quantity. Shown in the parse preview
with a "not on invoice" badge (cur → 0) and written as amended_qty=0 proposals on apply. Verified on
PO-55USLX1: 6 not-on-invoice SKUs flagged → 0.

## v25.229 - ORDER PLAN download report: colour-coded country + shipment rows

Reworked the ORDER PLAN XLSX report:
- Country moved to row 1, colour-coded per market (UK #FA5053, US #8FD9FB, AU #ADEBB3, EU #DAB1DA) — added
  a styles.xml with solid fills to the client-side XLSX writer.
- New "Ships with" row: the PO's master shipment reference + the other suppliers on that shipment.
- New "Shipments with this PO" row: the other PO references sharing that master shipment.

## v25.228 - PO Master-shipment grouping: members sit under their master (hierarchy)

Fixed Master-shipment grouping so a member PO sits directly beneath its master, indented — rather than
floating to its own alphabetical spot (which could put a member above its master, e.g. PO-56UKJM1 above
PO-56UKXR2). Groups are ordered by the master PO ref (so they're not all clustered at the top, per v25.220);
within a group the master is first, members indented. Also: when Master-shipment grouping is chosen, a search
now keeps that hierarchy instead of switching to status-grouping.

## v25.227 - FBA mobile: merge Status+Type & Launch+Disc columns; SKU on P's line

- On FBA mobile the Status+Type columns merge into one (stacked) column and Launch+Disc merge into one,
  saving horizontal room. Column count, category-row colspans (COLS_EFF / _nameCol) adjusted accordingly.
  Desktop FBA and BUY are unchanged.
- SKU code now sits on the same line as the "P" button (snm no longer wraps; SKU wraps within its space).

## v25.226 - Fix: SKU detail panel ✕ hidden behind top bar on mobile

The full-screen SKU detail panel (opened from "P"/"Plan") overlay was z-index:100, below the fixed top bar
(z5000), so its ✕ close button sat behind the header and couldn't be tapped. Raised the open panel to
z-index:9000 on mobile so it covers the top bar and the ✕ is tappable.

## v25.225 - FBA/BUY mobile: "Plan ▸" button → compact "P" icon

On mobile the SKU cell's "Plan ▸" button now shows just "P" (via CSS, click unchanged), freeing room for the
SKU text. Desktop keeps the full "Plan ▸" label.

## v25.224 - FBA/BUY mobile: surface all filters (wrap) + wider SKU column

- Filter rows were single-line flex, so the tier/status/type/buy-type pill groups ran off-screen to the right
  — looked like filters were missing. The filter rows now wrap so every group is visible in the expanded
  ⚙ Filters panel (SKU search on its own full-width line; vertical separators hidden).
- SKU column widened 132 → 156px on mobile.

## v25.223 - Mobile: hide status footer, version in top bar, fix BUY SKU cut-off

- Hid the "Inputs loaded live from Supabase / Data extract last updated … vXX" footer (#statusbar) on mobile.
- Added "HORIZON vXX" to the right side of the top blue bar on mobile.
- Fixed the BUY/FBA SKU column being cut off: the SKU code (.scode) was white-space:nowrap + flex-shrink:0
  inside a flex .snm, so it couldn't wrap in the 132px column. Now it wraps (and the .snm row wraps) so the
  full SKU shows.

## v25.222 - FBA/BUY mobile: sticky category titles + fix Status/SKU overlap

- Category divider titles now stay sticky on mobile, pinned just below the (already-sticky) column header —
  the header height is measured into a --bp-hdr-h variable so they sit at the right offset for both BUY and
  FBA (which have taller headers).
- Fixed the Status column overlapping the sticky SKU column: the SKU column's overflow was set to visible in
  v25.218, letting content bleed; reverted to hidden (SKU still fully visible — it wraps within its 132px box)
  and made it opaque so Status cleanly slides under it when scrolling.

## v25.221 - PO dbl-click copy: add "Copied to clipboard" tooltip

Double-clicking a PO reference (green flash) now also shows a small "Copied to clipboard ✓" tooltip just
above the cell, fading out after ~1s.

## v25.220 - PO grid: master-shipment grouping = alphabetical + indent; dbl-click copy

- "Group by Master shipment" on PURCHASE ORDERS no longer clusters shipment POs at the top. POs stay in
  plain alphabetical order; a PO that sits on another PO's master shipment (a member, not the master) is just
  indented in place with the "└ " marker.
- The "└ " indent marker is now a CSS ::before pseudo-element, so it isn't included when you copy a row/PO.
- Double-clicking a PO cell copies its PO reference to the clipboard (brief green flash; no dialog).

## v25.219 - Consistent "Filters" collapse across REPORTS + SCENARIO (mobile)

Added a shared mobileFilterCollapse() helper that, on mobile, tucks a view's leading filter row(s) behind a
consistent "⚙ Filters" button (matching BUY/FBA/ORDER PLAN/Purchase Orders). Wired into every REPORTS
sub-view (Slow Moving/Auto Forecast/Key Arrivals/Markdown & EOS/Open-to-Buy) and every SCENARIO sub-view
(Prime Day/B2B/Financial Forecast/PO Stock Priority). Skips leading annotations, no-ops on desktop and when
a view has no filters. Now filters live under the Filters button consistently on these tabs.

## v25.218 - FBA/BUY mobile: bigger SKU, smaller category lines, controls on one row

Mobile tweaks to the shared BUY/FBA grid:
- SKU column widened to 132px, text enlarged to 13px, and set to wrap/overflow-visible so the SKU is fully
  visible (no clipping).
- Category divider lines shrunk (8.5px) so they take less room.
- The "⚙ Filters", "⚙ Settings" and "ⓘ FBA Transfer Logic" buttons now sit together on one top control row
  (the Filters toggle moved into the action row ahead of Settings). Desktop unchanged.

## v25.217 - SCENARIO in mobile menu + mobile-optimise all report sub-views

- Fix: SCENARIO was missing from the mobile hamburger drawer (the drawer only kept buttons with a
  data-view or the SUPPLY button). Now SCENARIO appears, and selecting it reveals its sub-nav
  (Prime Day / B2B Allocation / Financial Forecast / PO Stock Priority) in the drawer, like SUPPLY/DEMAND.
- Mobile pass over the report sub-views (REPORTS: Exec/Slow Moving/Auto Forecast/Key Arrivals/Markdown &
  EOS/Open-to-Buy; SCENARIO: the 4 above): swipeable sub-tab strips, condensed filter bars (tighter gaps,
  smaller numeric inputs, wrapping), and touch-scrolling tables with a sensible mobile max-height. Tables
  already scrolled via .tw/.exec-tw; this makes the filters and tab strips usable on a phone. Desktop
  unchanged.

## v25.216 - BUY / FBA plan: mobile-friendly (filters toggle, scrollable grid, full-screen panel)

The BUY and FBA tabs share the same scaffold, so this covers both:
- Filters (Country / Category / SKU search + pills) now collapse behind a "⚙ Filters" button on mobile;
  the action buttons (Download, Create POs, FBA Transfer Upload) stay visible. Desktop unchanged.
- Grid scrolls sideways on mobile (table sized to content) with the SKU column still sticky, narrowed to
  116px so more of the other fields are visible.
- The SKU detail "plan" popup opens true full-screen on mobile (100vw × 100dvh, no border/radius); its plan
  table's first column narrowed too.

## v25.215 - ORDER PLAN mobile: fix sticky header/column-1 corner overlap

The PO-title header cells had no opaque background, so when the sticky header/column-1 overlapped while
scrolling, body content bled through and the top-left corner didn't layer cleanly. Gave the header row an
opaque background, the SKU body cells an opaque white background, fixed the z-index stack (corner > header
row > SKU column > body), and kept the category-separator grey band.

## v25.214 - Fix fast-clicking loading the wrong view (nav race)

Clicking menu options quickly could leave you on the previous view (e.g. tap ORDER PLAN but it still shows
BI/Actions) — a slow fetch from the view you left resolved after the new one and overwrote it. Added a
nav-token guard: every section / PO sub-tab navigation bumps a token, and each async render bails if a newer
navigation has happened since, so only the latest click paints. Data is still cached either way.

## v25.213 - ORDER PLAN mobile: full sticky header row

The pivot header row now sticks to the top for ALL columns on mobile (was column 1 only) — the v25.211
un-freeze rule was also killing vertical stickiness for the PO/label header cells. Split header vs body:
the whole thead sticks to the top on vertical scroll, column 1 (SKU) still sticks to the left, and the
top-left corner sticks both ways; only the body's middle label columns un-freeze horizontally.

## v25.212 - ORDER PLAN mobile filter tweaks

- Hid the "N SKUs × N POs · narrow with filters" count line on mobile.
- Moved the "⤓ Download report" button up to the header next to "⚙ Filters" on mobile (the in-panel one is
  hidden there; desktop keeps it in the filter bar).
- PO(s) label + search box now sit together on one full-width row on mobile (box fills the space next to the
  label instead of wrapping to its own line).

## v25.211 - ORDER PLAN mobile: scrollable/editable pivot + narrower PROD#/Batch

- Fix: the ORDER PLAN pivot grid was unusable on mobile — 430px of frozen label columns are wider than the
  phone screen, so they covered the viewport and the PO/qty columns behind them couldn't be scrolled to or
  edited. On mobile only the SKU column stays frozen (narrowed to 112px); Release/Carton/Suppliers/Discontinue
  un-freeze, so you swipe horizontally to reach and tap the qty cells while the SKU stays pinned.
- PROD# and Batch filter dropdowns narrowed further (92px) since they hold short codes.

## v25.210 - ORDER PLAN mobile filters: collapsible + condensed

- On mobile the ORDER PLAN filters/options now collapse behind a "⚙ Filters" button (row count stays
  visible in the header), reclaiming most of the screen. Tap to expand; starts collapsed each visit.
- When expanded, the panel is condensed: tighter pill padding, labels sit right next to their dropdowns,
  smaller gaps, and the filter dropdowns are narrower still (~half minus label). "completed POs" hint hidden
  on mobile. Desktop shows the filters inline as before (count moves to a small header row).

## v25.209 - Fix DATES tab 📅 picker button being clipped

The date fields on the PO ▸ DATES tab (Production start / end) had a fixed 110px text box + 📅 button that
overflowed the narrow "Date" column, clipping the 📅 picker button on both desktop and mobile. The field is
now fluid inside that column (text box flex-shrinks, button pinned) so 📅 always stays visible and tappable.

## v25.208 - Mobile: ERP deviations table fits full width

The ORDER PLAN tab's ERP-deviations table (SKU · Qty plan→ERP) had a 45ch min-width + nowrap SKU column
that forced a horizontal scroll on mobile. It's only 2 columns, so on mobile it now uses a fixed full-width
layout with the SKU wrapping — no more sideways scroll. Desktop unchanged.

## v25.207 - Mobile: fix DATES table + slim the filter dropdowns

- DATES tab table on mobile now fits the screen with a fixed 3-column layout (34% / 30% / rest) and wraps
  text — the "Source" column (exception reasons, e.g. PO-1700649) no longer clips or forces a wide
  horizontal scroll. Long buttons/notes in that column wrap instead of overflowing.
- Dropdown filters on PURCHASE ORDERS + ORDER PLAN are now ~half-width on mobile (2-up) instead of a
  full-width row each, reclaiming screen space. Text-input filters stay full-width. Desktop unchanged.

## v25.206 - Tighten mobile PO sub-nav so it fits one row

Reduced padding/gap/font-size on the mobile PO card sub-nav (PAYMENTS · DATES · CLIENT/FBA · More ▾)
so all tabs fit on a single row without wrapping to a second line. Desktop unchanged.

## v25.205 - Fix mobile shipment drawer + reshuffle mobile PO tabs

- Fix: on mobile the shipment drawer wasn't clicking through — it opened *behind* the full-screen
  mobile PO sheet (#mob-sheet-ov, z6000) because the drawer was z900. Bumped the drawer to z6100 so
  it opens on top of the sheet.
- Mobile PO card sub-nav: SHIPMENTS moved into the "More ▾" overflow; DATES promoted to a visible tab.
  Visible tabs are now PAYMENTS · DATES · CLIENT/FBA. Desktop keeps the full strip.

## v25.204 - Shipment drawer: full-screen takeover on mobile

On phones (≤700px) the shipment drawer is now a full-screen experience distinct from the desktop
side-drawer: it fills the whole viewport (100dvh), slides up from the bottom, and uses the app's dark
sticky header (matching the mobile sheet pattern) with larger tap targets for ✕ and "Full page ↗".
Desktop keeps the right-side slide-in. Same content/tabs/edits either way.

## v25.203 - Shipment drawer: open a shipment without leaving PURCHASE ORDERS

Clicking a shipment link (e.g. from a PO's payment plan) now opens a right-side slide-in **drawer**
instead of navigating to the Shipments tab. The drawer loads the full shipment detail — all sub-tabs
(Dates & tracking, POs aboard, Charges, Crossdock, Timeline & notes) and every field editable exactly as
on the Shipments page. It reuses shipExpand() rendered into #shipdet-DRAWER inside #supply-root, so all
edit wiring / assign / master / delete flows are unchanged. Edits made in the drawer refresh the drawer in
place (keeping the active sub-tab). A "Full page ↗" button jumps to the full Shipments tab; ✕ or clicking
the backdrop closes it. The Shipments sub-tab (added in v25.202) remains.

## v25.202 - Move Shipments under the PURCHASE ORDERS sub-nav

SHIPMENTS is no longer a separate top-level menu item — it is now a sub-tab under PURCHASE ORDERS
(#/supply/purchase-orders/shipments), same grid + behaviour. gotoShipment / shipReload / legacy
#/supply/shipments links redirect there. (Shipment deep-link ref dropped from the URL to avoid clashing
with the per-PO SHIPMENTS detail-tab slug.)

## v25.201 - Fix: PO on a shipment inherits the master PO's dates (shipment wins)

A PO assigned to a shipment now takes the MASTER PO's effective ship/delivery/completion dates (they travel
as one), overriding its own — previously it only read the shipment RECORD's dates, which are empty for a
master-PO-as-shipment, so e.g. PO-54AUMQ1-FEB kept its own May dates instead of PO-57AUXR1's Aug/Sep dates.
Added a mastered CTE (self-join on the shipment's master_po). delivery_src becomes S and a new
delivery_master_po field drives the DATES-tab note: "from shipment <PO>" with a link. is_late + ERP date
drift also use the mastered dates. (Final-payment-due still uses the PO's own basis — can extend if needed.)
Verified PO-54AUMQ1-FEB -> 08-03/08-31/09-07 matching PO-57AUXR1.

## v25.200 - ORDER PLAN download report: extra SKU columns + PO metadata rows

The ⤓ Download report XLSX now includes per-SKU columns — EAN (product_ean), Carton qty, Release window,
Product title (product_name), Size (size_short), Colour (colour_long) — before the PO quantity columns, and
adds metadata rows under the PO-number row: Production end, Client (DTC), DTC sales order ref, Branch,
Country. Added client/sales_order_ref/branch to the order-plan query and product_ean/product_name/size_short/
colour_long to the skus master. (size_uk_desc doesn't exist; used size_short, the readable UK size e.g. XL / One Size.)

## v25.199 - ORDER PLAN: no unapproved-partial / supplier-risk flags once a PO has shipped

The Unapproved-partials and Supplier-risk action flags (and their counts) now exclude POs that are SHIPPING /
DELIVERED / COMPLETE (previously only COMPLETE) — the plan is locked at that point, so there is nothing to
action. Added a poLocked() helper. ERP-diff and Discontinued checks are unchanged.

## v25.198 - ORDER PLAN: PROD#/Batch/Supplier moved to the Country row; default country = UK

Moved the PROD#, Batch and Supplier dropdowns onto the same row as the Country pills (Category + Release stay
on the SKUs row). Default country filter is now UK only (was all countries).

## v25.197 - ORDER PLAN: Supplier filter (by PO's assigned supplier)

Added a **Supplier** dropdown to the ORDER PLAN filter bar (A→Z) that filters to lines on POs assigned to that
supplier (purchase_orders.supplier_name). Highlights black when selected, like the other dropdowns.

## v25.196 - ORDER PLAN: XLSX download report, Batch filter, descending order, selected-filter highlight

- **⤓ Download report** button (right side of the SKUs bar) → XLSX of the current view: SKUs down column 1,
  purchase orders across the top (descending), quantities in the grid. Client-side OOXML writer (no library).
- **Batch filter** dropdown added (sorted descending / newest first); filters the grid by PO batch_id
  (added batch_id to the order-plan query).
- **PROD# dropdown sorted descending**, and the grid's **PO columns are now descending** (newest first).
- **Selected filter dropdowns highlight black** (Category / Release / PROD# / Batch) when a non-"All" option
  is chosen. PO filtering stays the text box (unchanged); each PO still has one supplier (unchanged).

No new env vars. NOTE: batch_id column added to the order-plan endpoint — no migration (existing column).

## v25.195 - Full ORDER PLAN grid: Supplier column shows suppliers_multiple_all

The Supplier column in the full ORDER PLAN grid showed the single main supplier (main_supplier_final); it now
shows the SKU's allowed multi-supplier list (products.supplier_multiple_all), with the main supplier in the
tooltip. Header relabelled "Suppliers". The "⚠ Supplier risk" (supplier-not-allowed) comparison was already
against supplier_multiple_all — unchanged. PO's single assigned supplier is unchanged (that's separate).

## v25.194 - DEMAND category popup now closes on filter-bar clicks

v25.188's click-away used a bubble-phase document listener, so filter-bar controls that call
stopPropagation() on their own click stopped it from firing (popup stayed open). Switched the listener to
capture phase (fires first, regardless of stopPropagation) — clicking anywhere outside the category control,
including the filters bar, now closes the popup; clicks inside it still keep it open.

## v25.193 - Favicon + page title (HORIZON)

Added the HORIZON favicon and a page `<title>` (HORIZON — Dock & Bay) to the app `<head>`. The favicon is
inlined as a 64px data-URI (downscaled from the supplied favicon.png), so it needs no static-file hosting
and works identically on localhost and Vercel. Also set as apple-touch-icon.

## v25.192 - ORDER PLAN add-SKU: searchable supplier-scoped SKU picker

The add-SKU inputs in ORDER PLAN edit mode are now a searchable picker (datalist) limited to the PO's
supplier's SKUs (via /api/supply/supplier-skus), showing SKU + product name — same UX as the "assign
shipment" box. Populated on entering edit mode.

## v25.191 - PO ORDER PLAN tab: edit quantities, add SKUs, copy SKU+Qty

The per-PO ORDER PLAN grid (PURCHASE ORDERS ▸ expand ▸ ORDER PLAN) is now editable:
- **✎ Edit qty / add SKU** button toggles edit mode: quantity cells become inputs, and a **＋ Add SKU** row
  lets you add new lines (SKU + qty; add as many as you like). **Save** writes each change/addition via the
  existing `/api/supply/po-line/{po|sku}` upsert (proposed → shows as ERP-pending until Upload); **Cancel**
  discards. Edits auto-persist to the DB like any plan edit.
- **⧉ Copy SKU + Qty** button copies the PO's SKUs + quantities to the clipboard (tab-separated, pastes into
  Sheets/Excel columns).

Reuses the existing line-upsert endpoint — no new server routes. Headless load verified clean.

## v25.190 - Update-ERP modal: show current Cin7 date → completion date on the date button

The "Update Cin7 Date" button in the Update-ERP modal now spells out the change: "Cin7 EstimatedDeliveryDate:
<current ERP date> → <this PO's completion date>", so you can see exactly what it will write before clicking.

## v25.189 - STOCK column: next-inbound date + hover list of all inbound

The DEMAND sticky STOCK column showed on-hand / >>inbound-qty. Now under the inbound quantity it also shows
the **next inbound arrival date** (↙ earliest ETA), and a **120ms hover** lists every inbound shipment for
that row (date · qty · SKU), capped at 14 with a "+N more". Added everywhere the stock cell renders:
subcategory row, individual SKU rows, subcat subtotal, category rollup, and the grand total (aggregated
across the group's SKUs, sorted by ETA). Data comes from the existing SKUI inbound map (SKU|warehouse);
one delegated tooltip handles the hover. Headless load verified clean.

## v25.188 - DEMAND category dropdown closes on click-away

The DEMAND "Category" dropdown (#cat-pop) stayed open when clicking elsewhere. Added a one-time
document click handler that closes it on any click outside #catrow1-wrap (clicks on the button, chips,
or inside the popup keep it open) — matching the BUY-plan dropdown's behaviour.

## v25.187 - Pre-launch SKUs now show everywhere (availability view fix, migration 094)

Pre-launch SKUs (flagged available for a market/channel but before their launch date) were hidden from the
demand planner (and anything using availability), because `v_product_availability` forced is_available=false
whenever the launch date was in the future. That's wrong — pre-launch SKUs must be visible to plan/buy the
launch, and the forecast's own launch clamp already zeroes pre-launch months. Fixed the view to drop the two
pre-launch clauses (retail for DTC/FBA, wholesale for B2B); the discontinue guard stays.

Diagnosed live + sandbox: e.g. PICNIC-DES-LG-BRGTSIDE and TOWLB-SUM-XL-OCEAN (AU, launch 2026-07-31) were
correctly flagged available but hidden by the launch date. After the view change (applied to sandbox) both
read is_available=true for AU DTC/FBA.

DEPLOY (Diviyaj): **migration `094_availability_include_prelaunch.sql`** (also
`diviyaj_deploy_2026-07-03_availability.sql`) — `CREATE OR REPLACE VIEW`, no data change. Applied to sandbox.
No new env vars.

## v25.186 - Smooth: "Smooth All" per financial year + FY-level Standard/Leader mode

Reworked the DEMAND SKU-smoothing controls:
- **"⤳ Smooth All" button in each FY-total column** (subcat subtotal row) — previews a smooth of EVERY
  forecast month in that financial year to the subcategory forecast, with a review step (✓ apply all / ✕
  discard) shown in the same FY-total cell.
- **Standard / Leader dropdown** next to it (per FY), with a 120ms hover tooltip explaining the difference
  (Standard = pure proportional rescale; Leader = protect historically-strong SKUs with tier-aware floors).
- **The Standard/Leader choice now applies to ALL smoothing in scope, including the per-month smooth** — so
  the old per-month "☆ leaders" toggle in the month preview is removed.
- The preview model is now multi-month (SMOOTH_PREVIEW.months) so single-month and whole-FY previews share
  the same apply/review path. Applied smooths write SKU overrides (auto-saved).

Headless load verified clean (no console errors). No new env vars or migrations.

## v25.185 - ERP date: materiality threshold, DATES tab counter, date-only modal button

- **Update-ERP modal shows only the relevant button(s):** if only the DATE is out of sync → just "Update Cin7
  Date"; if line items differ (qty / not-in-ERP) → both buttons + the manual CSV/copy fallback (as before).
- **ERP date exception now uses a 10% materiality threshold.** Only flag when the day gap between our
  completed-at-warehouse date and the ERP date is >=10% of how far away the date is (days from today to the
  completion date). E.g. 2 days out of ~100 = 2% → not flagged; 5 days out of 30 = 17% → flagged. Verified:
  sub-10% POs (1%/6%/9%) no longer flag; PO-55EUWK2 (24%) does.
- **ERP date drift now counts on the DATES sub-tab action badge** (added to the date exceptions).

No new env vars or migrations.

## v25.184 - Category / grand-total current-month forecast showed MTD actual instead of full-month forecast

The current-month FORECAST column ('fc') on the category rollup and the ALL-CATEGORIES grand total summed the
partial month-to-date ACTUAL (e.g. Beach Towels showing 258) instead of the full-month forecast (~30k). The
subcat rows were already correct (curFcCell → curMonthForecast). Fixed the rollups: they now accumulate the
sum of curMonthForecast() across subcats for the current-month forecast column (units + revenue), rendered as
a forecast (not the actual MTD). The adjacent actual-MTD column is unchanged.

No new env vars or migrations.

## v25.183 - Fix 1mo/3mo trend picking up the partial current month (showed -100%)

The stacked 1mo/3mo trend column used `sales[CUR_MONTH]` — CUR_MONTH is the leading PARTIAL month (e.g. the
current month with only a few days of data), so the 1-month trend read ~-100% on many rows, and the 3-month
trend used `ACTUAL_MONTHS.slice(-3)` which included that partial month. Now both use completed months only:
1mo = CUR_YTD_END (last complete month) vs same month last year; 3mo = the 3 completed months up to
CUR_YTD_END. This matches the other (already-correct) trend calc. No new env vars or migrations.

## v25.182 - Remove DEMAND Save/Refresh buttons; ERP delivery-date banner on DATES tab

- **Removed the "Save Forecasts" and "Refresh" toolbar buttons** in DEMAND (auto-save now handles
  persistence; the Refresh button was an obsolete "ask Claude" note). All JS references to #sv/#rf are
  null-guarded so nothing breaks with the buttons gone.
- **ERP delivery-date banner on the DATES sub-tab:** when our completed-at-warehouse date differs from the
  ERP's final delivery date (erp_date_pending, non-complete POs), a light-yellow banner shows "ERP final
  delivery <date> → completed-at-warehouse <date>" with a light-red "⬆ Update ERP" button (same look as the
  ORDER PLAN ERP-deviations box; opens the same ERP-push modal).

No new env vars or migrations.

## v25.181 - Forecast auto-save is batched (~1 min) with an unload flush

Perf: instead of saving ~1.5s after each edit, edits now batch and commit ~every 60s (schedule-once, so
continuous editing still saves each minute rather than firing per keystroke). To cover the longer window:
- tab hidden (visibilitychange) → save immediately while still open;
- page closing (pagehide) → navigator.sendBeacon flush of both subcat + SKU changes (survives unload;
  same-origin pk cookie rides along for the auth gate).
Extracted buildSkuChanges() (shared by saveSkuForecasts + the beacon). Manual Save still commits now.

## v25.180 - DEMAND planner auto-saves forecasts (no need to click Save)

Forecast edits now persist to Supabase automatically: a debounced auto-save fires ~1.5s after the last
edit, calling the existing saveForecasts() (both subcat inputs and SKU-level cells). Concurrent saves are
guarded (_saving) and a save-in-flight re-fires if more edits arrive. The manual "Save Forecasts" button
still works (and shows status). Also defined markDirty() so SKU-level edits (FC_DIRTY) correctly set the
dirty flag — previously they only set FC_DIRTY, so a SKU-only change wasn't picked up by Save.

No new env vars or migrations.

## v25.179 - PO action-count badge uses the fast 120ms tooltip

The new action-count badge showed its detail via the native title (~1s delay). Switched it to the same fast
120ms tooltip the notes badge uses (data-note + noteTip on mouseenter, 120ms), so the action list appears
promptly on hover.

## v25.178 - Actions deep-link to the right PO sub-tab; PO-row action counter badge

- **Actions open the relevant PO sub-tab.** When an action references a PO, "Open PO ▸ …" and the clickable
  PO ref now land on the sub-tab that matches the issue: payment issues → PAYMENTS, date issues → DATES,
  shipping issues → SHIPMENTS, ERP/order-plan → ORDER PLAN (unknown types → default tab). Uses the
  deep-link plumbing from v25.177.
- **Action-items counter on the PO grid.** A red count badge now sits next to the PO number showing how many
  open actions that PO has (payment overdue, unpaid, late, unassigned shipment, late-should-have-shipped,
  DTC not approved, not confirmed). Hover lists them; click expands the PO on the most relevant sub-tab.

No new env vars or migrations.

## v25.177 - Deep-linkable PO detail sub-tabs

PO detail sub-tabs are now addressable in the URL: `#/supply/purchase-orders/<slug>/<PO>`, e.g.
`#/supply/purchase-orders/payments/PO-56UKLX3-AIR` or `.../dates/PO-56UKLX3-AIR`. Slugs: payments, dates,
client, order-plan, shipments, master-data, landed, timeline, linked.
- Inbound: opening such a URL expands the PO and activates that sub-tab.
- Outbound: expanding a PO or clicking a sub-tab updates the URL to match (so you can copy/share it);
  collapsing returns to `#/supply/purchase-orders`.
Existing links still work: `.../purchase-orders/<PO>` (opens on the default tab) and the umbrella sub-tabs
(`.../deposits`, `.../payreport`, …).

## v25.176 - DATES table: fixed layout so the alert wraps and the table can't scroll

v25.175's white-space:normal wasn't enough — with table-layout:auto the long alert (plus the wide
"Supplier production status…" label) could still push the table past its wrapper. Switched the DATES table
to `table-layout:fixed` via a `dates-tbl` class (Milestone 190px / Date 130px / Source = rest) and made all
its cells wrap (white-space:normal;word-break:break-word). The table is now pinned to its wrapper width, so
the production-status alert wraps onto multiple lines and there is no horizontal scroll.

## v25.175 - DATES table: production-status alert wraps (no horizontal scroll)

The long production-status alert in the DATES-tab Source column forced the table wider than its wrapper, so
it scrolled. The Source cells now wrap (white-space:normal), the Source column is a bit wider (min 360px) and
the table max-width nudged to 820px, so the full message shows without any horizontal scroll.

## v25.174 - Production date exceptions now key off PO status (not the supplier-confirmation field)

The DATES-tab production exceptions were checking `production_status` (the supplier-confirmation field,
often null) instead of the PO lifecycle `status`. On PO-56UKLX3-AIR (status=PRODUCTION) that wrongly showed
"Past production start … but status is not set". Reworked to key off the PO `status`
(FUTURE → PRODUCTION → SHIPPING → DELIVERED → COMPLETE):
- **Past production START:** only an exception when status is still FUTURE/unset. Once in PRODUCTION+,
  being past the start date is expected → no exception.
- **Past production COMPLETION:** an exception when status is still FUTURE or PRODUCTION → message now reads
  "…but status is still PRODUCTION (should be SHIPPING or READY TO SHIP, or extend date)".

Still gated by require_supplier_confirmation (unchanged set of POs). No new env vars or migrations.

## v25.173 - ERP deviations table: SKU column shows full SKU (was clipping)

The ERP deviations table (ORDER PLAN) was clipping the SKU to ~10 chars. Cause: the global
`#supply-root table{width:100%}` stretched the 2-column table full width, and `class="tw"` on the table
added `overflow:auto` which clipped the nowrap SKU. Fixed: the table now sizes to content (inline
`width:auto` overrides the global), SKU column is `min-width:45ch` with nowrap so long SKUs (e.g.
BALLAST-SUM-CSTCANDY) show in full, and it uses a plain `overflow-x:auto` wrapper instead of `.tw`
(which re-imposes `min-width:100%` inside the expanded row).

No new env vars or migrations.

## v25.172 - FBA download reads carton dims from planner.products; products report column filter

- **FBA Transfer download now sources carton dims/weights from `planner.products`** (the new
  `*_carton_length/width/height/weight` fields, live-updated from Airtable) instead of `sku_labels`.
  `sku_labels` was an unclear source of truth; `products` is the live master. Units unchanged (cm / kg).
- **CONFIG ▸ Products report:** added a **Columns** filter — comma-separated substrings; only column headers
  matching any token are shown (SKU column always kept). Count shows shown/total fields.

No new env vars or migrations.

## v25.171 - Product/pack/carton dimension fields on planner.products (migration 093)

Added 22 numeric dimension/weight columns to `planner.products` (keyed by sku), sourced from the Airtable
SKU_CHILD export, UK + US each:
- prod: `*_prod_width/height/length/weight`
- pack:  `*_pack_width/height/length` (no pack weight)
- carton: `*_carton_width/height/length/weight`

Units: cm for dimensions, kg for weights.

DEPLOY (Diviyaj): **migration `093_product_dims.sql`** (also `diviyaj_deploy_2026-07-03_products.sql`) — schema
only, idempotent (ADD COLUMN IF NOT EXISTS). Applied to sandbox already.

DATA (Ben runs on live): `product_dims_load_2026-07-03.sql` (git-ignored, 91KB) — idempotent ALTER + UPDATE
for 960 SKUs. 958 matched products in the sandbox; 2 CSV SKUs not in products (PONCHK-CAB-MD-YELL,
PONCHK-CAB-SM-YELL) are skipped. Match is on sku.

NOTE: `sku_labels` already holds abbreviated carton dims (uk_carton_l/w/h/wt) which the FBA Transfer
download reads. These new product-master fields are longer-named and currently NOT wired into the FBA
download — flagged for a follow-up decision (rewiring would also fix SKUs missing carton dims in sku_labels).

## v25.170 - ERP deviations = quantity only; supplier invoice surfaced in PAYMENTS

Simpler rule + supplier-invoice workflow:

- **ERP deviations are now QUANTITY-only.** Price/cost differences between the order plan and the ERP are
  never raised as an exception (banner, ORDER PLAN badge, grid ERP Sync, and the alert). When the user
  pushes an update to the ERP, the cost still rides along (the push already writes erp_cost=cost_price), so
  prices sync on update without ever nagging. Dropped the cost-trigger machinery entirely.
- **Supplier invoice in PO ▸ PLAN ▸ PAYMENTS.** The portal-submitted invoice now sits directly under
  "Final invoice amount" as **"Supplier Submitted Invoice Total"**, with an **Apply → final** button (writes
  it into the Final invoice amount) and the uploaded **invoice document download**. Apply now also works to
  re-sync if the final was edited after a prior apply (only a rejected submission can't be applied).
- **PAYMENTS tab notification:** a pending supplier invoice already surfaces as an action item on the
  PAYMENTS sub-tab badge (unchanged) — confirmed it fires when the supplier submits.

No new env vars or migrations.

## v25.169 - ERP deviations: correct cost-trigger signal, ORDER PLAN action badge, wider SKU column

Follow-ups to the ERP-deviation feature:

- **Fixed the cost-trigger signal.** Cost/price drift was wrongly triggering on
  `purchase_orders.supplier_invoice_total`, which is populated broadly from import (set on 1179/1362 POs) —
  so POs like PO-55USLX-FBA1 flagged a price deviation with no invoice or portal price ever uploaded. Now
  cost drift only counts when the supplier has actually given us a price via the portal: line-cost
  adjustments (`portal_line_costs.actual_cost`/`final_cost`) OR a submitted invoice value
  (`supplier_submissions` kind=invoice_value, not rejected/superseded). PO-55USLX-FBA1 no longer triggers.
- **Action badge on the ORDER PLAN sub-tab.** When a PO has ERP deviations, the ORDER PLAN tab now shows a
  count badge (e.g. "1"), same rule as the banner. Folded into the existing order-plan exception count.
- **Wider SKU column** in the ERP deviations table (min-width 260px, no wrap) so long SKUs are readable.

No new env vars or migrations.

## v25.168 - FBA Transfer file: UK/EU SKU alias + box-dimension unit fallback

Two tweaks to the FBA Transfer Upload (.xlsx) on the FBA tab:

- **UK/EU merchant-SKU alias.** For CUR = UK or EU only, `BAGF-CAB-MD-NAVY` is written as
  `BAGF-CAB-MD-NAVY.` (trailing dot) to match how Amazon UK/EU has it registered. Implemented as an
  extensible map (`FBA_SKU_ALIAS_EUUK`) so more SKUs can be added later.
- **Box dimensions now fill from either unit.** Dims come from `planner.sku_labels` carton fields
  (`uk_carton_*` metric / `us_carton_*` imperial) — NOT the products table. When the region-native set is
  missing, the file now converts from the other unit (in↔cm ×2.54, lb↔kg ×0.453592). The carton is one
  physical box, so the conversion is exact. Previously ~92 of 907 FBA SKUs had only US carton dims filled,
  so a metric UK file left Box L/W/H/weight blank; now they populate whenever any carton size is on file.

No new env vars or migrations. NOTE: dims are only as good as the carton data in sku_labels — SKUs with
no carton dims at all still export blank (fill them in the PIM / sku_labels).

## v25.167 - ERP-sync deviations: qty-focused, cost only with a trusted price, ignore COMPLETE

Reworked the plan-vs-ERP comparison (order-plan panel banner + PO grid "ERP Sync" column + the
"pending ERP push" alert) so it stops nagging about price noise:

- **Focus is SKU + QUANTITY.** A line is flagged when its planned qty differs from the ERP (a SKU not
  in the ERP still shows as a qty deviation → "not in ERP").
- **Cost/price drift is only flagged when we hold a trusted price to assert:** a final invoice has been
  uploaded (`supplier_invoice_total` set) OR the supplier submitted prices via the portal
  (`portal_line_costs.actual_cost`). Until then the Cost column is hidden and cost differences don't count.
- **COMPLETE POs are ignored entirely** — no banner, no grid badge, no alert.
- Applied consistently to: grid `erp_pending` count, the per-PO ORDER PLAN deviations banner, and the
  DEMAND/BI "Order-plan change pending ERP push" alert.

Visuals on the deviations banner: **outline is now light yellow** (exception look) and the button is
**light red** ("⬆ Upload to ERP"), replacing the previous light blue.

po-detail now returns `qty_pending`/`cost_pending` per line plus PO-level `erp_complete`/`erp_cost_check`.
No new env vars or migrations.

## v25.166 - FBA Transfer Upload now outputs a valid Amazon .xlsx; barcode label tweak

Two changes:

1. **FBA Transfer Upload (FBA tab) now builds a real `.xlsx`** instead of the TXT that was throwing an
   error. Matches Amazon's official Send-to-Amazon manifest layout (sheet "Create workflow – template"):
   - UK/EU/AU = metric (cm/kg) with Default prep/labeling-owner rows, headers on row 8.
   - US/CA = imperial (in/lb), headers on row 7.
   - Columns: Merchant SKU, Quantity, Expiration date, Manufacturing lot code, Units per box, Number of
     boxes, Box L/W/H, Box weight.
   - XLSX is hand-built client-side (CSP-safe, no library): OOXML parts zipped with a STORE zip + CRC32,
     inline strings. Validated as a well-formed ZIP with well-formed XML parts.
   - Filename `FBA_Transfer_<CUR>_<date>.xlsx`.
   - NOTE: only the single data sheet is generated (not all 4 sheets of Amazon's template). Needs one real
     upload test against Amazon to confirm acceptance.

2. **Product barcodes:** "DATE OF PRODUCTION:" label reduced by 1pt (12 → 11) per request.

No new env vars or migrations.

## v25.165 - Fix: ERP-deviations banner now includes COST diffs (matches the badge)

Reported on PO-55USLX-FBA1: the grid showed "Update lines" but the ORDER PLAN ERP-deviations banner was
empty. Cause: the grid badge counts lines differing in qty OR cost, but the banner only checked qty — and
this PO's 11 diffs were all cost (plan £4.85 vs ERP £4.81). The banner now flags qty AND cost deviations
(columns: Qty plan→ERP, Cost plan→ERP), so it matches what the badge counts. po-detail now returns erp_cost.

## v25.164 - PO ▸ ORDER PLAN tab: ERP-deviations banner + Update ERP

Each PO's PLAN ▸ ORDER PLAN tab now shows, at the top, an ERP-deviations banner: the SKUs whose planned qty
differs from Fulfil/Cin7 (Plan / ERP / Δ, "not in ERP" for never-pushed lines) plus an "⬆ Update ERP" button.
Hidden when the PO has no deviations. (po-detail now returns per-line erp_qty + pending.)

## v25.163 - Fix: delivery uses Flexport ARRIVAL (not landing) + "Arrival/Delivery" label

Reported on PO-55USLX-FBA1: the DATES delivery showed 24-Jun (Flexport landing) but the Flexport report's
ARRIVAL is 30-Jun. The delivery calc used only Flexport landing and ignored arrival — even though it already
prefers arrival over landing for shipment dates. Now Flexport ARRIVAL is preferred over landing (arrival is
~7 days later across all 120 Flexport rows and is the date shown on the Flexport report). Delivery →
completion (delivery+7) and the cash-flow balance dates shift accordingly for Flexport-matched POs. Ship stays
the departure date. Also renamed the "Delivery" label/column to "Arrival / Delivery" for clarity.

## v25.162 - Barcodes: bulk download honours the A4 Print Mold setting

The "All Products" / "All Cartons (+inners)" downloads now respect the **File Download** dropdown: when set
to **A4 Print Mold** they produce a ZIP of A4 print-mould PDFs (36-up product / 4-up carton, one per SKU,
foldered by supplier); **Individual PNG** keeps the previous PNG-zip behaviour. (Previously the bulk buttons
always output PNGs regardless of the setting.)

## v25.161 - Barcodes: fix PROD# filter + smaller download-all buttons

- **PROD# filter fixed** — the barcodes query aggregated prod numbers only where prod_no matched `^P[0-9]`,
  but prod numbers are plain digits (23, 24, …) so it matched nothing and the dropdown was empty. Now `^[0-9]`
  — the PROD# dropdown populates and filters (509 SKUs carry a prod number).
- **Download-all buttons** ("All Cartons (+inners)" / "All Products") reverted to normal size (not big/bold),
  still light blue.

## v25.160 - Payments Report search: match the full amount (commas + decimals)

The amount search now matches the full base amount whether typed with commas or not, and with the trailing
decimal — "6,211.20", "6211.20" and "6211.2" all find a 6,211.20 payment (partial digit runs still match too).
Matches against the run total and each line amount, compared on their 2-dp value.

## v25.159 - Barcodes: larger, light-blue download-all buttons

The "⤓ All Cartons (+inners)" and "⤓ All Products" download buttons on the Barcodes tab are now larger,
bold, light-blue buttons instead of small grey badges — clearer/more obvious.

## v25.158 - Payments Report: supplier / amount search

Added a Search box to the Payments Report (PURCHASE ORDERS ▸ Payments Report) — filters runs by supplier
name or amount. It **overrides the date filter** (spans all history) while a search term is present; clearing
it returns to the date-filtered view. Clear also resets the search.

## v25.157 - PRODUCTIONS folded into PURCHASE ORDERS (shared sub-nav)

Removed the standalone PRODUCTIONS top-menu item. PURCHASE ORDERS is now the umbrella with a sub-nav:
**PLAN** (the PO grid — default) · Productions · Deposits · Other Payments · Payments Due · Payments Report ·
Barcodes. All former PRODUCTIONS content moved under it unchanged. Routing rewired to
/supply/purchase-orders[/<sub-tab>]; legacy /supply/productions and /supply/purchase-orders/<PO> links still
resolve (PO numbers open PLAN + that PO; known sub-tab names open that tab). Internal navigation (deposit /
other-payment jumps, refresh-after-edit) rewired to the new sub-tabs. No schema change.

## v25.156 - Actions: Unassigned shipment / Partial cartons / Awaiting supplier confirmation → LOW severity

Reclassified these three action types from amber to **low** severity: "Unassigned shipment", "Partial cartons
need approval", "Awaiting supplier confirmation". Added a **Low** pill to the Actions severity filter (with
count); low cards get a grey type badge (green left border). They sort after High/Amber.

## v25.155 - Reports ▸ Slow Moving: clearer filters, two-row layout, defaults

- Selected filter pills are now full black background / white text (clearly distinct from unselected).
- Moved VELOCITY and SORT onto a second row, under MARKET / WAREHOUSE / CATEGORY.
- Renamed "WHSE" → "WAREHOUSE" (filter label + table column header).
- Defaults changed to MARKET = UK and WAREHOUSE = 3PL.

## v25.154 - PO grid: copyable inline dates + master badge below the shipment

- The inline Start/End date fields opened the calendar on single-click, which blocked selecting/copying the
  text. Moved calendar-open to **double-click**; single-click now leaves the field selectable so you can
  copy the date (Cmd/Ctrl-C).
- The "master" badge in the SHIPMENT column now sits on its own line **under** the shipment, at a smaller size.

## v25.153 - BUY / FBA grids: launch & discontinue dates as dd-mmm-yy

The BUY and FBA plan grids showed launch / discontinue dates as dd/mm/yy — now dd-mmm-yy (e.g. 14-May-26),
matching the rest of the app. Scoped to those grid date cells (new dateDMY helper); month column headers and
the DEMAND SKU view are unchanged.

## v25.152 - Key Accounts config: per-row Delete + search box

- **Delete** button next to Edit on each key-account row (with a confirm). Uses the existing delete endpoint.
  Added as an opt-in (`del`) to the shared config editable-table helper so other tables are unaffected.
- **Search box** at the top of the Key Accounts tab — filters rows live by name / requirements / address /
  notes, with a match count; the box keeps focus while filtering.

## v25.151 - Key Accounts config: multi-line cells + reordered columns

The Key Accounts table's text fields (client requirements, delivery address, pallet/other notes and the
per-pack notes) are now multi-line — a wrapping cell in read-only, a textarea in edit mode — so long text
isn't cropped. Columns reordered to: Name, Client requirements, Delivery address, Pallet notes, Other notes,
then the packing yes/no + notes pairs. (Added an `area` column type to the shared config editable-table helper.)

## v25.150 - "Create as key account" from a PO + BI recommendations split in ACTIONS

- **Create as key account:** on a PO's Client/FBA tab, when the client name isn't already a saved key
  account, a "＋ Create as key account" button appears next to it — it creates the key account in config
  from the PO's current packing / labelling / client requirements / delivery address, and tags the PO as a
  key account. (New endpoint /api/supply/po/:po/create-key-account.)
- **ACTIONS — BI recommendations separated:** the advisory "Expedite production" and "Consider air freight"
  items (from the forecast/expedite engine) now render in their own "💡 BI RECOMMENDATIONS" section at the
  bottom (purple, "advisory, not blocking"), instead of mixed into DATES actions.

## v25.149 - Key Accounts + Direct-to-Client tags (custom / key account)

- **Config ▸ Key accounts** — new CRUD table: name, packing/labelling (yes-no + notes), client requirements,
  delivery address. (Migration 092: `key_accounts` table.)
- **PO ▸ Client/FBA tab** — new "Direct-to-Client type" checkboxes: **Key account** + **Custom** (multi-select).
  Client name is now a picker of saved key accounts; choosing one prompts to pull that account's packing /
  labelling / requirements / address onto the PO (overwrites current), and auto-ticks Key account. (PO columns
  dtc_custom / dtc_key_account.)
- **Direct to Client report** — a **Type** column shows coloured badges (blue Key account, grey Custom) and
  new **Type** filter pills (All / Key account / Custom).
- DEPLOY: Diviyaj runs migration 092 (see diviyaj_deploy_2026-07-02_supply.sql — now 091 + 092).

## v25.148 - Inline-editable Start/End in the PO grid + popover & bottom-space fixes

- **Start & End are now inline-editable in the PO grid** on open (non-complete) POs — styled to look exactly
  like the read-only text (no blue box; a faint border only on focus). Type/paste any format (shows
  dd-mmm-yy); clicking the cell opens the native calendar (no icon). Completed POs stay read-only.
  Bound to the same fields the DATES sub-tab edits (start_production / end_production_overide), so edits
  sync both ways and the row's derived cells refresh. End shows the effective date; editing sets a manual
  override, clearing reverts to the calc. Only open rows get inputs (performance).
- **~100px of bottom whitespace** under the PO and Shipments grids so a bottom-row "assign shipment / assign
  deposit" popover has room to open.
- **Popover positioning fix:** the picker popovers now re-position when their (async-loaded) list renders,
  so they no longer open downward off the bottom of the screen.

## v25.147 - Editable dates display as dd-mmm-yy (14-May-26)

The paste-friendly date boxes now show the friendly dd-mmm-yy form (e.g. 14-May-26) — the app's standard
display — instead of ISO. You can still type/paste any format; it resolves to ISO under the hood for the
save + calendar picker, and the box reformats to dd-mmm-yy after a valid entry (and on page refresh).

## v25.146 - Samples date fields → same paste-friendly text box + picker

Applied the v25.145 date field (text box + 📅 picker, resolves/validates any common format to ISO) to the
Samples "Completion required" date — both the new-sample request form and the inline row editor. Invalid
input turns the box red and isn't saved. (Remaining native date inputs are the FBA/Buy-plan filter boxes.)

## v25.145 - Editable date fields: paste-friendly text box + calendar picker

Replaced the native `<input type="date">` (whose segmented field can't be selected or pasted into) with a
plain text box you can select / copy / paste / type, plus a 📅 button that opens the native calendar. On
change it resolves and validates any common format to ISO (yyyy-mm-dd) — accepts `2055-11-02`,
`12-May-25`, `12/12/25`, `2 Mar 26`, `25/06/2023`, etc.; invalid text turns the box red and isn't saved.
Applied across the PO payment plan (start/completion/balance dates), Production start/end, Client deadline,
Final payment due, and the cash-flow "likely pay date" fields. (Samples/buy-plan date pickers unchanged for
now; they still accept an ISO paste.)

## v25.144 - Fix: "Late - should be Completed" filter uses the completion date

The filter was keyed on the production-end date, so POs whose production had ended but whose completion
date was still in the future (e.g. PO-1712952, completion 15-Jul-26) were wrongly flagged. Now it means
what it says: the COMPLETION date (delivery + 7, the Fulfil/Cin7 completion) has passed and the PO isn't
marked complete. (22 POs qualify; none with a future completion date.)

## v25.143 - Inline date alerts, Flexport links, live grid sync from sub-tabs

- **Exception alerts now sit at the data point.** Removed the categorised chips from the PO reference
  (v25.141). The production-status warning ("Past production start/completion … but status is …") now
  shows in the DATES sub-tab's Source column, on the specific row it concerns (Production start / Production
  end), highlighted amber — instead of a badge on the PO number.
- **Flexport links.** The FLEX source badge on the PO grid (Ship/Delivery) is now a link to the Flexport
  shipment; the PO's SHIPMENTS sub-tab shows the Flexport reference with the same link.
- **Live grid sync.** Editing any PO field in an expansion sub-tab (e.g. Production end on DATES) now
  silently refreshes that PO's collapsed grid row — derived dates/values recompute and the row updates in
  place, without closing the open panel.

## v25.142 - PO grid: "→ set shipping" quick-advance when the shipment has departed

When a PO is still in PRODUCTION but its assigned shipment has departed (effective status Shipping), a
small "→ set shipping" button now appears under the STATUS dropdown. Clicking it sets that PO — and every
PO on the same master shipment still in PRODUCTION ("ships-with") — to SHIPPING in one go. Only PRODUCTION
POs are touched (never re-opens completed/delivered ones).
- Server: new ship_status on the PO calc (mirrors the SHIPMENTS grid: departed→Shipping, arrived→Completed,
  else Planned); new POST /api/supply/po/:po/set-shipping bulk-advances by shipment_ref.
- Client: button in the status cell (shown only when status=PRODUCTION and ship_status=Shipping); grid
  refreshes in place after the change.

## v25.141 - <$500 rule open-only + clear categorised exception chips

- **<$500 rule now applies to open POs only** (v25.138). Completed POs keep their original supplier
  deposit terms and due dates — no retroactive restatement of closed orders. Open (incl. future) POs under
  $500 still default to 0% start + 0% completion, due on invoice/ship date. (10 open affected; 169
  completed reverted to their original terms.)
- **Clearer PO-grid exception badges.** The single opaque red count on the PO reference is replaced with
  one labelled, colour-coded chip per flagged area — ⚠ PAY (red), ⚠ DATES (amber), ⚠ FREIGHT (orange),
  ⚠ PLAN (blue), ⚠ NOTES (purple). The chip says WHICH area at a glance; hovering shows the specific
  message (e.g. "DATES: Past production completion (30 Jun) but status is In production"). Applies across
  payments / dates / order-plan / freight / notes exceptions.

## v25.140 - Cash flow: drop duty/freight/tax once goods have landed

Reported on PO-55AUXR1: import duty/tax showing as due in June, but the goods had already landed
(2026-06-12) — customs is cleared and freight invoiced around arrival, so those estimates are no longer
a future cash need. The cash flow already skipped landed-cost estimates for POs marked complete, but a PO
whose status still says SHIPPING while the goods have actually arrived kept showing them. Now freight,
import duty and import tax estimates are also dropped once the landing date is in the past (shipment no
longer "shipping"); they remain only while the shipment is still in transit (landing today or later) or
still in production. Goods-payment milestones (start/completion/balance) are unchanged.
- Fleet-wide: 0 landed-cost estimates remain due in the past; 214 future/in-transit ones still shown.

Note (no change needed): a PO's start deposit is already excluded from cash flow when a deposit reference
is assigned (the referenced deposit pool is the actual cash line instead) — verified 0 leaks. The only
P56-AU-LX1 line is the deposit pool itself, correctly marked paid.

## v25.139 - Deposit assignment: supplier match (in addition to region)

Deposits could already only be assigned within the same region (AU vs non-AU). Added a second guard:
a deposit can only be assigned to a PO from the **same supplier** — a Lixin PO can only take Lixin
deposit references, etc.
- Server (PO patch): rejects a deposit whose supplier differs from the PO's supplier (clear error), on
  top of the existing region guard. apply-all already scopes by supplier + region.
- Client (deposit picker): supplier-mismatched deposits are greyed/blocked with a "✗ <supplier>" flag
  (same UX as the region block); assignable deposits are now sorted to the top of the list.
- Matching is on supplier_name (all deposit supplier names match PO supplier names exactly).

## v25.138 - Small POs (< $500): 0% deposits + due on invoice/ship date

New default for low-value orders. When a PO's value used (final invoice, or the order-plan estimate if
none yet) is under $500, the start deposit and completion deposit both default to 0% (→ 100% balance),
and the balance is due on the invoice-processed date once a final invoice is entered, or the ship date
while still an estimate — no supplier credit terms applied. A per-PO % override still wins, and a manual
"final payment due" override still takes priority over the computed date.
- Migration 091: adds purchase_orders.invoice_processed_date + a trigger that auto-stamps it when a
  final invoice total is set (and clears it when removed) — covers every write path.
- Server: sp/cp default to 0 under $500 (override wins); balance due = invoice_processed_date ▸ ship date
  for these POs.
- Client: the balance-due note reads "invoice/ship date · under $500" instead of the supplier credit terms.
- 179 existing POs fall under the rule; money conserved across all 1,362 (start + completion + balance =
  value + credit); ≥$500 POs unchanged.
- DEPLOY: Diviyaj runs migration 091 on prod (see diviyaj_deploy_2026-07-02_supply.sql).

## v25.137 - Fix: NO DEPOSIT rolls the start deposit into completion (if any) else balance

Reported on PO-56UKMQ1 (MQ Print, terms 50% start / 0% completion / 50% balance, deposit ref set to
NO DEPOSIT): the start deposit still calculated 50% and rolled it into the COMPLETION milestone — but
MQ Print has no completion term, so a phantom 50% completion appeared while the balance stayed at 50%.
An undrawn start deposit now rolls into completion ONLY when the supplier actually has a completion
milestone (completion% > 0); otherwise it stays in the balance. Applies to both NO DEPOSIT and a
deposit ref that ran short.
- Server: completion_calc and catch_up are 0 when completion% = 0 (the start shortfall lands in the balance).
- Client: the start-row note now reads "→ completion" or "→ balance" per the supplier's terms (and
  "no deposit · …" wording for NO DEPOSIT); the Balance row's % is computed from the actual amounts so it
  matches the owing figure.
- PO-56UKMQ1 now shows start 0, completion 0, balance 100% (6,764.78). Money conserved across all 1,362
  POs (start + completion + balance = value + credit); PO-669591 (v25.135) unaffected.

## v25.136 - UX: paste dates into any date field

Native `<input type="date">` only accepts `yyyy-mm-dd` in the exact locale format, so pasting a date
copied from Sheets/Excel (e.g. `25/06/2023`) silently failed. Added a single capture-phase paste
handler that intercepts a paste into any date field, parses the common formats to ISO, sets the value
and fires `change` (so existing savers run). Keeps the native calendar picker. Formats handled:
ISO `2023-06-25`, UK day-first `25/06/2023` / `25-06-2023` / `25.06.2023` (2-digit years → 20xx),
`25 Jun 2023`, `Jun 25, 2023`, and cells carrying a time (`2023-06-25 00:00:00`). Unparseable text is
left to the browser.

## v25.135 - Fix: completion deposit capped at the outstanding balance

Reported on PO-669591: order value 153.00, balance 151.42 already paid (1.58 remaining), yet the
COMPLETION deposit showed 76.50 (= 50% × 153). The completion calc only ever subtracted the start
deposit from its term — it ignored any balance already paid — so a term-based completion could exceed
what the PO actually still owes. Completion calc is now capped at the remaining outstanding
(value + credit − start paid − balance 1 − balance 2), floored at 0. For PO-669591 completion now
shows 1.58. Term-normal POs (balance not yet paid) are unaffected — the cap only bites once a balance
payment reduces the outstanding below the term amount.

## v25.134 - Fix: Order Plan blank + aged-payment action opening the wrong (empty) PO view

Two client-side fixes, no schema change:
- **Order Plan wouldn't render** — the pivot's PO-header "✓ Approve N partials" button referenced
  `lines` / `isUnapprovedPartial` from `opBuild`'s scope, but `pivot()` is a sibling function, so it
  threw `ReferenceError: lines is not defined` on every render and blanked the whole tab. Now counts
  unapproved partials from the pivot's own `rows` (the displayed lines) with an inline carton check.
- **Aged-payment action → PO opened nothing** — clicking an "Aged payment" action for an old completed
  PO (e.g. PO-37AUMQ2, completed 2023) navigated to PURCHASE ORDERS but nothing loaded: the nav reset
  the filter to "all" yet left the "Last 12m" recency filter on, hiding years-old completed POs so there
  was no row to expand. Navigating to a specific PO now seeds the search box with the PO number (search
  spans all statuses/recency) so the single PO always loads and auto-expands.

## v25.133 - Payment threshold 0.01 → 0.02 (absorb rounding)

Follow-up to v25.132. The "PO still owes money" gate that suppresses phantom payment
actions/overdue rows now uses a **0.02** threshold instead of 0.01, so a PO whose remaining
due is under 2 cents (rounding noise) raises no payment actions or overdue highlights.
Applied consistently across: cash flow milestone lines (server), PLAN ▸ Payments overdue
highlight, payPanel unpaid flags (start/completion/balance/balance-2), the PO-grid payment
exceptions, and the "Total amount due" red styling. App code only — no schema change.

## v25.132 - Fix: fully-paid POs no longer show phantom overdue milestones

A PO paid in full via one milestone (e.g. the whole value recorded as the balance) was still
showing its other milestone TERMS (e.g. the 30% start deposit) as unpaid/overdue — surfacing a
false "deposit remaining" action and an overdue row on the PLAN ▸ Payments tab (reported:
PO-23AUFY1). Now a milestone only counts as due/overdue when the PO still owes money
(value used + credit − everything assigned/paid > 0):
- Cash flow skips unpaid milestone lines on fully-paid POs (removed ~185 phantom aged items).
- The PLAN ▸ Payments overdue highlight + the PO-grid payment exceptions are gated the same way.
Genuinely-outstanding milestones are unaffected.

Deploy: no new env vars, no migrations. Files: `server.mjs`, `supply/inject.html`.

## v25.131 - Cash Flow includes Other payments; Aged action → per-item actions

- **Cash Flow now includes Other payments** (sundry register rows, is_deposit=false) — one line
  each, timed on due ▸ likely ▸ paid like everything else, with a new **Other** type filter and a
  Reference link into Productions ▸ Other Payments.
- **Aged unpaid** is now **one action per item** instead of a single summary: each aged unpaid
  payment (PO milestone, deposit, or other payment) is its own action card that links straight to
  its source — PO ▸ Payments, the deposit register, or Other Payments. Aging is by the effective
  date (likely if set, else due). Committed only (freight/duty/tax estimates excluded). The
  "Unpaid — last month" summary action is unchanged.

Deploy: no new env vars, no migrations. Files: `server.mjs`, `supply/inject.html`.

## v25.130 - Actions: "Unpaid last month" + "Aged unpaid payments"

Two new payment actions in SUPPLY ▸ Actions, computed from the cash flow:
- **Unpaid — last month** (amber) — every cash-flow payment dated to the previous calendar month
  that's still unpaid; opens the Cash Flow report filtered to that month (Overdue).
- **Aged unpaid payments** (high) — everything unpaid from before last month; opens the Cash Flow
  report on a new **Aged (before last month)** filter.
Each shows the count + $ total and links straight into the filtered cash flow. Computed
client-side from /api/supply/cashflow (no server change); a `gotoreport` action can now carry a
cash-flow status/month filter, and the Cash Flow month picker gains an "Aged" option.

Deploy: no new env vars, no migrations. Files: `supply/inject.html`.

## v25.129 - Cash Flow: All-transactions export + monthly paid/unpaid summary

The Cash Flow report toolbar now has three export groups:
- **All transactions** — Copy + CSV of *every* cash-flow line (ignores the on-screen filters).
- **Monthly paid/unpaid** — Copy + CSV of a per-month summary: Paid, Unpaid (split committed /
  estimate), Total.
- **This view** — the existing Copy + CSV of the currently filtered lines (unchanged).

Deploy: no new env vars, no migrations. Files: `supply/inject.html`.

## v25.128 - Cash Flow: time on due date, unless a likely date is applied

Cash Flow lines are now dated on the **due date**, overridden by a **likely date whenever one is
set** (previously the likely override only kicked in once a line was overdue). Deposit-pool lines
now carry the deposit register's own **date_due** (▸ earliest linked-PO start due) and
**date_likely_pay**, so a deposit's cash-flow month follows its due date unless a likely-pay date
is entered. Paid lines still sit on the paid date.

Deploy: no new env vars, no migrations. Files: `server.mjs`.

## v25.127 - Deposits: Due date + Likely-pay date on the register

The Deposits register (Productions ▸ Deposits) now shows a **Due** column and a **Likely pay**
column (in addition to Date paid) — both editable via the row's Edit button (and on newly-added
deposits). Likely-pay shows a dash once the deposit is paid. Uses the existing
`deposits.date_due` / `date_likely_pay` columns; the query now returns date_likely_pay and the
deposit patch now accepts it.

Deploy: no new env vars, no migrations. Files: `server.mjs`, `supply/inject.html`.

## v25.126 - Deposits: "apply to production" bulk-assign + AU region guard

- **Apply a deposit to a whole production**: each deposit row (Productions ▸ Deposits) with a
  PROD# + supplier gets a purple **⤿ apply to prod N** button. It assigns that deposit's reference
  to every OPEN PO on that production + supplier that has no deposit yet. New endpoint
  `POST /api/supply/deposit/:id/apply-all` (returns assigned + skipped-region counts).
- **Region guard (AU isolated)**: an AU deposit can only be assigned to AU POs, and a non-AU
  deposit only to non-AU POs (UK/US/EU/OT interchangeable). Enforced server-side on every
  deposit_ref assignment (the PO patch returns 400 on mismatch) — covers the bulk apply, the
  deposit picker, and any path. The picker also greys out mismatched deposits with a "✗ region" note.

Deploy: no new env vars, no migrations (uses existing columns/endpoints). Files: `server.mjs`,
`supply/inject.html`.

## v25.125 - PO Notes "N" badge: faster tooltip, smaller icon, MASTER DATA label

Refinements to the PO Notes badge (v25.123): the hover tooltip is now a custom one that appears
after ~120ms (was the browser's ~1s native `title`); the "N" icon is a bit smaller; and the
MASTER DATA "Notes" field label now carries the same purple N in front of it.

Deploy: no new env vars, no migrations. Files: `supply/inject.html`.

## v25.124 - Open-row highlight + Order Plan "approve all partials" per PO

- **Open-row highlight**: when a PO or shipment row is expanded, that row's background turns
  cream (#FDFBD4) so it's clear which one is open (a `row-open` class; overrides the sticky
  columns; re-applied after an in-place row patch).
- **Order Plan**: each PO column with unapproved partial cartons now shows a green
  **"✓ Approve N partial(s)"** button in the header, directly under the "N u · N plt" count —
  one click approves every unapproved partial line on that PO (loops the per-line approve).

Deploy: no new env vars, no migrations. Files: `supply/inject.html`.

## v25.123 - Purchase Orders: internal "NOTES" field (separate from Timeline)

New editable **Notes** field on a PO, on the PLAN ▸ **MASTER DATA** sub-tab — distinct from the
Timeline notes. When a PO has notes, a small **purple "N"** badge shows on the grid right after
the PO reference (before the action-count badge): hover to read the note, click to expand the PO
straight onto the MASTER DATA tab. Uses the existing `purchase_orders.notes` column (already in
the schema + PO patch); the grid query now returns it.

Deploy: no new env vars, **no migrations** (notes column already exists). Files: `server.mjs`,
`supply/inject.html`.

## v25.122 - Upload POs: "Download template" button + tab-paste note

Added a **⬇ Download template** button to the Upload POs popup — downloads `PO_upload_template.csv`
(header + example rows) to open in Excel / Google Sheets, fill in, then copy-paste back. Clarified
in the instructions that a Sheets/Excel paste is **tab-separated** and works without commas (the
parser already auto-detects tab vs comma).

Deploy: no new env vars, no migrations. Files: `supply/inject.html`.

## v25.121 - Upload POs: optional SKU + Qty lines (create OR add to existing PO)

The PURCHASE ORDERS ▸ "Upload POs" paste now accepts optional **SKU** and **Qty** columns, and
supports **multiple lines per PO** (repeat the PO number to add several SKU/qty order-plan lines).
Behaviour: a NEW PO is created from its header fields; an EXISTING PO is kept as-is (its details
aren't overwritten) and just has the lines added/updated. Lines are inserted as proposed
(erp_qty=0 → "not in ERP" until pushed), upserted by po+sku. Header row required when using
SKU/Qty. Import summary now reports new / existing-updated / lines-added.

Deploy: no new env vars, no migrations. Files: `server.mjs`, `supply/inject.html`.

## v25.120 - Timeline notes attributed to the signed-in user (not generic "Dock & Bay")

Internal timeline notes (PO, shipment, sample) now record the signed-in user's email instead of
the hard-coded "Dock & Bay". The server reads the authenticated email from the auth layer's
forwarded header — `authUser()` checks x-forwarded-email / x-auth-request-email /
cf-access-authenticated-user-email / x-goog-authenticated-user-email (strips the IAP prefix) /
x-authenticated-user-email / x-user-email. Attribution is done SERVER-side (can't be spoofed by
the client). If no header is present it falls back to "Dock & Bay" (unchanged behaviour).

**ACTION FOR DIVIYAJ:** for this to light up in production, the Gmail auth layer in front of the
app must forward the signed-in email to the Express server as one of the headers above (e.g. set
`X-Forwarded-Email` from the session/proxy). Until it does, notes keep showing "Dock & Bay".

Deploy: no new env vars, no migrations. Files: `server.mjs`.

## Diviyaj deploy — SQL since early 2026-07-01

Run **`diviyaj_deploy_2026-07-01_supply.sql`** on prod (schema `planner`). It bundles both of
today's schema/data migrations (idempotent, wrapped in a transaction):
- `089_productions_57_78_active_confirm.sql` — productions 57–78 → ACTIVE + require confirmation.
- `090_erp_compare_ignored.sql` — new `planner.erp_compare_ignored` table for the ERP COMPARE
  report's ignore list.

All other v25.83–v25.119 changes are app code only (server.mjs + supply/inject.html +
supply/portal-view.js) — no other schema changes. Separately, the ONE-OFF
`po_client_master_update_2026-07-01.sql` (bulk PO client-data from CSV; not tracked in git, not a
schema migration) still needs running once on live if it hasn't been already.
(This consolidated file supersedes the earlier `diviyaj_deploy_2026-07-01.sql` (089 only).)

## v25.119 - PO Payments: "assign" button on the Start deposit (deposit-ref draws)

The Start deposit row now shows a green **"assign »"** button (same behaviour as the "pay »"
button) when the deposit is drawn from a deposit ref and nothing is assigned yet — one click
fills the assigned amount (the calc figure, capped at ref availability) and the date with today.
Direct-cash start deposits keep the existing "pay »" button. payFillBtn now takes an optional
label; its handler restores the original label on error.

Deploy: no new env vars, no migrations. Files: `supply/inject.html`.

## v25.118 - PO/shipment status dropdowns recolour instantly on change

Changing a Status dropdown (PO grid or shipment grid/expand) now recolours it immediately to
match the new value — e.g. a PO set to SHIPPING turns green right away — instead of only after a
reload. `bindEdits` recolours the changed control synchronously (and any synced duplicate), using
the PO palette (upper-case statuses) or the shipment palette (Planned/Shipping/Completed). Mode
dropdowns recolour the same way.

Deploy: no new env vars, no migrations. Files: `supply/inject.html`.

## v25.117 - PO Payments: show deposit FX rate next to "avail"

On PURCHASE ORDERS ▸ PLAN ▸ PAYMENTS, the deposit-ref cell now also shows the deposit's Xero FX
rate: "P56-AU-XR1 ▾  0.00 avail · FX 1.2763". The PO query's deposit-pool lateral now returns the
ref's FX (`deposit_fx`, most-recent paid deposit on that reference).

Deploy: no new env vars, no migrations. Files: `server.mjs`, `supply/inject.html`.

## v25.116 - Silent in-place updates across PO + shipment grids (consistency sweep)

Inline edits that previously re-rendered the whole grid (a visible flash / collapsing expands)
now patch just the affected row in place:
- **PO grid**: changing **Branch / Supplier / PROD# / Batch** (cell pickers) and assigning a
  **Deposit** now use `patchPoRow` (re-fetch + replace that one `<tr>`) instead of a full grid
  re-render. (Assigning a shipment already patched the row.)
- **Shipments grid**: extracted the row into `shipRowHtml` and added `patchShipRow` — used for
  **Add PO, Unassign, Make master, and the Ship-to / Branch destination override**. Each patches
  the shipment's row AND refreshes its open expand in place (keeping the current sub-tab), rather
  than `shipReload` collapsing everything.
Creation/bulk/destructive actions (New PO, Upload, New shipment, Delete, ERP sync) still do a
full refresh by design.

Deploy: no new env vars, no migrations. Files: `supply/inject.html`.

## v25.115 - Shipments Mode sync + Direct-to-Client report: Client column & search

- **Mode/Carrier sync**: changing the Mode (or Carrier/ref) in a shipment's "Dates & tracking"
  panel now instantly updates the same dropdown in the grid row above (and vice-versa), in
  place — `bindEdits` syncs any duplicate control for the same record+field after a save
  (Mode also re-colours). No full grid reload.
- **SUPPLY ▸ BI & REPORTS ▸ DIRECT TO CLIENT**: added a **Client** column (client name) and a
  **search/filter** box (matches PO / client / supplier / ref / branch / shipment).

Deploy: no new env vars, no migrations. Files: `supply/inject.html`.

## v25.114 - SHIPMENTS: fix "unlinked" exception logic

The "unlinked" exception previously meant "no carrier reference / no Flexport match", so a
shipment WITH POs but no carrier (e.g. FOB) was wrongly flagged "unlinked" (reported: PO-1712945,
2 POs). Split into two correct exceptions:
- **unlinked** — the shipment has NO purchase orders linked (`no_pos`, po_count 0).
- **no Flexport match** — the shipment carries a Flexport reference (carrier Flexport / FLEX- ref)
  but there's no matching Flexport shipment (`no_flex_match`).
The ">20 pallets" exception is unchanged (still suppressed for Shipping/Completed). Completed
shipments remain exception-free.

Deploy: no new env vars, no migrations. Files: `server.mjs`, `supply/inject.html`.

## v25.113 - SHIPMENTS: Add-PO refreshes silently

Adding a PO from a shipment's "POs aboard" tab now refreshes just that shipment's expand panel
in place (re-fetches the POs aboard and stays on the POs-aboard tab) instead of reloading the
whole grid and collapsing the row. Implemented via an optional post-render callback on
shipExpand. (The grid row's PO-count summary still refreshes on the next full load.)

Deploy: no new env vars, no migrations. Files: `supply/inject.html`.

## v25.112 - SHIPMENTS: status vocabulary Planned / Shipping / Completed

Shipment statuses are now **Planned · Shipping · Completed** — "Active" renamed to "Shipping"
and "Complete" to "Completed" (dropdown + calculated status). Legacy stored values (Active /
Complete) are normalised on read, so nothing needs a data migration. Also: a shipment in
**Shipping** status no longer shows the ">20 pallets" exception (or the red pallets highlight) —
once it's shipping you can't split it, so that warning only applies before departure (Planned).

Deploy: no new env vars, no migrations. Files: `server.mjs`, `supply/inject.html`.

## v25.111 - SHIPMENTS ▸ POs aboard: assign a PO here + left-align empty message

In a shipment's "POs aboard" tab you can now **add a PO directly**: a search box (dropdown of
active POs) + "+ Add PO" button assigns the chosen PO to this shipment (reuses the existing
assign endpoint; refreshes the grid). The empty-state message is now **left-aligned** and reads
"No POs assigned yet — add one below." (previously right-aligned, referencing a list that
wasn't there). `/api/supply/lookups` now also returns `pos` (active PO numbers) → `polist` datalist.

Deploy: no new env vars, no migrations. Files: `server.mjs`, `supply/inject.html`.

## v25.110 - ERP COMPARE: Branch column, open-action item, ignore capability

Three additions to the ERP COMPARE report:
- **Branch column** — the ERP mirror has no branch field, so it's derived best-effort from the
  PO reference (region token + FBA/Crossdock/B2B/Direct marker), e.g. "UK Crossdock"; shows "—"
  when nothing parses. (To show the real branch, n8n would need to sync it into erp_purchase_orders.)
- **Open-actions item** — when there are open ERP POs missing from the planner, a single
  medium (amber) action appears in SUPPLY ▸ Actions: "There are N POs open in the ERP but not in
  the planner — review the ERP Compare report", with a button that opens the report.
- **Ignore** — each row has an Ignore button; ignored POs drop out of the active list and the
  actions count and move to an "Ignored" section with an Un-ignore button. Persisted in the new
  `planner.erp_compare_ignored` table. New endpoint `POST /api/supply/bi/erp-compare/ignore`.

Deploy: **migration `090_erp_compare_ignored.sql` must be run** (creates planner.erp_compare_ignored).
No new env vars. Files: `server.mjs`, `supply/inject.html`, `migrations/090_erp_compare_ignored.sql`.

## v25.109 - SHIPMENTS: auto-complete when all linked POs are complete

A shipment whose linked POs are ALL complete now shows status **Complete** automatically —
even if it had a stored non-complete status. Previously all-complete only won when no explicit
status was stored. `all_complete` is now evaluated ahead of the stored status in the shipments
query (calculated status; nothing persisted), and `status_auto`/`is_exception` updated to match.

Deploy: no new env vars, no migrations. Files: `server.mjs`.

## v25.108 - SUPPLY ▸ BI & REPORTS: new "ERP COMPARE" report

New report listing open/draft ERP (Cin7) purchase orders that are **not** in the planner's
PURCHASE ORDERS list — restricted to POs whose supplier matches a supplier in the planner
(`planner.suppliers`, kind='supplier'), so freight / internal / test vendors (Flexport, HMRC,
print shops) are excluded. Shows PO, ERP id, supplier, ERP status, order date, value, ERP
delivery date and last-synced. New endpoint `GET /api/supply/bi/erp-compare` (reads the
existing `planner.erp_purchase_orders` mirror; excludes complete/cancelled/void/received).

Deploy: no new env vars, no migrations (uses existing erp_purchase_orders + suppliers tables).
Files: `server.mjs`, `supply/inject.html`.

## v25.107 - SHIPMENTS: completed shipments have no exceptions

A shipment with status Complete/Completed is now treated as exception-free: `shipIsExc()`
returns false for it, so the ⚠ exception badge is suppressed, it's excluded from the
Exceptions filter, and the over-20-pallets red highlight no longer shows. Active shipments
are unaffected.

Deploy: no new env vars, no migrations. Files: `supply/inject.html`.

## v25.106 - PURCHASE ORDERS: search results grouped by status

When a search is active on the PURCHASE ORDERS grid (search already overrides all filters and
spans every status), matching POs are now grouped under status sub-label rows in the order
PRODUCTION · FUTURE · READY TO SHIP · SHIPPING · DELIVERED · COMPLETE (each with a count), so
completed orders no longer sit mixed in at the top. New `groupBy:'status'` mode in poTable;
non-search grouping (None / Production / Master shipment) is unchanged.

Deploy: no new env vars, no migrations. Files: `supply/inject.html`.

## v25.105 - Supplier portal: new document type "Tax Invoice Consolidated"

Added "Tax Invoice Consolidated" to the supplier-portal document-upload type list (DOC_TYPES),
after Commercial Invoice.

Deploy: no new env vars, no migrations. Files: `supply/portal-view.js`.

## v25.104 - Fix: batch barcode download in admin "Preview as supplier"

The Barcodes-tab batch download errored with "po or prod required" when used via the admin
"Preview as supplier" (that path calls `/api/supply/label-data`, which v25.103 hadn't taught
about batches — only the live `/api/portal/label-data` got it). Added the same
`?batch=<id>&supplier=<name>` mode to `/api/supply/label-data`. Verified against live data.

Deploy: no new env vars, no migrations. Files: `server.mjs`.

## v25.103 - Supplier portal: Barcodes tab (by batch)

New **Barcodes** tab on the supplier portal. The supplier picks a **batch**; two buttons then
download **product barcodes** and **carton barcodes** for every product on their order-plan
lines across POs assigned to that batch (their SKUs only). A yellow note at the top explains:
"If a product is missing from a batch, amend the relevant purchase orders' Order Plan. Once
approved, the product barcode can be downloaded in this batch." Buttons are disabled until a
batch is selected; the batch list shows only batches present on the supplier's own POs.

Reuses the existing label/barcode PDF subsystem; the `/api/portal/label-data` endpoint gains a
`?batch=<id>&supplier=<name>` mode (SKUs from purchase_order_lines for the supplier's POs in
that batch). No schema changes (batch_id already on purchase_orders).

Deploy: no new env vars, no migrations. Files: `server.mjs`, `supply/portal-view.js`.

## v25.102 - Supplier portal: Production / Country / Branch filters

The supplier portal's Purchase Orders tab gains three dropdown filters — **Production**,
**Country**, **Branch** — next to the existing search + status pills. Each lists the distinct
values across that supplier's own POs and AND-combines on top of the search/status filter
(search still overrides status; the dropdowns always apply). A dropdown is hidden if the
supplier has no values for it. No server or data changes (fields prod_no/country/branch already
returned by the portal query).

Deploy: no new env vars, no migrations. Files: `supply/portal-view.js`.

## v25.101 - Mobile: SHIPMENTS grid parity + filters side by side

Applied the PO-grid mobile treatment to the SHIPMENTS grid: row "PLAN" button → "P"; reduced
cell padding; long shipment refs wrap after ~15 chars; and columns 1 (P/★) + 2 (shipment ref)
are now frozen/sticky on horizontal scroll (added on all viewports, mirroring the PO grid),
with the frozen first column shrunk to 54px on phone so the ★ sits next to the ref.

Also: the shipments page's Country + Branch filter dropdowns now sit side by side on one row on
phone (wrapped in a `.sh-filt-row`; `display:contents` on desktop so it's unchanged there),
instead of two full-width stacked rows.

Deploy: no new env vars, no migrations. Files: `supply/inject.html`.

## v25.100 - Mobile: tighter PO grid cells + close the ★↔PO gap

On phone, PURCHASE ORDERS grid: reduced cell padding (4px), and shrank the frozen first column
from 78px → 50px. That column was sized for the old "PLAN" label; with just "P" + ★ it left a
~30px gap before the PO reference. Shrinking it (and shifting the PO column's sticky offset to
match) puts the ★ focus icon right next to the PO ref. Desktop unchanged.

Deploy: no new env vars, no migrations. Files: `supply/inject.html`.

## v25.99 - Mobile: PO grid — "P" button + wrap long PO numbers

On phone, in the PURCHASE ORDERS grid only: the row's "PLAN" button shows as "P" (to save
width), and long PO numbers wrap after ~15 characters (`.po-numcell b` → inline-block,
max-width:15ch, word-break) so a long ref like PO-DILLARDS-3223429503 breaks onto two lines
instead of stretching the column. Short refs stay on one line. Desktop unchanged.

Deploy: no new env vars, no migrations. Files: `supply/inject.html`.

## v25.98 - Mobile: current section title next to the hamburger

The mobile top bar now shows the active top-level view (DEMAND / SUPPLY / BUY / FBA / REPORTS)
as a title right of the ☰ icon, so you always know where you are with the nav collapsed. Kept
in sync via a MutationObserver on #view-tabs-row (updates however the view changes). The search
box still appears only inside SUPPLY. Desktop unchanged.

Deploy: no new env vars, no migrations. Files: `artifact_v16.7.html`.

## v25.97 - Mobile: PO card sub-nav collapses to primary tabs + "More ▾"

The PO card's sub-tab strip (9 tabs) wrapped over 3 rows on phone. It now shows three primary
tabs — **PAYMENTS · CLIENT/FBA · SHIPMENTS** — plus a right-aligned **More ▾** dropdown holding
the rest (DATES, ORDER PLAN, MASTER DATA, LANDED COSTS, TIMELINE, LINKED RECORDS). Picking an
overflow tab shows its name on the More button; any exception counts on hidden tabs roll up
into a badge on More so nothing actionable is buried. Desktop keeps the full strip.

Implemented in `setupMobSubnav()` (called at the end of bindPay, phone-only) — a pure DOM
transform over the existing tabs, so panel switching still uses the original handlers.

Deploy: no new env vars, no migrations. Files: `supply/inject.html`.

## v25.96 - Mobile: payment-plan table scrolls sideways instead of squishing

In the full-screen PO card (PAYMENTS tab), the payment-plan table was forced to 100% width
while its first column has a 330px min-width, so on a phone the other 7 columns were crushed
to a few pixels. Now wide tables inside the card (`#mob-sheet-ov .tw table`) size to their
columns (`width:max-content;min-width:100%`) so they scroll horizontally within their
bordered wrapper (which already has overflow:auto) — narrow tables still fill the width.
Applies to the payment plan, order plan, landed costs and timeline tables.

Deploy: no new env vars, no migrations. Files: `supply/inject.html`.

## v25.95 - Mobile: fix the full-screen PO/shipment card (was blank / no tabs)

The v25.93 full-screen card put `position:fixed` on the expand-row `<td>`. A fixed-positioned
table cell renders unreliably (table-cell + fixed positioning is undefined in CSS), so the
card's sub-tab bar ("nav 3": PAYMENTS / DATES / CLIENT/FBA / ORDER PLAN / …) and content
weren't showing on phone.

Fix: on phone, the expand cell's content is now moved into a real `<div>` overlay
(`#mob-sheet-ov`, `position:fixed`) appended *inside* `#supply-root` (so all the panel's
existing CSS still applies), with a sticky "← Back to list" bar; on close it moves back into
the cell. The sub-tab strip now **wraps** so every tab is visible at once (instead of a
hidden horizontal-scroll strip), and the PAYMENTS/CLIENT/DATES forms stack label-over-value
with full-width inputs. Verified by rendering the card headless at phone width. Desktop is
unchanged (the overlay is only created when the viewport is ≤640px).

Deploy: no new env vars, no migrations. Files: `supply/inject.html`.

## v25.94 - Mobile: search in the top bar, DEMAND nav in the drawer, readable PO detail

Three phone (≤640px) refinements, all additive; desktop untouched.

- **Search moved into the fixed top bar**, next to the hamburger (`#hz-topbar` = ☰ + search).
  The in-content supply search box is hidden on phone; the top-bar box proxies straight into
  the current section's `#sup-search` (its result count still shows in the grid). It only
  appears inside SUPPLY (`body.supply-on`, toggled by showSupply/hideSupply) and clears when
  you navigate.
- **DEMAND second-level nav in the drawer.** When DEMAND is the active view, the drawer now
  lists its sub-tabs (Plan / KPIs / Targets / Actions / Calendar) under a "Demand planner"
  heading — the same pattern as SUPPLY sections. Tapping DEMAND reveals them in place.
- **PO detail panels readable on phone.** The PAYMENTS / CLIENT / DATES forms stack label
  over value with full-width inputs (Yes/No selects stay compact), and the two-column
  client/packing layout collapses to one column. Fixes the "can't see much" when opening a PO
  and viewing its plan on mobile.

Deploy: no new env vars, no migrations. Files: `artifact_v16.7.html`, `supply/inject.html`.

## v25.93 - Mobile: drawer navigation + full-screen card

On phone (≤640px) the two stacked top navs (the dark view-tabs strip + the supply section
dropdown) are replaced by an **off-canvas drawer**. A fixed hamburger (top-left) slides in a
menu listing the top-level views (DEMAND / SUPPLY / BUY / FBA / REPORTS) and, when SUPPLY is
active, its sections (Actions, BI & Reports, Productions, Purchase Orders, Order Plan, …).
Tapping a view navigates; tapping SUPPLY reveals its sections in place; tapping a section
navigates and closes the drawer. Desktop is untouched (drawer/hamburger are `display:none`;
`#view-tabs-row` still shows).

Implementation: additive. `artifact_v16.7.html` gains `#hz-burger` / `#hz-drawer` /
`#hz-backdrop` + an IIFE that mirrors the real `#view-tabs-row` buttons (so it picks up the
injected SUPPLY button automatically) and drives supply sections through a new
`window.__supplyNav` bridge exposed from `supply/inject.html` (`{sections, reports, select,
current}`). No server or data changes.

Also (from the previous step, shipped here): when a PO or shipment row is expanded on phone,
its detail panel renders as a **full-screen sheet** (`td.mob-sheet`, fixed/inset:0) with a
sticky "← Back to list" bar, so the detail is readable without horizontal scrolling. Desktop
still expands inline.

Deploy: no new env vars, no migrations. Files: `artifact_v16.7.html`, `supply/inject.html`.

## v25.9 - Buy plan: near-term gaps go to Urgent, not Buy-3PL

A Buy-3PL is now only placed when there's **full standard lead time** (ideal placement is a real current/future
month). If the ideal placement is already in the past (the need is sooner than a standard-lead order could
arrive), it's **no longer shown as an overdue Buy-3PL** — it falls through to the **Buy 3PL Urgent** column
(rush/air), and no phantom stock is carried forward so the Urgent pass sizes the gap correctly. Fixes a buy
showing in Buy-3PL with a faster-than-lead delivery (e.g. June placement → July arrival on a 17-week lead).

## v25.10 - Buy plan: cleaner discontinued display

After a product's discontinue date the buy plan now: (a) **removes the standalone "Discontinue Date" row**;
(b) shows **"DISC"** only in the **buy columns** (Buy 3PL · Buy 3PL Urgent · Buy FBA) — i.e. no further buying;
(c) **keeps showing the real demand forecast + stock-on-hand run-down** in the month cells (display pass uses
real demand even past disc, while buys stay suppressed) so you can see the tail run down.

## v25.11 - Buy plan: real Buy-FBA calc (direct-to-FBA), reduces Buy-3PL

The **Buy FBA** column was always 0 (`fdQ` hardcoded). Now there's a real, **independent** Buy-FBA calc: a
standalone FBA cover projection (FBA on-hand + FBA inbound vs FBA demand) that, when future FBA demand isn't
covered, recommends buying **direct to FBA** to hold the FBA cover target (tf weeks), placed at the China lead,
carton/MOQ-rounded, never past the discontinue. Those direct-to-FBA arrivals feed FBA inbound (`assumedArrF`),
so the 3PL pass sees FBA already covered and **transfers/buys less → Buy-3PL drops** wherever it was previously
topping FBA up. (Near-term FBA gaps the direct lead can't reach still fall to the 3PL→FBA transfer as before.)

## v25.12 - Buy plan: cover weeks counts post-discontinue demand

The cover-weeks calc was zeroing demand past the discontinue cutoff, so a discontinued SKU's cover looked
infinite. Now the **displayed cover** counts **real future demand including post-discontinue**, so it runs down
realistically alongside the demand + SOH rows (display only — buy decisions keep their own post-disc-zeroed
forward demand). Completes the discontinued-row cleanup.

## v25.13 - Buy plan: DISC only on buy rows (real fix — dr() helper override)

The previous discontinued-display work was masked by the **`dr()` row helper itself**, which replaced **every**
cell with "DISC" for any post-discontinue month (and the month header showed "DISC" too). Removed both
overrides: now the **demand / SOH / cover rows show real numbers** (run-down) with the **month labels intact**
(post-disc columns get a subtle tint), and **DISC shows only on the buy rows** (Buy 3PL / Urgent / FBA) via
their own cell functions. This is what actually makes v25.10/25.12 visible.

## v25.14 - Buy plan: Buy-FBA reworked (visibility slice of Buy-3PL) + transfers continue past discontinue

Two fixes to the Buy-FBA model:

1. **Buy FBA no longer over-buys.** The v25.11 *independent* direct-to-FBA pre-pass ignored existing 3PL stock,
   so it recommended buying direct to FBA even when 3PL was sitting on 26 weeks of cover (e.g.
   TOWLB-CAB-LG-LTPNK-R/UK wanted 480 in June). That pre-pass is **removed**. Buy FBA is now the **FBA top-up
   slice of the 3PL buy made visible** — `nextFbaNeed` (the forward FBA cover, over *lead + cover weeks*, that
   existing 3PL on-hand + inbound can't transfer-cover). When 3PL is overstocked, transfers cover FBA →
   `nextFbaNeed = 0` → **Buy FBA shows 0**. It is **not** a separate buy and is **not** stripped out of Buy 3PL
   (Buy 3PL stays whole — it still funds the top-up, which is transferred 3PL→FBA later).

2. **FBA transfers continue after discontinue.** 3PL→FBA transfers used to stop at the discontinue date (the
   transfer target zeroed post-disc demand), stranding sellable stock in 3PL. The **transfer** target now uses
   **real** FBA demand so existing stock keeps moving into FBA to sell down; **new buying** still stops at disc
   (the buy target stays post-disc-zeroed).

## v25.15 - PO Payments: parse-invoice on admin side + deposit cap; Deposits: stranded-deposit surfacing

Three changes:

1. **Parse supplier invoice from PO ▸ Payments.** Next to *Final invoice amount* there's now an
   **Upload &amp; parse invoice** control (.xlsx). It reuses the same server parse/apply endpoints as the
   supplier portal: parse → preview the SKU / qty / price diffs vs the current order plan → **Apply**, which
   writes the changes into `portal_line_costs` as **unconfirmed order-plan changes** and jumps to the ORDER
   PLAN tab to review &amp; confirm (the existing accept flow). No new endpoints, no DB changes.

2. **Starting deposit can't exceed the deposit ref's availability.** When a PO draws its start deposit on a
   deposit ref, the drawn amount is now **capped at that ref's remaining balance** and the shortfall **rolls
   into the completion deposit** (server calc). The manual *amount* input is also clamped (with a notice) so you
   can't over-assign. Example: PO with only 0.01 left on its ref now draws 0.01 to start, rest to completion.
   (Admin calc only — the supplier portal has no deposit-pool concept.)

3. **Productions ▸ Deposits: stranded-deposit surfacing.** A deposit with **money remaining but no open PO**
   now shows its *Remaining* in **red + bold** (title "Deposit remaining, no open PO"), and raises a matching
   **action item** "Deposit remaining, no open PO". New default filter **"Remaining · open"** — open (not
   closed) deposits that still hold money — is now the landing filter on the Deposits tab.

## v25.16 - Buy 3PL Urgent: model the rush lead; Deposits: close/reopen without a full refresh

1. **Buy 3PL Urgent now respects a 4–5 week minimum rush lead.** Previously the urgent qty assumed rush stock
   could arrive the instant a stockout began. Now it places the urgent **arrival** at the earliest a rush could
   physically land (~5 weeks from today — mid-month that's late next / early following month) and **sizes the
   rush against the deficit from that arrival forward**. Demand before arrival is treated as an unavoidable
   stockout the rush can't rescue, and if the spike has subsided by the time it lands, little or no rush is
   recommended. Tooltip now shows the stockout month, the rush lead, and the earliest the rush could land.

2. **Deposits close/reopen in place.** Closing or reopening a deposit in Productions ▸ Deposits no longer
   triggers a full section re-render — the row updates locally and the register redraws (closed rows drop out
   of the open filters). Derived views (Productions / Actions / cash flow) are still invalidated so they're
   fresh on next visit.

## v25.17 - Shipments: colour the Mode column

In SUPPLY ▸ Shipments the **Mode** dropdown is now colour-coded: **air → green**, **fob → purple**, sea stays
default. Applies in both the grid and the shipment detail.

## v25.18 - PO Payments: wider parse-invoice preview + tick for unchanged values

The parse-invoice preview table (PO ▸ Payments) now **fills its width** (was shrinking to content) and the
payments form was widened to give it room. In the Qty and Price columns an **unchanged** value now shows
**`600 ✓`** (green tick) instead of `600 → 600`; only genuinely **changed** values show the `cur → new`
arrow, and new SKUs show just the invoice value.

## v25.19 - PO Payments: deposit-cap message fix, auto-date the start deposit, invoice populates final amount

Three fixes:
1. **Special characters in the deposit-cap alert** — the `&rsquo;` HTML entity showed literally in the popup;
   replaced with a real apostrophe.
2. **Start deposit auto-dates.** Entering a starting-deposit amount now auto-stamps **today's date** in the
   Date paid field (only when it's empty), saved in the same write.
3. **Parse populates Final invoice amount.** Applying a parsed invoice now also sets the PO's **Final invoice
   amount** to the parsed invoice total. When nothing else changed, a **"Set Final invoice amount"** button
   appears so the total can still be captured.

## v25.20 - PO Payments: parse-preview polish

The parse-invoice **Apply** button is now **light green** (more visible), and the summary line
("PO · N lines · invoice total … — N changed/new/match") is rendered at a larger font.

## v25.21 - Fix: links to a PO now open the direct PO even past the render cap

Links to a purchase order (from Shipments ▸ POs aboard, Deposits, Cash flow, Actions) navigate to PURCHASE
ORDERS and auto-expand the PO. The grid caps its render at 250 rows, so a PO beyond the cap wasn't in the DOM
and the link silently landed on the list without opening it. Now if the target PO isn't found, the grid
reveals all rows and retries, so the direct PO always opens.

## v25.22 - Purchase Orders: assign shipment without a grid refresh; HORIZON version label

1. **Assigning a shipment no longer re-renders the whole grid.** The affected PO row is now patched in place
   (no flash / scroll jump / collapsed detail). When the grid is grouped by shipment — where the PO must move
   into the new shipment's group — it still does a full refresh, but now preserves scroll position.
2. **Version label** in the SUPPLY sub-nav changed from `v25.xx · sandbox` to **`HORIZON v25.xx`**.

## v25.23 - Shipments: chained final dates + smarter override defaults

Shipment dates (departure → landing → arrival → completion) now **chain**: each stage's calculated date is
derived from the *effective* previous stage, so overriding an earlier date shifts the later calculated ones.
- Landing = effective departure + branch transit (by mode); Arrival = effective landing; Completion =
  effective arrival + 7 days.
- The grid and the Dates & tracking sub-tab already show the effective ("final") dates, so they now reflect
  overrides correctly (a directly-overridden stage tags **S**; a derived stage tags **calc** but uses the
  chained date).
- Each override **date picker now pre-fills** with that stage's current final date (the previous override if
  set, else the calculated date) instead of opening on today. Nothing saves unless you change it.

## v25.24 - Fix: DB connection exhaustion on the session-mode pooler

Repeated dev-server restarts were stranding DB connections on the Supabase **session-mode pooler** (cap ~15),
eventually causing `EMAXCONNSESSION max clients reached … pool_size: 15` and failed page loads. Fixes:
- **Graceful shutdown** — `SIGINT`/`SIGTERM` now `pool.end()` before exit, so a restart releases its
  connections immediately instead of leaving them lingering until the pooler times out.
- **Lower pool `max`** (dev 10 → 6) so a stranded generation plus the live process stays well under 15.

(No DB/schema change.)

## v25.25 - PO detail: move "Ship to" to the Master Data sub-tab

The PO **Ship to (country)** override now lives in the **Master Data** sub-tab (next to Branch/Supplier),
where it belongs, and was removed from the Dates sub-tab. Blank = use the branch country; the source note
shows "override" vs "branch country". (The grid's "M" badge still flags a manual ship-to override.)

## v25.26 - Purchase Orders: country flags + more compact filter bars

The "Ship to" country pill filters now show a **flag** (🇬🇧 UK, 🇺🇸 US, 🇦🇺 AU, 🇪🇺 EU, 🇨🇦 CA, 📦 Direct), and the
PO filter bars (progress / action / country) are **more compact** — tighter spacing between pills and labels.

## v25.27 - Assign shipment: default list is same-country shipments

When assigning a shipment to a PO, the picker now defaults (before you type) to **shipments going to the same
country as the PO**, with a "Shipments to {country} — type to search all" hint. Typing searches the full list
across all shipments (ref / master PO / country). Each option now also shows the shipment's destination.

## v25.28 - Productions: larger "add" buttons

The **+ New production**, **+ Deposit**, and **+ Other payment** add buttons on the Productions sub-tabs are
now full `save-btn` buttons instead of the small badge style.

## v25.29 - Fix: "Deposit over-assigned" action false-firing

The SUPPLY ▸ Actions "Deposit over-assigned" check now (a) **excludes closed deposits** (`status <> 'closed'`)
and (b) uses a **1-cent tolerance** (`used > pool + 0.01`) instead of a strict `>`. This stops the nonsensical
"Assigned start deposits 19360 exceed pool 19360 (remaining 0)" — a sub-cent rounding difference that the
display rounded away — and stops the action appearing on already-closed deposits (e.g. P40-UK-XR3).

## v25.30 - Samples feature — Phase 1: schema (migration 084)

First slice of the new **Samples** feature. Adds migration **`084_samples.sql`**:
- `planner.sample_requests` (+ `sample_request_lines`) — sample requests with recipient/address, SKUs/qty,
  required completion, purpose[], notes, one assigned supplier, accept/expected-completion/tracking/carrier.
- `planner.sample_notes` — shared admin/supplier timeline (mirrors `shipment_notes`).
- `planner.supplier_charges` — generic charge table for **samples and shipments**; accepting one posts an
  Other Payment (`deposits`, `is_deposit=false`).

**DIVIYAJ — NEW MIGRATION:** `084_samples.sql` must be run on prod (first new migration since
`diviyaj_deploy_2026-06-28.sql`). Idempotent. No data backfill. Later phases (endpoints + UI) build on it.

## v25.31 - Samples feature — Phase 2: server endpoints

Backend for Samples (no UI yet — that's Phase 3/4). Smoke-tested end-to-end against the sandbox.
- `GET /api/supply/samples` — grid list with line/units counts, `is_open` (open until tracking set AND no
  pending charge), `overdue` (today > required, or supplier-expected > required), pending-charge + unread-note counts.
- `GET /api/supply/sample-detail/:id` — full record + lines + timeline + charges.
- `GET /api/supply/sample-addresses?q=` — autocomplete from previously sent recipients/addresses.
- `GET /api/supply/sample-notes?id=` + `POST /api/supply/sample-note` + `…/sample-note-read/:id` — timeline.
- `POST /api/supply/sample-create` (request + SKU lines, assigns ref `SR-<id>`), `…/sample/:id` (patch),
  `…/sample/:id/lines` (replace — used for paste), `…/sample/:id/accept`, `…/sample/:id/delete`.
- Charges (samples + shipments): `POST /api/supply/charge-create`, `…/charge/:id/accept` (posts the
  Other Payment with freight+product breakdown and, for shipments, the linked POs in the description),
  `…/charge/:id/reject`.

## v25.32 - Samples feature — Phase 3: admin SUPPLY ▸ Samples UI

New **SAMPLES** top-menu section under SUPPLY:
- **Grid** with a **calculated status** (Awaiting supplier / In production / Charge to review / Shipped /
  Complete / Cancelled) shown as a coloured chip, **Open/Closed/All filter defaulting to Open**, overdue ⚠
  icon, unread-note + pending-charge badges, tracking, units.
- **+ New sample** create form — supplier picker, **find-past-address autocomplete** (populates all address
  fields), recipient/address/phone, completion date, **multi-select purpose**, SKU rows **and paste** (sku, qty),
  notes.
- **Expand panel** — recipient/address, SKUs, fulfilment (editable completion/status, supplier accepted/
  expected/tracking read-out), **charges** with Accept→Other Payments / Reject, and the shared **timeline**.

(Server-side: also adds `status_calc` to the samples list endpoint.) Phases 4 (supplier portal) + 5 (shipment
charges) still to come.

## v25.33 - Move BARCODES under PRODUCTIONS

BARCODES is no longer a top-level SUPPLY menu — it's now a **sub-tab of PRODUCTIONS** (alongside Productions /
Deposits / Other Payments / Payments Due / Payments Report). Old `barcodes` routes redirect to the new
sub-tab. `renderBarcodes` now renders into the productions body.

## v25.34 - Productions value to 2dp; Samples grid left-aligned

- **Productions grid value** was rounded to 0 dp server-side, so `money()` always showed `.00` (looked like
  integers). Now `round(…, 2)` — real cents flow through.
- **Samples grid** is now fully **left-aligned** (the supply tables default to right-align; only `.l` cells go
  left). Added a `samp-tbl` rule. Left is the intended default for grids.

## v25.35 - Samples feature — Phase 4: supplier portal

New **Samples** tab in the supplier portal (scoped to the logged-in supplier):
- **Unaccepted counter** badge on the tab; Open/Closed grouping.
- Per sample: **Accept request**, set **expected completion**, add **tracking + carrier**, post **timeline
  notes**, and **create a charge** (freight + product → admin accepts → Other Payment).
- **+ New sample request** — the supplier can originate a sample (recipient/address/SKUs-paste/purpose/notes).
- Server: samples added to `/api/portal/bootstrap`; new portalAuth-scoped endpoints
  `/api/portal/sample-{accept,update,note,charge,create}` + `/api/portal/sample-notes/:id` (each verifies the
  sample belongs to the supplier). portal.html EP map extended.

## v25.36 - Samples (admin): editable recipient/address/notes/SKUs + tracking & carrier

The admin SUPPLY ▸ Samples detail panel is now editable: **recipient & address fields, notes, and SKUs**
(add/remove/edit lines + Save SKUs), plus **tracking code & carrier** inputs. Saves via the existing
sample patch / lines endpoints.

## v25.37 - Samples show in the admin "preview as supplier"

The admin SUPPLY ▸ Portal Users "preview as supplier" now includes the supplier's **samples** (the samples
endpoint was enriched with address/notes/lines/charges, and `loadPortalData` feeds them to the preview).
So the Samples tab is populated both in the real portal (`/api/portal/bootstrap`) and the admin preview.

## v25.38 - Portal Samples cards: clearer, neater layout

Reworked the supplier-portal sample cards into tidy labeled sections: **Ship to** (multi-line address),
**SKUs & quantities** (proper table), **Purpose**, and **Notes** (in its own box), with the fulfilment
inputs, charges, and timeline each in their own clearly separated block.

## v25.39 - Samples feature — Phase 5: "create charge" on Shipments

Shipments now have a **Charges** sub-tab (admin shipment detail): create a charge (supplier + freight +
product), list charges, and **Accept → Other Payments** / Reject. Accepting posts an Other Payment whose
description names the shipment **and its linked POs** (e.g. "Shipment PO-57EUBL1 (POs: …) — freight $300 +
product $0"), per spec. Reuses the generic `supplier_charges` table + `charge/:id/accept`.
Also added portal-scoped `/api/portal/shipment-charge(-s)` endpoints (supplier-side UI deferred until the
real portal's Shipment Plan tab is fed data — a separate follow-up).

## v25.40 - Portal Samples: SKUs shown as "qty × SKU", left-aligned

Portal sample card SKUs now display as a left-aligned **"23 × TOWLB-CAB-LG"** list (qty × SKU) instead of a
table.

## v25.41 - Fix: sample actions work in the admin "preview as supplier"

The admin "preview as supplier" Samples tab couldn't accept/charge/note (its EP map lacked sample endpoints,
so the buttons did `fetch(undefined)` → "The string did not match the expected pattern"). Added admin-gated
`/api/supply/sample-{accept,update,charge}` (body `{id}`, matching the portal-view shapes; the real portal
uses the `/api/portal/sample-*` equivalents), wired them into the preview EP, and the "new sample" form now
sends the previewed supplier name. (`sample-note` also accepts `id` or `sample_id`.)

## v25.42 - CONFIG ▸ Portal users: inline add row (no popups)

"+ Portal user" now inserts an editable **new row** instead of `prompt()` dialogs: an **email** field
(`type=email` + format validation), a **supplier** field that's a **search/dropdown from the supplier list**
(must match a real supplier), and an optional contact — with **inline error messages** (no popups). Add/Cancel
in the row; saves via the existing create endpoint.

## v25.43 - Samples admin UI/UX polish

Design pass on the admin Samples surface:
- Grid: **"PLAN" → "View"** (right vocabulary for samples); **Units** now reads "3 · 2 SKUs" instead of the
  cryptic "3 / 2"; the **required date turns red** when overdue (not just a small ⚠).
- **Create form** regrouped into labelled sections (Supplier & recipient / Address / SKUs / Details) in a
  bordered card with dividers, instead of one long stack.
- **Detail panel** inputs now carry **persistent micro-labels** (so a filled "London" still shows it's *City*,
  etc.) across recipient/address and tracking/carrier.

## v25.44 - Samples detail: read-only by default with Edit/Done toggle

The SUPPLY ▸ Samples detail panel now opens **read-only** (clean display of recipient/address, SKUs as
"qty × SKU", purpose, notes, fulfilment). An **Edit** button (next to Delete) switches to edit mode where
recipient/address, SKUs, notes, tracking/carrier, status **and Purpose** (checkboxes) are all editable;
**Done** returns to read-only. Field label **"Completion req." → "Requested Completion Date"**.

## v25.45 - Portal Samples: grid + Manage expand + filters/search

Reworked the supplier-portal Samples tab from a card list into a **grid (one row per sample)** with a
**Manage** button (+ action badge) that expands the full detail in place (like Shipments/POs). Added **filter
pills** (Open default · Not yet accepted · Closed · All, with counts) and a **search** box. The add button is
now **"+ New Sample Shipment"**.

## v25.46 - Admin Samples: prominent supplier-note notification + SAMPLES (n) nav count

When a supplier posts a sample timeline note (or a charge is pending), the admin now sees it clearly:
- A prominent **amber badge next to the View button** on that sample's row (was an easy-to-miss dot by the ref).
- A **count badge on the SAMPLES top-menu tab** — "SAMPLES (n)" — counting samples with unread supplier
  notes or pending charges; fetched on SUPPLY load so it shows without opening the tab, and refreshed when the
  grid renders.

## v25.47 - Admin Samples: "Not Accepted" filter pill

Added a **Not Accepted** filter pill to the SUPPLY ▸ Samples grid (status = "Awaiting supplier"), alongside
Open / Closed / All.

## v25.48 - Purchase Orders: Client columns under the DIRECT filter

When the **DIRECT** ship-to pill is active, the PO grid now shows two extra columns — **Client** and **Client
sales ref** — between Branch and Status (hidden otherwise; the columns already exist in the data as
`client` / `sales_order_ref`). Expand-row colspan adjusts accordingly.

## v25.49 - Samples: "Change requested" workflow (migration 085)

If a sample's **SKUs/quantities change after the supplier accepted it**, the request flips to **"Change
requested"** — treated like not-yet-accepted: it stays open, shows as needing attention, and the supplier
must **re-accept** (which clears it). Adds migration **`085_sample_change_requested.sql`** (a
`change_requested` flag). Admin grid shows a red "Change requested" chip and the **Not Accepted** filter
includes it; the supplier portal shows **"Not accepted" / "Change requested" in bold red** and offers a
**Re-accept** button.

**DIVIYAJ — NEW MIGRATION:** `085_sample_change_requested.sql` (idempotent, no backfill).

## v25.50 - Sample timeline: bigger text, left-aligned, bidirectional read/unread

- Timeline notes are now **larger (13px) and left-aligned** on both the admin (SUPPLY ▸ Samples) and the
  supplier portal.
- **Bidirectional read/unread** (reusing `sample_notes.read_at` as "read by the recipient"): the admin reads
  supplier notes (existing), and the **supplier now reads D&B notes** in the portal — unread D&B notes show a
  highlighted "new" badge + Mark-read, feed a per-sample badge and the **SAMPLES tab count** in the portal.
  New portal endpoint `/api/portal/sample-note-read/:id`.

## v25.51 - Sample unread badges show the total count

The SAMPLES tab badge (portal) and SAMPLES nav badge (admin) now show the **total unread-note count** summed
across samples (was a count of samples). The per-row Manage/View badge already shows that sample's own unread
count. (Confirmed: a supplier's own notes never show "Mark read" in the portal, and a supplier-posted note
shows as unread on the admin side — both already correct since v25.50.)

## v25.52 - Samples: attachments (supplier + supply-plan user)

Both the supplier portal and the admin SUPPLY ▸ Samples detail can now **upload, view and remove attachments**
on a sample, shown in the expanded view. Reuses `planner.portal_attachments` (keyed by the sample ref,
`category='sample'`) — no migration. New endpoints: portal `/api/portal/sample-attachment(-remove)` +
extended portal attachment-view to allow sample refs; admin `/api/supply/sample-attachment(-remove)` (and the
admin detail also uses the existing `portal-upload`). Attachments listed in the bootstrap + sample-detail.

## v25.53 - Samples & Other Payments polish

- **Other Payments grid:** description input widened (2×) and the Amount input narrowed, so descriptions are
  readable without crowding the figure.
- **Charge → Other Payment** (samples & shipments): the posted Other Payment now uses the **sample/shipment
  reference** (e.g. `SR-8`) as its Reference and a **due date of today**.
- **Sample shipped with tracking:** when a sample is saved with a tracking code (supplier portal or supply view),
  an unread timeline note "Order shipped — tracking …" is auto-added, so the other side gets a mark-as-read
  notification.
- **Open filter** (admin samples + portal): now also includes any sample with an **unread note**, so items
  needing attention stay in the default Open view.
- **Samples grid Charges column:** shows accepted charges as e.g. **`550.00 accepted`** alongside the
  pending-review badge (was blank).
- **Portal sample attachments:** the upload row is now left-aligned.

## v25.54 - Samples: on-behalf attribution, status parity, recently-shipped stays open

- **Timeline attribution "D&B as <supplier>":** when D&B posts on the supplier's timeline while acting *as* the
  supplier (the "Preview as supplier" pane, or the auto "Order shipped" note triggered from supply view), the
  entry is now labelled **"D&B as Ballast"** (example) instead of plain "Dock & Bay" / "Supplier". These on-behalf
  notes no longer count as unread supplier notes for D&B (no false action badge).
- **Status parity:** the sample status shown in the supplier portal is now the **same calculated status** as
  SUPPLY▸Samples (Awaiting supplier / In production / Shipped / Charge to review / Change requested / Complete /
  Cancelled), using the identical colour chips. The portal bootstrap now returns `status_calc`.
- **OPEN filter keeps recently-shipped samples:** a sample that has shipped stays in the **Open** view for
  **30 days** after dispatch (keyed off the "Order shipped" timeline note), in both SUPPLY▸Samples and the portal,
  rather than dropping out of Open the moment tracking is added.

## v25.55 - Other Payments description fills column; Payments Due gated on confirmed invoice

- **Other Payments:** the Description input now fills the full column width (was a fixed 240px narrower than the
  column).
- **Payments Due report:** PO completion/balance payments now appear **only once the PO's final invoice amount
  is confirmed** (`supplier_invoice_total` set) **and** the milestone has a due date — so the report shows real,
  payable amounts rather than estimates. Deposits due and Other Payments due continue to show, grouped by supplier.

## v25.56 - On-behalf sample notes now notify the supply/samples page

- Fix: a note left from the **Preview as supplier** pane (labelled "D&B as &lt;supplier&gt;") was not raising an
  unread notification on SUPPLY▸Samples. On-behalf notes are supplier-side entries, so they now count toward the
  sample's unread badge and the SAMPLES(n) nav count — and the supply timeline shows a **Mark read** control for
  them so the notification can be cleared. (Reverts the v25.54 exclusion that suppressed them.)

## v25.57 - Supplier portal: add freight charge on a PO → accept → Other Payment

- **Portal PO card (SHIPMENT section):** suppliers can now add a **freight charge** next to carrier/tracking.
  - PO already on a shipment → the charge attaches to that shipment; the supplier sees their submitted charges
    with status (pending/accepted).
  - PO with no shipment yet → enter carrier/tracking + an optional freight charge and "Create shipment & save"
    creates the shipment (ref = PO) and logs the charge against it.
- The charge enters the existing **acceptance workflow**: D&B reviews it in **SUPPLY▸Shipments ▸ Charges** and
  accepting posts an **Other Payment** (reference = shipment, description lists the POs aboard).
- **Discoverability:** the admin Shipments grid row and the Charges sub-tab now show a green **pending-charge
  count** badge so D&B notices charges awaiting review.
- New endpoint `/api/supply/shipment-charge` (preview/admin parity for the portal `/api/portal/shipment-charge`).

**Deploy note (Diviyaj):** new live `/api/portal/shipment-charge` + `/api/portal/shipment-charges/:ref` must be
wired (preview is on `/api/supply/*`). No new migration — reuses `planner.supplier_charges` (`source_type='shipment'`).

## v25.58 - Packing & Labelling on a PO + supplier "Direct to Client details" approval

- **SUPPLY ▸ Purchase Orders ▸ CLIENT/FBA tab:** new **Packing and Labelling** section (second column) — Polybags,
  Dock & Bay Product barcodes, RFID Product Barcodes, Dock & Bay Carton labels, Client Specific Carton Labels (each
  a Yes/No + notes), plus Pallet Packing requirements and Other Packing & Labelling requirements (notes). Shows the
  supplier's approval status.
- **Supplier portal (PO card):** new read-only **DIRECT TO CLIENT DETAILS** sub-tab showing all the above, with an
  **Approve Direct to Client details** button. Until approved it shows as an action notification on the PO's MANAGE
  badge. Editing any packing field on the admin side re-requests approval.
- **SUPPLY ▸ Reports ▸ Direct to Client:** new **D2C details** column showing Approved / Awaiting / — per PO.
- **Migration:** `086_po_packing_labelling.sql` (12 packing columns + `dtc_accepted_at` / `dtc_accepted_by` on
  `purchase_orders`). Applied to sandbox; **Diviyaj must run on prod.**
- New endpoints `/api/portal/dtc-accept` + `/api/supply/dtc-accept` (preview parity).

**Deploy note (Diviyaj):** run migration **086**; wire live `/api/portal/dtc-accept`; the portal bootstrap PO rows
and the admin `purchase-orders` query now also return the `pack_*` + `dtc_accepted_*` fields.

## v25.59 - Packing & Labelling Yes/No dropdowns colour-coded

- The Yes/No dropdowns in the CLIENT/FBA ▸ Packing and Labelling section are now **green for Yes, red for No**,
  recolouring instantly on change. (Save-confirmation flash suppressed on these so the colour reads true.)

## v25.60 - Direct to Client details tab always shows on the portal

- The **DIRECT TO CLIENT DETAILS** sub-tab now appears on every portal PO card (was hidden until D&B had entered
  packing details). When nothing's set it shows an empty-state line; the approve **notification** + button still
  only appear when there are details to approve.

## v25.61 - Supplier portal PO grid: Ship to country + branch columns

- Added **Ship to country** and **Ship to branch** columns to the supplier-portal PO grid, immediately after
  **Status**. The portal bootstrap PO query now returns `branch` + `country` (admin preview already had them).

## v25.62 - Direct to Client details: show client refs/notes + default packing to Yes

- The portal **DIRECT TO CLIENT DETAILS** tab now shows, above the packing table: **Direct to Client sales ref**,
  **Direct to Client PO number**, and **Direct to Client notes** (the PO's client requirements).
- **Migration 087:** Polybags, Dock & Bay Product barcodes and Dock & Bay Carton labels now **default to Yes**
  (new POs default true; existing untouched POs initialised to Yes). RFID + Client carton stay No by default.

## v25.63 - Direct to Client approval gated on production confirmation + re-approve on any change

- The **Approve Direct to Client details** workflow (button, notification, MANAGE action) now only applies when the
  PO's production is set to **require supplier confirmation** (`require_confirmation`). Other POs show the details
  read-only with "No supplier approval required for this production". (Fixes the every-PO notification noise.)
- Approval is now **re-requested when anything in the Direct to Client details changes** — not just packing/labelling
  but also the client **sales ref**, **PO number** and **notes** (editing any of these on the supply side clears the
  approval).
- Admin CLIENT/FBA + Direct to Client report reflect the gating ("Approval not required" / "—" when the production
  doesn't require confirmation).

## v25.64 - Performance: index purchase_orders.deposit_ref (PO grid ~45% faster)

- The supply-plan PO grid query (and the admin "Preview as supplier" path) had an un-indexed correlated
  subquery — deposit availability summed over `purchase_orders` by `deposit_ref`, a full seq scan per PO
  (O(n²)). **Migration 088** adds `po_deposit_ref_idx`; query execution dropped **711ms → 389ms** on the
  sandbox set (the seq scan became an index scan). The real supplier-portal PO query was already ~32ms.
- No app-code change — pure index. (The recent feature columns weren't the cause; this subquery was
  pre-existing and grows costlier with more POs.)

## v25.65 - Supplier portal: no full-screen refresh on PO actions; sub-tabs no longer wrap early

- The PO sub-tab bar (under MANAGE) no longer wraps early — the expanded card spans the full width.
- PO-card actions now **update in place** (silent DB write, no screen refresh): **Approve Direct to Client
  details**, **Confirm/withdraw order**, **production status**, **submit invoice**, and **create shipment &
  save**. Added `poActCount`/`refreshRow` helpers so the MANAGE action badge + sub-tab badges stay correct
  without a full reload.
- Analysis: the supply-plan grid already saves inline edits/selections silently (a green flash, no re-render);
  its only full rebuilds are structural create/delete (add/remove a row). Portal **Samples** actions and the
  shipment-plan **escalate** toggle still full-refresh — flagged as the next pass.

## v25.66 - Purchase Orders: "Exceptions Filters" dropdown (+ two new exceptions)

- The PO grid's "By type" exception pills are now a single coloured **Exceptions Filters** dropdown (red), each
  option showing its count — tidier than the row of pills.
- Two new exception filters: **Direct to Client not approved** (packing details set, production requires
  confirmation, supplier hasn't approved) and **Purchase Order not approved** (production requires confirmation,
  supplier hasn't confirmed the PO).

## v25.67 - Performance: lazy-render portal PO expanded cards

- The supplier-portal PO grid previously built every PO's full expanded card (all sub-tabs: timeline,
  order-plan SKU lines, invoice, shipment, barcodes, Direct to Client) **upfront** (up to 200) and rebuilt them
  on every filter/search. Now the card is built **only on first expand** (MANAGE) — matching the admin PLAN
  grid and the portal Samples grid. Big cut to initial render + filter/search responsiveness, especially for
  large suppliers. Regression test extended to assert the card is lazy.

## v25.68 - Performance: gzip API responses

- Large JSON API responses are now gzipped (built-in `zlib`, no new dependency). The PO grid payload drops
  from **3.68 MB → 187 KB (~19.6× smaller)** over the wire — big win on the deployed app where transfer
  dominates. Only applies when the client sends `Accept-Encoding: gzip` and the body is >1.4 KB; verified the
  decompressed payload is byte-identical.

## v25.69 - DEMAND ▸ KPIs ▸ Forecast accuracy (true accuracy, accrues from snapshots)

- Replaced the old "forecast vs run-rate" proxy with a proper **Forecast accuracy** view: **Bias / WMAPE /
  Attainment** KPI cards, **Country×Channel → Category → SKU** drill-down, **lag** selector (1/3/6-mo-ahead), and
  **CSV export**. Computes true accuracy = actuals vs the SKU forecast snapshotted *before* that month.
- New **forecast snapshot** mechanism: `POST /api/forecast/snapshot` captures the current SKU forecast
  (`forecast_outputs`) into a dated `forecast_runs`/`forecasts` snapshot. A **"📸 Take snapshot now"** button on
  the page triggers it manually (Diviyaj can add a monthly n8n trigger later).
- Because only forward-looking forecasts exist today, true accuracy starts at 0 matched and **accrues** as monthly
  snapshots build against actuals — the view shows an honest "accruing" banner plus a **Plan vs recent run-rate**
  panel (always available) so it's useful immediately.
- No migration (reuses existing `forecast_runs` / `forecasts` / `sales_actuals`).

## v25.70 - Portal: production-status syncs grid↔timeline in place; stale-JS fix

- Changing **production status** in the portal PO grid now **syncs the Timeline tab's selector** (and vice
  versa) in place, updates the MANAGE action badge, and refreshes the open card's ⚠ indicator — **no page
  refresh**. (Previously the two selectors were independent: the grid showed the new value, Timeline still
  showed blank.)
- **Stale-JS fix:** `/portal-view.js` is now served `Cache-Control: no-cache`. A cached old copy was making
  Confirm-order / production-status appear to do a full page reload (the old pre-v25.65 behaviour) even after
  the in-place fix shipped. Suppliers now always get the latest portal code.
- Regression test extended to assert grid↔timeline prod-status sync with no reload.

## v25.71 - Purchase Orders: "Exceptions Filters" label no longer hidden by the dropdown

- Wrapped the label + dropdown in a no-wrap group with a fixed gap so the **Exceptions Filters** label stays
  fully visible (the dropdown was overlapping the word "Filters" when the filter bar wrapped).

## v25.72 - Purchase Orders: highlight search box + "Late" excludes shipped/delivered

- The PO grid **search box** is now light blue (easier to spot).
- **"Late" exception** no longer flags POs that are already **SHIPPING** or **DELIVERED** — a past delivery date
  on an in-transit/arrived PO isn't an actionable late exception. Late now applies only to not-yet-shipped POs
  (FUTURE / PRODUCTION / READY TO SHIP) that are past their forecast delivery date.

## v25.73 - Purchase Orders: Exceptions Filters moved right + clearer "late" definitions

- The **Exceptions Filters** box now sits at the far right of the filter bar (left-aligned text) so the label is
  always fully visible.
- Renamed/redefined two exceptions:
  - **"Late - should be Completed"** — production completion date has passed but the PO is still in
    FUTURE/PRODUCTION (not yet ready-to-ship/shipped/delivered).
  - **"Late - should have Shipped"** — still in PRODUCTION and the ship date has passed.

## v25.74 - Purchase Orders: Exceptions Filters back in place, fixed-width dropdown

- Reverted the Exceptions Filters box to its original position (after NEEDS ERP). Root cause of the label being
  covered was the dropdown's `width:auto`; switched to a **fixed 220px width** (same pattern as the working
  Supplier/Production/Batch selects) so the label is never overlapped.

## v25.75 - Purchase Orders: rename "Exceptions Filters" label to "Exceptions"

- Shortened the PO filter label to **Exceptions**.

## v25.76 - Purchase Orders: active filter dropdowns highlighted black

- When a filter dropdown has a non-default value selected (Supplier, Production, Batch, Exceptions), it's now
  highlighted **black with white text** so active filters are obvious at a glance.

## v25.77 - Fix: pasted text into picker search boxes now matches (trim query)

- Pasting into the Assign-shipment / Deposit / cell picker search boxes returned no results when the pasted
  value carried a trailing newline/space (common from spreadsheets). The search query is now trimmed, so pasted
  refs match. (Applied to all six supply-grid picker searches.)

## v25.78 - Purchase Orders grid: "Direct" column; removed payment columns

- New **Direct** column after Branch (always shown) — Client name on line 1, Client order ref on line 2, in
  small text with tight line spacing (narrow). Replaces the old DIRECT-pill-only Client/Client-sales-ref columns.
- Removed the **Start dep / Completion (amount) / Balance** payment columns from the grid (still in the PLAN ▸
  Payments tab). Grid is less cluttered.

## v25.79 - Purchase Orders grid: highlight "set" on empty pick cells

- On empty Production / Batch (and Supplier / Branch) cells, the word **set** is now shown as a red bold pill
  (matching the deposit "assign" style) so unset fields stand out.

## v25.80 - Purchase Orders: active filter highlight now updates immediately on change

- Selecting a Supplier / Production / Batch / Exceptions value now turns the dropdown **black** straight away
  (and clears back on reset). Previously the highlight only applied after a full section reload because the
  change handler re-renders just the grid body, not the filter bar.

## v25.81 - Purchase Orders: empty pick cells say "assign" (was "set <field>")

- Empty Production / Batch / Supplier / Branch cells now show simply **assign** (red pill) instead of
  "set production" / "set batch" etc.

## v25.82 - Purchase Orders: all active filters highlight black

- **ACTION ITEMS**, **NEEDS ERP**, **Last 12m** and **Focus** now go **black with white text** when active (was
  red/amber/green). Consistent with the Supplier/Production/Batch/Exceptions dropdowns — black = filter applied.
  (Last 12m / Focus change also applies in the Shipments grid for consistency.)

## v25.83 - Fix: packing Yes/No selects on CLIENT/FBA now persist

- The PLAN detail panel is wired by `bindPay` (not `bindEdits`), which had no handler for the packing Yes/No
  `.boolsel` selects — so changing Polybags / barcodes / carton labels on the CLIENT/FBA tab didn't save. Added
  a save handler for them (POST + update in-memory row + recolor). The notes fields were unaffected (they save
  via the `.txtin` handler). Fixes both sandbox and live.

## v25.84 - Purchase Orders: light-blue action buttons

- **New PO**, **Upload POs**, **CSV for Fulfil** and **Sync Cin7 dates** are now light blue (were default/dark).

## v25.85 - Direct to Client approval scoped to actual direct-to-client orders

- The **Direct to Client** approval workflow (admin "Direct to Client not approved" exception, CLIENT/FBA
  approval status, Direct to Client report column, **and the portal "Direct to Client details" tab**) now only
  applies when **both**: the PO branch is Direct to Client (incl. UK B2B JLEW / NEXT) **and** a client sales ref
  (Sales Ref / Amazon Ref) is set. Otherwise the tab/exception don't show. Removes the mass of false
  "not approved" exceptions caused by packing defaulting to Yes on every PO. (Dropped the `require_confirmation`
  gate for DtC — the two branch/sales-ref conditions define it now.)

## v25.86 - Direct to Client approval: branch OR sales ref (was AND)

- DtC approval now applies when the branch is Direct-to-Client (incl. UK B2B JLEW/NEXT) **OR** a client sales
  ref is populated (previously required both).

## v25.87 - Portal: Direct to Client approve moved to top, Confirm-order style

- The **Approve Direct to Client details** action now sits at the **top** of the DtC tab in the same format as
  Confirm-order — green button in a yellow banner (turns green "✓ approved" once done), instead of a plain blue
  button at the bottom.

## v25.88 - Portal: Direct to Client details tab fits on screen

- The DtC tab was too wide (a global expand-row rule forced a 240px no-wrap first column, pushing the Yes/No
  responses off-screen). Scoped the tab to a compact max-width with wrapping cells, so Requirement / Required
  (Yes/No) / Notes all fit on one screen.

## v25.89 - Supplier portal PO grid: "Direct" column (client name + sales ref)

- Added a **Direct** column after Ship-to branch — client name on line 1, client sales ref on line 2, in small
  tight text (same as the supply-plan PO grid).

## v25.90 - Portal DtC tab: add "Direct to Client Name"

- Added **Direct to Client Name** (the client) above the sales ref on the portal Direct to Client details tab.

## v25.91 - Mobile (phone) — foundation pass

- Added the **viewport meta tag** (the app had none, so phones rendered a shrunk desktop) + first phone
  `@media (≤640px)` pass: app renders at device width, whole-page side-scroll stopped, top nav wraps, the supply
  sub-nav + wide grids scroll (grids keep horizontal scroll with a sticky key column), filter dropdowns stack
  full-width, bigger tap targets, Client/FBA form fields fit width. Foundation for the phone experience — card
  layouts for the key grids to follow (iterating with Ben on-device).

## v25.92 - Mobile UX: dropdown section nav, search-first, collapsible filters, swipeable sub-tabs

- **Section navigation** on phone is now a single **dropdown** (SECTIONS) instead of a long horizontal tab row —
  kept in sync with the desktop tabs; Samples unread count shows as "(n)".
- **Search is the hero control** on mobile — moved to the top, full-width and enlarged (the main mobile task is
  finding one PO / shipment / order-plan).
- **Secondary filters** (Ship-to/Supplier/Production/Batch + Action/ERP/Exceptions/Group) are hidden behind a
  **"⚙ Filters"** toggle on phone, so search + the grid aren't buried.
- **Sub-tab strips** (reports / productions / config / PLAN panel) swipe horizontally instead of wrapping.
- Desktop unchanged (tabs + inline filters as before).

**Consolidated go-live checklist: see `HANDOVER.md`.**

## v25.8 - Buy plan: discontinue-month rounding + no Buy-3PL past discontinue

- **Discontinue rounding (15th rule)** — the discontinue cutoff month now rounds to the nearest month: a disc
  date **after the 15th** → effective from the **1st of next month** (the disc month keeps its full forecast);
  **on/before the 15th** → from the **1st of the current month** (that month is dropped). New shared
  `discCutoffMo()` helper; replaces the old raw `disc.slice(0,7)` cutoff in both the cover calc and the buy calc.
  Fixes the case where e.g. a 31 Oct discontinue wrongly zeroed October demand.
- **No replenishment past discontinue** — a **Buy 3PL** (which always uses the full standard lead time) is now
  **suppressed if it would land in/after the effective discontinue month** — a standard-lead order can't be sold
  once the product is discontinued. A genuine near-term gap still surfaces in **Buy 3PL Urgent**.

Artifact-only (no server/migration). Verify against TOWLB-DES-XL-TANTIDE / UK.

## v25.7 - BI: carton-rounded rec quantities + Urgent Buy grouped by market

- **Whole-carton quantities** — Reallocate and Container Fill now round their move/add to **whole cartons,
  minimum 1 carton** (using each SKU's `sku_labels.carton_qty`, carried on the projection). Reallocate is still
  capped by what the donor can spare (skips if <1 carton fits); Container Fill is capped by what fits the spare
  pallets. SKUs with no carton size fall back to raw units.
- **Urgent Buy grouped by market** — the at-risk list is now grouped by destination (UK/US/EU/AU/CA) with a
  per-market count, and the **SKU column widened** so refs are fully visible.

No migration. (Phase 4 automation cancelled — recommendations are human-Apply only.)

## v25.6 - BI Phase 3: CONSOLIDATE recommendations

New **CONSOLIDATE** sub-tab (after Container Fill). `GET /api/supply/bi/consolidations` greedily bin-packs
**under-filled shipments (0 < pallets < 20) to the same market** whose departures fall within ~14 days and
whose combined load fits one 20-pallet (40ft) container, recommending a merge into the larger. Departure =
shipment date ▸ estimate (prod-end + 4 days). Cards show the pallets + combined load with **Merge / Snooze /
Dismiss** (reuses `supply_action_state`). `POST /api/supply/bi/apply-consolidate` re-points the smaller
shipment's POs onto the larger one and marks applied — one fewer container of freight. No migration. (Sparse
until shipment pallet loads / Flexport departures are richer; 5 opportunities in the current sandbox.)

This completes the recommendation trio — Reallocate · Container Fill · Consolidate — plus Metrics + Urgent Buy.

## v25.5 - BI cover targets ported from the buy plan + container-fill departure estimate

- **Real cover targets** — the BI projection now uses the **same per-SKU/category × warehouse cover targets as
  the buy plan** (`product_target_cover_override` ▸ `category_target_cover`, in weeks; 12wk default), instead of
  a flat 3-month assumption. Per country, the target is **demand-weighted** across its 3PL/FBA warehouses and
  converted weeks→months; it drives urgency, need-to-target, and the donor "spare" in Reallocate. Urgent Buy now
  shows each SKU's **Target (wk)**. So BI, Urgent Buy, Reallocate and Container Fill all match the buy plan's targets.
- **Container-fill departure estimate** (Ben's rule) — when a shipment has no departure date (Flexport not synced),
  departure is estimated as **production-end + 4 days**, so the rush check works; flagged "est. (prod end +4d)".

No migration.

## v25.4 - BI Phase 2: CONTAINER FILL recommendations

`GET /api/supply/bi/container-fill` finds shipments with **spare pallet capacity** (<20) and matches them to
**urgent/near-term buys** (critical/soon from the cover projection) for the **same destination**, made by a
supplier **already on that shipment** — so the stock rides for near-zero extra freight. Bounded by need
(no over-fill) and by spare pallets; **rush** flag when the supplier's lead time exceeds days-to-departure
(approximate until Flexport departure dates sync — currently blank in sandbox). Cards show add-qty, pallets
used, cover before→after, with **Add to PO / Snooze / Dismiss** (reuses `supply_action_state`).
`POST /api/supply/bi/apply-fill` adds the qty to the on-board PO (increases the supplier order — a real buy,
strong confirm) and marks applied. No migration.

## v25.3 - Merge BI into "BI & REPORTS" + Phase 1 REALLOCATE recommendations

**Merged** the standalone BI tab into REPORTS → renamed **"BI & REPORTS"** with sub-tabs in order:
**METRICS · REALLOCATE · URGENT BUY · CONTAINER FILL**, then the existing reports (What's Next, Pipeline,
Cash Flow, Direct to Client, Flexport). METRICS = the operational tiles; URGENT BUY = the stock-out-risk list
(now shows "buy to target" qty); CONTAINER FILL = placeholder. BI sub-tabs are **fluid** (re-fetched each
visit, never cached). Default sub-tab = METRICS.

**Phase 1 — REALLOCATE** (the zero-cost flow fix): `GET /api/supply/bi/reallocations` finds, within each
**editable production** (Future/Production), SKUs where one destination has **surplus** cover and another is
at **stock-out risk**, and recommends a **zero-sum** qty move (supplier total unchanged), capped by the donor's
line qty and keeping the donor at/above target. Cards show the move + cover before→after, with **Apply / Snooze
(1wk/1mo) / Dismiss** (reuses `supply_action_state` + a stable key, adds `applied`). `POST
/api/supply/bi/apply-reallocation` does the move transactionally (decrement donor line, upsert receiver line)
and marks it applied. Verified end-to-end (move + restore). No migration.

## v25.2 - Small UI fixes: What's-Next PO links + PO grouping dropdown + tighter bars

- **What's Next report** — PO references are now **blue hyperlinks** that open the **actual PO on its DATES
  tab** (was plain text; rows opened the PO grid generically). Applies to upcoming, overdue, and the
  expanded shipment-member rows.
- **Purchase Orders tab** — the **Group** control (None / Production / Master shipment) is now a **dropdown**
  instead of pills (stops it wrapping).
- **Tighter filter bars** — reduced inter-item spacing across all SUPPLY bars (8px → 5px) so pills/buttons
  sit closer while still spaced.

## v25.1 - SUPPLY ▸ BI Phase 0b: fluid cover & stock-out-risk engine

`GET /api/supply/bi/projection` computes, per **SKU × country**, the net position from **on-hand + inbound
vs 12-month forecast** (reuses `kpiBase()` so it matches the KPIs), giving **cover now**, **cover + inbound**,
an **urgency band** (critical / soon / ok / surplus — keyed off cover *including* inbound, so stock on the way
isn't falsely flagged) and a **need-to-target** qty. Surfaced in the BI tab under the metrics: an urgency
summary + a top stock-out-risk table (ranked by 12-month demand). Target = 3 mo default; exact per-SKU/
category/market targets get ported from the BUY artifact next. No migration. Foundation for Phase 1 Reallocate.

## v25.0 - SUPPLY ▸ BI tab (Phase 0a): Metrics Summary  ⬅ major milestone (was v20.405)

New **BI** tab in the SUPPLY nav (after Shipments) with a live **Metrics Summary** dashboard — open POs
(by status), units in production, active shipments, 40ft containers (shipping + in production, 20 pallets =
1×40ft), units inbound, value in production / in transit, POs awaiting confirmation, deposits outstanding
(scoped to deposits still drawn on by open POs). Server endpoint `GET /api/supply/bi` aggregates live from
`purchase_orders` + lines + `shipments` + `deposits`. No migration. Foundation for the recommendation modules
(Reallocate / Fill-the-container / Consolidate) — see `SUPPLY_BI_SPEC.md`. Version jumped to **v25.0** to mark
the BI build milestone.

## v20.405 - ERP badge colours per action

The PO-grid ERP badges now use distinct colours: **Update both** = purple, **Update lines** = blue,
**Update date** = amber (was all amber). "✓ in sync" stays green. CSS-only (existing badge classes).

## v20.404 - Fix: Cin7 "Create PO" was mis-filed as a sales order (missing supplier + branch link)

Creating a PO in Cin7 (Update/Create Cin7 PO) sent only free-text `company` — no `memberId` (supplier
contact) and no `branchId` — so Cin7 mis-filed it (PO-57AULX4 surfaced as a **sales order**, no branch).
Fix: the create now resolves the supplier's Cin7 contact id (`memberId`) and the `branchId` from the Cin7
Branches endpoint by exact name match, sets `stage:'New'`, and includes both in the payload. If either can't
be resolved it **errors without writing** (so a malformed order can't be created again). Resolved ids are
returned in the response. Read-only Cin7 lookups; the create stays gated/confirmed. UPDATE path unchanged.

Manual cleanup for the already-created bad order (PO-57AULX4): void Cin7 sales order **1760707**, and clear
the planner ERP-mirror row for PO-57AULX4 so the next push creates fresh.

## v20.403 - ★ Focus filter on Order Plan

Added a **★ Focus** pill to the SUPPLY ▸ Order Plan action-items bar. When on, the pivot shows only
**starred (Focus) POs that are still active / in progress** (completed are excluded) — it overrides the
status pills + PO box, same as the star Focus filter on the Purchase Orders and Shipments grids. The
order-plan line query now selects `starred` from the PO (no migration — column exists from 082).

## v20.402 - PO grid polish + slower search debounce + prod_no streamline migration

- **Focus star now visible** — the sticky first column was locked to 54px and clipped the star; widened to
  78px so the ☆/★ sits next to PLAN (slightly bolder idle colour too).
- **ERP column compacted** — the row buttons are now small badges (same look as "✓ in sync") with simple
  labels: **Update lines / Update date / Update both** (was the oversized "⚠ Update ERP" / "Date ≠ ERP").
- **Narrower filter dropdowns** — Supplier 180px (~25 chars), Production 62px (~4), Batch 94px (~8).
- **Search debounce 220ms → 350ms** on every grid search (PO, Shipments, Order Plan, Portal) — was correct
  but felt instant.
- **Migration `083_streamline_prod_no.sql`** (supersedes 081): strips the leading `P` from `prod_no` across
  `purchase_orders`, `deposits`, `production_deposits`, and backfills `prod_numbers.prod_no` from the Xero
  account code. Authored + dry-run validated (one manual item: the duplicate `P66`). **Not yet applied** — see
  HANDOVER. n8n Airtable source must be fixed too for the PO change to stick.

## v20.401 - ⭐ Focus / favourite star on Purchase Orders + Shipments

A small star icon next to the **PLAN** button on every PO and shipment row toggles a
**shared, persistent "favourite"** (DB-backed — shared across the team + all devices).
A new **★ Focus** filter pill (amber) shows **only starred items, active only** (completed
are hidden). The star persists via the existing PO / shipment patch endpoints.

**Requires migration `082_po_shipment_starred.sql`** (adds `starred boolean default false`
to `planner.purchase_orders` and `planner.shipments`). The server PO/shipments queries now
select `starred`, so **the grids error until 082 is applied.** Idempotent.

## v20.400 - Migration 081: consolidate production "P53" → "53"

**Migration only — no app code change.** `migrations/081_prod_no_p53_to_53.sql`.

Renames the `prod_no` key from `P53` to `53` in three tables so the config + deposit rollup match
the 140 POs that already use `53`: `prod_numbers`, `deposits`, `production_deposits`. Collision-guarded
(no `53` row exists today). Does **not** touch deposit reference strings, the Xero account-code label
(`620.33 P53`), or PO rows.

**Deposit/Xero impact: none** — deposit money links by `deposit_ref`, not `prod_no`; the Xero account-code
join is already P-insensitive. This change only fixes the exact-match links (requires-confirmation, CONFIG
PO counts, production-level deposit rollup).

**For Diviyaj (handle carefully on prod):**
- `purchase_orders.prod_no` is fed by the n8n Airtable→Supabase sync. Confirm whether Airtable still carries
  `P53` for any PO before/after applying — it could reappear on the next sync. Root-cause the source value.
- Run inside the migration's transaction; check the verification SELECTs before COMMIT.
- **Ben updates the 2 (~3) leftover `P53` POs manually** — they are not in this migration.
- Consider (future) making `prod_no` joins P-insensitive everywhere (like the Xero join) so `53`/`P53` are
  always treated as one production — that would remove this class of mismatch without data migrations.

## v20.399 - "Last 12m" toggle pills coloured forest green

The 📅 Last 12m toggle (Purchase Orders + Shipments grids) is now forest green — light green
when off, solid forest green (#166534) when on — so the default-on filter stands out from the
other pills. CSS-only.

## v20.398 - Production-status warning only when supplier confirmation is required

The "⚠ Past production start but status is not set" warning / action item now only fires for
POs whose production **requires supplier confirmation** (`prod_numbers.require_supplier_confirmation`).
If a production is set to NO in CONFIG ▸ Productions, the production-status nag no longer shows as:
- a DATES action item / red badge on the PO grid (admin),
- the ⚠ highlight on the PO ▸ PLAN ▸ DATES "Supplier production status" row (admin),
- the supplier-portal TIMELINE warning, or the "check status" flag + action count on the portal grid.

The production-status dropdown itself still shows everywhere — only the warning/action is gated.
No new env vars or migrations.

## v20.397 - Search ignores spaces and the "└" tree character

All filter/search boxes across SUPPLY (Purchase Orders, Shipments, Order Plan) and the
Supplier Portal now **normalise the query and the data**: lowercase, and strip spaces and
the `└` box-drawing character. So a PO shown as `└─ PO-53UKXR1` matches a search for
`PO-53UKXR1` or `53ukxr1`, regardless of spacing. Shared `nrm()` helper added to both
`inject.html` and `portal-view.js`; `filt()` and `effQ()` route through it. No new env vars
or migrations.

## v20.396 - Grid performance trio across SUPPLY + Supplier Portal

Applied three performance improvements to every grid on the SUPPLY plan and the supplier portal:
1. **"📅 Last 12m" default** on Completed items — Purchase Orders (by completion check-in date) and
   SUPPLY ▸ Shipments (by arrival/landing/departure). Toggle pill, on by default; off shows all-time.
2. **Render cap + "Show all"** — PO/Shipments grids cap at 250 rows, portal grids at 200; a "Show all N"
   button reveals the rest. Counts show "X of Y" when capped.
3. **Debounced search (220ms)** on all grid search boxes, with a **minimum 2 characters** and the
   universal **"PO"/"PO-" prefix ignored** (it would match every PO and filter nothing).

Shared helpers `debounce()` + `effQ()` added to `inject.html` and `portal-view.js`. No new env vars or
migrations. Pure client-side; no backend changes.

## v20.390 - Forecast CSV: MonthsStock + P + Country Category computed; Sync-Cin7 button restyled

- **MonthsStock** now computed = whole months of cover the current **3PL on-hand** (`product_inventory {co}_3pl`)
  gives against total monthly demand (DTC+FBA+B2B).
- **P-M1..12** now sourced from the **buy plan** (`buy_plan.order_quantity` by `order_month`, per country) — blank
  where there's no buy-plan row (the table is currently empty). **G** stays blank.
- **Country Category** = the country's **3PL label + category** (e.g. `UK ILG Bag - Beach`); 3PL map UK=ILG,
  US=Geneva, EU=iFulfillment, AU=Coghlans, CA=Propack (adjustable).
- **DriveHQ WebDAV upload tested live — HTTP 204, file received.**
- SUPPLY ▸ Purchase Orders: **Sync Cin7 dates** restyled to the black `CSV for Fulfil` format and moved to the
  right of it.

## v20.389 - Forecast export: real CSV format (Forecast Analysis layout) + real DriveHQ WebDAV upload

- **CSV now matches the "Forecast Analysis" layout** — 63 columns, two header rows (field codes `FC-M1…` + the
  actual month dates): `SKU, Country Category, MonthsStock, FC-M1..12 (DTC), P-M1..12, G-M1..12, FBA-M1..12,
  B2B-M1..12`. FC/FBA/B2B come from `forecast_outputs` (live). **P, G, MonthsStock kept in the format but left
  blank** for now (per "skip calculating, keep the columns"). Same format for every country; SKUs per that country.
- **DriveHQ upload is now a real WebDAV PUT** (HTTP PUT + Basic auth, fixed filename → overwrites), mirroring the
  Apps Script routine — no longer a stub. Verified the path reaches DriveHQ (HTTP 401 with the dummy creds).
- **Env vars changed to WebDAV:** `WEBDAV_BASE`, `DRIVEHQ_USER`, `DRIVEHQ_PASS`, `TARGET_FOLDER` (replacing the
  earlier `DRIVEHQ_FTP_*`); dummy values in `.env`, documented in `.env.example`.
- **Open:** `Country Category` is built as `{COUNTRY} {subcategory}` (e.g. "UK Bag - Beach"); the sample has a 3PL
  prefix ("UK ILGBag - Beach") — tell me if you want the per-country 3PL label. P / G / MonthsStock population TBC.

## v20.388 - Forecast export by country: settings UI (CONFIG ▸ Forecast export)

- New **CONFIG ▸ Forecast export** sub-tab: a per-country row (UK/US/EU/AU/CA) with an editable **email** (saved on
  change) + **⬇ CSV** / **✉ Email** / **⬆ DriveHQ** actions, plus **Email all countries** and **Upload all to
  DriveHQ** buttons. Result messages report sent/stub status per country.
- (Placed under SUPPLY ▸ CONFIG for now since that's where settings live — easy to move to a demand-side home if preferred.)

## v20.387 - Forecast export by country: server foundation (CSV · email · DriveHQ)

Wiring up the "forecast by country" export (UI to follow). Starting CSV format: **SKU, Month, DTC, FBA, B2B** —
one row per SKU × month for the next 12 months, from `planner.forecast_outputs` (the editable SKU plan; country =
warehouse prefix uk_/us_/eu_/au_/ca_).

- `GET /api/forecast/country-csv/:country` — downloads the per-country CSV (verified: UK = 4,139 rows).
- Migration **080**: `planner.forecast_export_settings` (per-country email address); `GET/POST
  /api/forecast/export-settings(/:country)` to read/save.
- `POST /api/forecast/email/:country` + `/email-all` — emails the CSV via Resend (gated on `RESEND_API_KEY`;
  honest stub reporting `would_send_to` when absent).
- `POST /api/forecast/drivehq/:country` + `/drivehq-all` — uploads to DriveHQ FTP (gated on `DRIVEHQ_*` env;
  **stubbed** — real FTP STOR pending live creds; reports `would_upload` host/dir/filename/bytes).
- Env: **`DRIVEHQ_FTP_HOST/USER/PASS/DIR`** added with **dummy** values (`.env`) + documented in `.env.example`.

**Pending your specifics:** exact CSV layout; confirm the source should be `forecast_outputs` (editable SKU plan)
vs the planner's displayed/computed numbers; where the settings UI + buttons should live; real DriveHQ FTP creds +
the email provider. Next increment: the settings UI (per-country email + Download/Email/Upload + all-countries buttons).

## v20.386 - Supplier portal: typed multi-document uploads (Phase 3)

- New **Documents** section on the portal **INVOICE** tab: the supplier picks a **type** (Commercial Invoice,
  Packing List, CI & PL, Transaction Certificate, Certificate of Origin, Photos, Other) and uploads a file; the
  list shows type · file · date with a remove action. Stored in `portal_attachments.category`.
- Server: `case 'portal-docs'` (list all supplier docs by PO, excludes Client/FBA) + `POST
  /api/supply/portal-attachment-remove`; `portal-upload` already accepted `category`. EP wiring added
  (`docRemove`, `attachmentBase`). Verified upload→list→remove round-trip.
- **Diviyaj (live portal):** add `/api/portal/docs` (list), `/api/portal/attachment-remove`,
  `/api/portal/parse-invoice`, `/api/portal/invoice-apply`; bootstrap should include `docsByPo` per PO; the
  portal `attachmentBase` is `/api/portal/attachment/`. (Phases 1–3 of the invoice-upload feature are now complete.)

## v20.385 - Supplier portal: upload invoice → preview → apply order-plan overrides (Phase 2)

- Supplier portal **ORDER PLAN** tab now has an **"Upload invoice / packing list (Excel)"** control: the supplier
  picks the file → **Parse** shows a preview (totals + only the changed/new lines, plan qty/price → invoice
  qty/price) → **Apply** writes the qty/cost as portal overrides (`portal_line_costs`), which the supplier then
  confirms and Dock & Bay approves (existing order-plan approval flow).
- New endpoint `POST /api/supply/portal-invoice-apply` — re-parses the file server-side (single source of truth)
  and writes only **changed + new** lines (new SKUs flagged `is_added`), in a transaction. Matching lines are left
  alone. Verified end-to-end: PO-56AUXR1 → applied 2 changed, 44 unchanged (sandbox restored after the test).
- EP wiring added to the admin preview; **Diviyaj:** add `/api/portal/parse-invoice` + `/api/portal/invoice-apply`
  for the live portal (same handlers, portal-auth scoped).

## v20.384 - Supplier invoice/packing .xlsx parser + order-plan preview (Phase 1 of invoice upload)

- **Pure-Node `.xlsx` parser** (no new dependency — unzips via Node `zlib` + reads the sheet XML). Scans the
  workbook for the invoice sheet (header row with SKU / Q’TY (PCS) / Unit Price) and extracts the PO number +
  `{sku, qty, price}` line items.
- New endpoint `POST /api/supply/portal-parse-invoice {po, data_base64}` → previews the parsed lines **against the
  PO's current order plan** (no DB write): each line tagged `match` / `changed` / `new`, plus totals
  (count, qty, value, matched/changed/new). Verified on a real supplier invoice (PO-56AUXR1 → 46 lines, $48,179.40,
  44 match / 2 changed).
- Phase 2 (apply parsed lines as portal order-plan overrides) and Phase 3 (typed multi-document uploads) follow.

## v20.383 - Successful Cin7 writes sync the local ERP mirror in real time

- After a successful Cin7 write, the local **ERP mirror is updated optimistically** so the drift flags clear
  immediately (instead of waiting for the next n8n sync — which later re-confirms):
  - **Update Cin7 Date** + **Sync Cin7 dates (bulk)** → set `erp_purchase_orders.final_delivery_date` to the pushed
    completion date (+ `synced_at`), so "⚠ Date ≠ ERP" clears.
  - **Update / Create Cin7 PO (lines)** → upsert `erp_purchase_order_lines` (qty, cost) to the pushed values and the
    delivery date, so the "Update ERP" line-drift clears.
- The UI **refetches** the Purchase Orders grid after a successful push so the flags visibly disappear in real time.
- Mirror writes are non-fatal (a mirror failure still reports the Cin7 write as succeeded). Responses include
  `erp_mirror_updated`.

## v20.382 - "+ New PO" / "Upload POs" match the save-btn button format (PO toolbar consistency)

## v20.381 - Bulk "Sync Cin7 dates" button on SUPPLY ▸ Purchase Orders

- New **📅 Sync Cin7 dates** button (PO toolbar) pushes the planner completion date to Cin7 `EstimatedDeliveryDate`
  for **every ACTIVE PO whose date differs from Cin7 in one go** — same condition as the per-row "⚠ Date ≠ ERP"
  button. Strong confirm showing the count before the live write.
- **Complete POs are excluded** (they don't register as ERP-date-different and are never pushed) — enforced
  **client-side** (`poComplete`) *and* re-validated **server-side** in the endpoint, so a complete PO can't be
  updated even if sent. In the current sandbox that's 138 active candidates vs **1,066 complete POs correctly skipped**.
- Each PO keeps its **current Cin7 approval status** (draft stays draft) — approval states are read in batches
  via `id IN (...)` (≈2 calls for 138 POs, rate-limit friendly) and echoed into a single batched PUT.
- New endpoint `POST /api/supply/cin7-dates-sync` (gated on Cin7 creds; safe 501 no-op when absent).

## v20.380 - Cin7 writes preserve the PO's approval status (no longer force draft → approved)

- **Bug fix:** "Update Cin7 Date" (and the lines push, on update) sent `isApproved: true`, which flipped a **draft**
  Cin7 PO to **approved**. Both now **read the PO's current `isApproved` first and echo it**, so a date / line
  update never changes the approval status. If the read fails, `isApproved` is omitted (Cin7 leaves it unchanged).
- The date endpoint's response includes `approval_preserved` (draft / approved / unchanged) for clarity.
- Verified the read query (`where=id=…&fields=id,isApproved`) returns the value (HTTP 200).
- **New Cin7 POs are created as DRAFT** (`isApproved:false`) so they're reviewed/approved by a person in Cin7,
  never auto-approved by the push.

## v20.379 - Cin7 auth accepts either a full header, a bare base64, or a username/key pair

- New `cin7Auth()` resolver used by both Cin7 endpoints. `CIN7_AUTH` may now be set as **either** the full
  `Basic <base64>` header **or** just the bare `<base64>` (the code adds the `Basic ` prefix). Alternatively set
  `CIN7_USERNAME` + `CIN7_KEY` and the code base64-encodes them. Still a safe 501 no-op when nothing is configured.
- `.env.example` documents all three forms.

## v20.378 - Pre-handoff review fixes (hardening, no behaviour change for valid input)

Code/DB review before the Diviyaj handoff. Findings addressed:

- **`portal-submit` is now transactional** (BEGIN/COMMIT/ROLLBACK on a single client). Previously the
  create-shipment → assign-PO → set-carrier → record-submission sequence ran as independent statements, so a
  mid-way DB error could leave a half-created shipment / orphaned PO.
- **Invalid `production_status` is now rejected with 400** (was silently dropped while returning success).
- **"Shipment escalated" and "Supplier created new shipment" actions** now require a **live (non-complete) PO**
  aboard the shipment — so they auto-clear once the order completes (and an escalated/created-but-completed
  shipment no longer lingers as an open action). Also fixed an alias ambiguity in the new WHERE clauses.
- **Removed dead code** — the old admin Shipment Plan view (`_unusedShipmentPlan`, removed from the UI in
  v20.365) still contained a broken `renderShipmentPlan()` reference; deleted the whole unused function.
- **HANDOVER.md** updated: added migration **079**, corrected the fresh-DB range to **062–079**, and expanded the
  live-portal bootstrap field list (`ship_carrier`, `ship_carrier_ref`, `production_status`, `prod_confirmed_age`,
  `flex_id`, `master_supplier`) + the live write paths Diviyaj must mirror (tracking create-and-assign +
  `supplier_created_at`; `production_status`).

Review also confirmed (no change needed): all migrations 062–079 are idempotent; every `/api/supply/*` endpoint
returns 200; no secrets/keys in committed code; no XSS gaps (all interpolated values pass through `esc()`); the
portal grid colspans reconcile; CTE alias references (`calc4`, `sh_carrier`) are correct.

## v20.377 - Portal production status: shorter dropdown + unset counts as a Timeline action

- The production-status dropdown (Timeline tab + grid) is now a **compact fixed-width** field (was auto-sizing to
  the long "— set status —" placeholder / option text).
- **Unset status now counts as an exception** in the portal (alongside the date-logic mismatch): it raises the
  **(1) counter on the TIMELINE sub-tab** (and the grid ⚠ + MANAGE count) so the supplier reviews/sets it.
  (Admin DATES stays logic-only — it doesn't flag every unset status.)

## v20.376 - Portal SHIPMENT tab: left-align the read-only carrier / tracking / Flexport ref values

- The read-only carrier / tracking ref / Flexport ref shown on a linked shipment are now explicitly **left-aligned**
  (the cells were picking up centred alignment from global table CSS).

## v20.375 - Supplier production status: removed nag action, surfaced as an editable field + logic exception

- **Removed** the time-based **"Production check-in"** action ("…confirm on track") — it nagged for a production
  status that had no UI to set. (The "Ship check-in" action is unchanged — see note.)
- **Supplier production status is now an editable field** (Not started / In production / Nearing completion /
  Complete / Shipped):
  - **Admin PO ▸ PLAN ▸ DATES** — a "Supplier production status" row (dropdown). Saves via the existing
    `/prod-status` endpoint (stamps the confirmation time).
  - **Supplier portal main grid** — a "Production status" column the supplier updates inline.
  - **Supplier portal TIMELINE tab** — the status dropdown sits at the top.
- **Logic-based exception** (instead of a time nag): flags a status that conflicts with the dates — e.g. *past
  production start but status is "not set"/"Not started"*, or *past production completion but not Complete/Shipped*.
  Shown in the DATES tab (counts toward its exception badge), the portal grid (⚠ + MANAGE count), and the portal
  TIMELINE tab badge.
- `portal-submit` now accepts `production_status`; the field is set directly (validated against the status list).

## v20.374 - "Supplier created new shipment" action, left-align carrier/tracking, rename timeline heading

- **New action: "Supplier created new shipment"** — when a supplier submits carrier/tracking on a PO with no
  shipment (creating one), it now raises an Action linking to that shipment in SUPPLY ▸ Shipments. Migration
  **079** adds `shipments.supplier_created_at` / `supplier_created_by`; the portal-submit create-path stamps them;
  the Actions query emits the action (dismissable via the normal action lifecycle).
- **Portal SHIPMENT sub-tab:** carrier dropdown + tracking ref are now **left-aligned**.
- **Shipment timeline:** renamed the compose heading **"Add a note" → "Add timeline note"** (admin SUPPLY ▸
  Shipments and the supplier portal). The multi-line note field is the notes input.

## v20.373 - Portal SHIPMENT read-only when linked, combined "Ships With" column, Shipment Plan tracking, cache fix

Supplier portal:
- **SHIPMENT sub-tab:** when a shipment is already linked, carrier / tracking / **Flexport ref are read-only**
  (managed centrally — the Flexport ref inherits from the shipment). The editable carrier+tracking form only
  shows when the PO has **no** shipment yet (where submitting still creates + assigns one).
- **Main grid:** merged Ships With + Ships With Supplier into **one "Ships With" column** (e.g.
  `PO-54UKXR1-FEB (XR Textile)`), placed **next to the Flexport** column. The **Flexport** column now **inherits
  from the linked shipment** (shows `flexport_reference` ▸ the shipment's matched Flexport id).
- **Shipment Plan:** the card now shows a **Tracking** value (the shipment's `carrier_ref`) — previously a
  DHL/other tracking code entered by the supplier wasn't displayed.

Admin:
- **Fix:** creating a shipment from the Config ▸ Portal preview now **invalidates the admin grids' cache**
  (`onChange` → `invalidateDerived`), so a portal-created shipment shows up immediately in SUPPLY ▸ Shipments
  (it was being hidden behind stale cached data — the endpoint already returned it correctly).

## v20.372 - Shipments: fix boot error (broke timeline posting), drop duplicate Notes field, add Delete shipment

- **Fix:** a boot error (`supb is not defined` in `ensureScenarioButton`, present since the v20.301 baseline)
  aborted part of the SUPPLY boot wiring — which is what stopped you adding timeline notes. Now resolved
  (binds the actual `supply-btn`).
- **Dates & tracking** tab: removed the small single-line **Notes** field — it's superseded by the multi-line
  note box in the **Timeline & notes** tab.
- **Timeline & notes** tab: added a **🗑 Delete this shipment** button (with confirm). It unassigns the POs
  aboard (the POs are kept) and removes the shipment + its timeline. New endpoint
  `POST /api/supply/shipment/:ref/delete`.

## v20.371 - Portal: carrier & tracking move to the SHIPMENT (creates the shipment if none) + Shipment Plan link

Supplier portal — PO ▸ PLAN ▸ SHIPMENT sub-tab:
- **Carrier & tracking now belong to the shipment, not the PO.** Carrier is the **same dropdown as SUPPLY ▸
  Shipments** (Flexport / DHL / Fedex / FOB / Other); tracking ref sits beside it. Both pre-fill from the
  assigned shipment's `carrier` / `carrier_ref`.
- **If the PO has no shipment yet,** submitting carrier/tracking **creates a master shipment** named after the PO,
  **assigns the PO to it**, and writes the carrier/tracking onto it (so it appears in the portal Shipment Plan).
- **If a shipment exists,** a **"View in Shipment Plan →"** link jumps to that shipment in the portal's
  Shipment Plan tab (pre-filters the search to it).
- Server: `portal-submit` tracking handler now create-and-assigns a shipment when none exists (was: staged a
  pending submission); the `purchase-orders` endpoint returns `ship_carrier` / `ship_carrier_ref` per PO.
- **Diviyaj:** the live portal's tracking write + bootstrap must mirror this — surface `ship_carrier` /
  `ship_carrier_ref` per PO, and have the portal tracking endpoint create+assign a master shipment (ref = PO,
  master_po = PO) when the PO has none.

## v20.370 - Timeline & Notes (note box on top, multi-line) + portal prominence + portal search overrides pills

Admin SUPPLY ▸ Shipments:
- The **Timeline** sub-tab is renamed **Timeline & notes**; the **note box moved to the top** and is now a
  **multi-line textarea** (resizable, 3 rows) so long notes are easy to write. Notes list below it.

Supplier portal:
- **Shipment Plan:** the note box is now **above the timeline** entries and is a multi-line textarea; the
  **shipment dates + Flexport** details are shown as a prominent labelled strip (Mode/Carrier, Flexport ↗,
  Departure, Landing, Arrival, Client, Client deadline) instead of small grey text.
- **Search overrides the filter pills** on both portal tabs: the **Purchase Orders** tab gains a
  **search PO / client** box that overrides the status pills, and the **Shipment Plan** PO search now overrides
  the Still-to-ship / Shipped / Escalated toggles (find it whatever its status).

## v20.369 - SUPPLY ▸ Shipments: Dates & Tracking sub-tab + timeline read/unread moved left

- New **Dates & tracking** sub-tab on the shipment expand (now the **first** tab, before POs aboard / Crossdock /
  Timeline). It holds the existing editable shipment details — carrier, carrier ref, status, departure / landing /
  arrival / completion dates, ship-to / branch, mode, freight + estimate, notes — which previously sat above the
  sub-nav.
- **Timeline:** the **Mark read / mark unread** control now sits on the **left** of each note (was far right of the
  screen).

## v20.368 - SUPPLY ▸ Shipments: timeline read/unread + counter, search overrides status, escalated action links

- **Timeline read/unread** on the Shipments grid (mirrors the PO timeline): supplier-authored timeline notes show
  as **"new"** until an internal user marks them read; an **unread counter** badge shows on the shipment's PLAN
  row, and the shipment-row Timeline tab gets **Mark read / mark unread** toggles. Migration **078** adds
  `shipment_notes.read_at`; new endpoint `POST /api/supply/shipment-note-read/:id`; the shipments grid query now
  returns `unread_notes` per shipment; `shipment-notes` returns a `read` flag.
- **Shipment / PO search now overrides the status filter** — typing in the Filter box finds a shipment whatever
  its status (Active/Completed/etc.), instead of being constrained by the active pill.
- **Escalated shipment action now hyperlinks to the shipment** — the "Shipment escalated" action's ref opens the
  Shipments grid on that shipment (was a dead `shipmentplan` target, which is portal-only).

## v20.367 - Per-production "require supplier confirmation" setting

- New per-production flag **`require_supplier_confirmation`** (migration **077**, on `planner.prod_numbers`,
  default **FALSE** — so all current productions start with the confirmation workflow OFF).
- Editable in **CONFIG ▸ Productions** as a **Require supplier confirmation** Yes/No column (new generic `bool`
  column type in the editable-table helper).
- When a production is set to **Yes**, the supplier-confirmation workflow turns on for its POs: the portal shows
  the "Please confirm this order" banner (in the TIMELINE tab) and an unconfirmed order raises an action
  (MANAGE + TIMELINE badge) and the admin **"Awaiting supplier confirmation"** action. When **No** (default),
  none of that shows.
- `purchase-orders` endpoint now returns `require_confirmation` per PO (derived from its production); the admin
  Actions query gates "Awaiting supplier confirmation" on the same flag.
- **Diviyaj:** run migration 077; the LIVE portal bootstrap must also surface `require_confirmation` per PO
  (same derivation: `prod_numbers.require_supplier_confirmation` by `prod_no`).

## v20.366 - Portal grid (Ships With), confirm→Timeline, Shipment Plan filters + escalation fixes

Supplier portal (`supply/portal-view.js`) + admin preview data (`supply/inject.html`):

- **Main grid:** removed the per-row barcode download buttons (⤓ PO / ⤓ prod / ⤓ Crossdock); added two
  columns **Ships With** (the shipment/master ref this PO ships under) and **Ships With Supplier** (the
  supplier who owns that master). Data added in `loadPortalData` (`p.ships_with` = shipment ref,
  `p.ships_with_supplier` = master-PO supplier).
- **SHIPMENT sub-tab:** now shows **Ships with supplier** under the shipment ref.
- **BARCODES & LABELS sub-tab:** added a **Download crossdock labels** button (only when the PO has crossdock
  SKUs) — reuses the existing crossdock-label handler (PO / dispatch order / client / delivery address overlaid).
- **PO confirmation** ("Please confirm this order") moved out of the top banner into the **TIMELINE** tab; an
  **unconfirmed order now counts as an open action** (badge on MANAGE + the TIMELINE tab).
- **Shipment Plan tab:** now only lists shipments where the **current supplier owns the master PO** (was: any
  PO aboard). New server field `master_supplier` on the shipment-plan payload. Added filters: **PO search box**,
  **Still to ship** / **Shipped** toggles (a shipment is "shipped" once its departure date has passed), and an
  **⚑ Escalated only** toggle.

Admin SUPPLY ▸ Shipments (`supply/inject.html`):

- **Fix:** an **escalated** shipment whose master PO is COMPLETE (e.g. PO-53AUXR1) was hidden by the default
  **Active** filter. The Active filter now always includes escalated shipments, so escalations surface
  regardless of status. (Escalation write itself was already correct.)

## v20.365 - Shipment Plan adjustments: admin tidy-up + timeline in expand + master in pallets

- Removed the admin **Shipment Plan sub-tab** (Shipment Plan is supplier-portal only) and the **escalate button**
  from the SUPPLY ▸ Shipments grid — the grid now shows a read-only **ESCALATED** badge in the column right
  after "Shipment (master)" (escalation is set in the portal); the Escalated filter stays.
- Added a **Timeline** tab inside the shipment-row expand, next to "POs aboard" and "Crossdock".
- Portal Shipment Plan: the **master PO is now included** in the "POs on this shipment" summary (marked ★) with
  a Total row, so the pallets sum to the true total.
- Fixed a bug where the shipment-plan / shipment-notes endpoints ignored their query params (wrong q helper) —
  was silently breaking the timeline load + master merge.

## v20.364 - Shipment Plan (admin sub-tab + portal tab) + shipment ESCALATED status

- **Shipment Plan** — master shipments and the POs aboard each, on both **SUPPLY ▸ Shipments ▸ Shipment Plan**
  (new sub-tab) and a new **SHIPMENT PLAN** tab in the supplier portal. Shows Shipment PO, ship method, carrier,
  Flexport ID + dates, master client + client deadline, and the other POs on the shipment (PO / supplier / est.
  pallets / client). Each shipment has a **timeline** (notes) editable from both surfaces (migration 075,
  `shipment_notes`; endpoints `/api/supply/shipment-plan`, `/shipment-notes`, `/shipment-note`).
- **ESCALATED status** — toggle on the supplier portal Shipment Plan and the SUPPLY ▸ Shipments grid (new
  column right after "Shipment (master)" + an Escalated filter). Stored on the shipment (migration 076,
  `shipments.escalated`); an escalated shipment raises a high-severity SUPPLY ▸ Actions item.

## v20.363 - "Client deadline at risk" action (completion after the client deadline)

PO-55EUBL1 had a client deadline (1 Jul) with completion forecast after it (6 Jul) but wasn't flagged. Added a
**high-severity SUPPLY ▸ Actions** item "Client deadline at risk" when a PO's forecast **completion** (effective
delivery + warehouse leg, mirroring the grid's Completion date) is after its **client deadline**. The
Direct-to-Client report now also flags the deadline red on completion (not just arrival).

## v20.362 - Supplier PO confirmation workflow + label-tab tidy-up

- **Supplier PO confirmation (#workflow):** suppliers confirm a PO (SKUs / quantities / dates) from the portal —
  a confirmation banner on the PO detail (✓ Confirm order / Withdraw). Stored on the PO (`supplier_confirmed_at`
  /`_by`, migration 074), shown in the admin Master Data tab (✓ confirmed · date / ⏳ awaiting, with Reset), and
  surfaced as a SUPPLY ▸ Actions item "Awaiting supplier confirmation" for in-progress POs.
- Removed the **Shipment** field from the Master Data PLAN tab (it lives on the Shipments tab).
- The Shipments tab's pallet-label button is now **Ships With Supplier labels** (the SHIPS-WITH master label);
  removed that button from the Client/FBA tab.

## v20.361 - Supplier portal: "Barcodes & Labels" tab

New per-PO portal tab consolidating downloads: (1) Barcodes for PO, (2) Barcodes for Production (always shown);
(3) Ship-To Pallet Labels — only when this PO ships under another supplier's PO (ship_other_supplier);
(4) Direct-to-Client / FBA attachments — only when there are client docs (category='client'). The preview
computes ship_other_supplier client-side from the PO data and fetches client attachments via a new
`client-attachments` endpoint. (Live portal /api/portal/bootstrap needs the same two fields wired by Diviyaj.)

## v20.360 - Master Data + Shipments moved into the PO PLAN panel (per-PO)

Corrected #2 / #10: MASTER DATA and SHIPMENTS are now tabs **inside a PO's PLAN panel** (alongside PAYMENTS /
DATES / CLIENT-FBA / ORDER PLAN / …), acting on that one PO — not section-level sub-tabs with a grid of all POs.
- MASTER DATA tab: edit this PO's PO Number (rename, cascades), Branch, Supplier, Production, Batch, Shipment +
  Delete this PO.
- SHIPMENTS tab: assign shipment / mark FOB, ASN numbers, iFulfillment pallet labels.
The PURCHASE ORDERS section is back to the single management grid (no section sub-tabs). Endpoints unchanged.

## v20.359 - Fix: Direct-to-Client report showed literal span markup for null values

The report wrapped the "—" fallback span inside esc() for the Sales ref / Dispatch order cells, so when those
were null it printed the escaped `<span ...>` HTML as visible text. Now renders a proper muted dash.

## v20.358 - Cin7 line push: create the PO in Cin7 if it doesn't exist yet

(#14b cont.) The "Update / Create Cin7 PO" button now **creates a new Cin7 PO** when the planner PO isn't in
Cin7 yet (no `erp_po_id`) — POSTs `{reference: PO, company: supplier, isApproved, estimatedDeliveryDate,
lineItems}`, captures the returned Cin7 id and mirrors it into `erp_purchase_orders` so future pushes update
instead of re-creating. When the PO already exists in Cin7 it updates as before. The result message says
"created" vs "updated". Still gated on CIN7_AUTH (safe no-op). ⚠ Confirm Cin7's create schema (esp. how the
supplier/company is identified) on a test PO before production use.

## v20.357 - "Update Cin7 SKUs / Qty / Price" button (push line items to Cin7)

(#14b) Second Cin7 button in the PO ▸ Update-ERP popup: pushes the PO's **line items** (SKU + qty + price) to
the Cin7 PO. **Price = the approved supplier final cost** (`portal_line_costs.final_cost` where confirmed),
**else the standard cost** (`cost_price`). New endpoint `POST /api/supply/po/:po/cin7-lines` (PUT lineItems as
`{code, qty, unitCost}`). Same gating as the date button (CIN7_AUTH, confirm, safe no-op). Reports how many
lines / how many at the approved price, with a link to the Cin7 PO. ⚠ Confirm Cin7 lineItems field names before
production use.

## v20.356 - "Update Cin7 Date" button (push Completion date to Cin7)

(#14) Added an **📅 Update Cin7 Date** button to the PO ▸ Update-ERP popup. It pushes the PO's **Completion
date** to the Cin7 PO's `EstimatedDeliveryDate` via `PUT /api/v1/PurchaseOrders?loadboms=0`
(`[{id, isApproved:true, estimatedDeliveryDate}]`), then shows "✓ Cin7 successfully updated" with a link to the
Cin7 PO. New endpoint `POST /api/supply/po/:po/cin7-date` resolves the Cin7 id from `erp_purchase_orders.erp_po_id`
and reads Basic-auth from the **`CIN7_AUTH`** env var. **Live write — gated**: confirms in the UI, and safely
no-ops (HTTP 501, no write) until `CIN7_AUTH` is set (Diviyaj). No secrets in git.

## v20.355 - Supplier portal: Shipment Labels when consolidated under another supplier

(#11) On the supplier portal (Config ▸ Portal preview) SHIPMENT tab, when a PO's assigned shipment is
consolidated under **another supplier's** master PO, a **⤓ Shipment Labels** button appears (server flag
`ship_other_supplier` on the portal data). It downloads the SHIPS-WITH label so the supplier can label their
cartons for the consolidation. NOTE: reused the existing SHIPS-WITH label as the "shipment label" — confirm the
exact artwork with Ben; live-portal routing of `/api/supply/ships-with` to be confirmed by Diviyaj.

## v20.354 - Reports: Direct to Client report

(#3) New **SUPPLY ▸ Reports ▸ Direct to Client** report — in-progress orders on the **Direct to Client**,
**UK B2B JLEW** or **UK B2B NEXT** branches, showing PO, supplier, client sales ref, dispatch order, client
deadline, likely arrival, shipment and crossdock refs (sorted by deadline). Deadline turns red when the order
is forecast to arrive after it (or it's already passed). The PO links to its Client/FBA tab. Reuses the
purchase-orders data (no new endpoint).

## v20.353 - Purchase Orders ▸ Shipments sub-tab (assign/FOB, ASN numbers, pallet labels)

(#10) New **Shipments** sub-tab listing in-progress POs: assign a shipment or mark FOB (reuses the picker +
MANUFACTURING-FOB rule), enter **ASN numbers** (comma-separated → `asn_numbers`, migration 073), and download
**iFulfillment pallet labels** (printable A4 sheet, one label per pallet with PO / supplier / shipment / ASN /
pallet n-of-N). NOTE: the exact pallet-label artwork for iFulfillment is a clean draft — confirm layout with Ben.

## v20.352 - Purchase Orders: sub-tabs + Master Data view (edit + delete)

(#2) PURCHASE ORDERS is now a sub-tabbed section: **Purchase Orders** (the existing grid) · **Master Data** ·
**Shipments** (built next). Master Data is an editable table — PO Number (rename, cascades to all lines/refs),
Branch, Supplier, Production, Batch ID, Shipment — plus a **Delete** button per PO (confirms, then removes the
PO and its lines / ERP mirror / attachments / submissions / notes in a transaction). New endpoints:
`POST /api/supply/po/:po/delete` and `/rename`.

## v20.351 - PO Client tab → Client/FBA: deadline date, attachments, Amazon ref label

(#12) Renamed the PO PLAN **CLIENT** tab to **CLIENT/FBA**; relabelled "Sales order ref" → "Sales Ref / Amazon
Ref"; added a **Client deadline date** field (`client_deadline_date`); and added **file attachments** (upload +
list) stored in `portal_attachments` with `category='client'`, kept separate from supplier invoice docs.
Migration 072.

## v20.350 - Payments: "Final payment due" override drives balance due + cash flow

(#9) Added a **Final payment due** date field on the PO PLAN ▸ Payments panel (under Final invoice amount),
saving to `balance_due_date_overide`. The calculated **balance due date** now prioritises it when set, else
falls back to the existing calc (ship/delivery + supplier credit days). Both the PO balance-due and the
**Cash Flow** report's due dates use it (both `bal_due_date` definitions updated). Editing it re-computes the
panel + invalidates the cash-flow cache.

## v20.349 - Shipments: >20-pallet exception

(#8) A shipment whose estimated cargo exceeds **20 pallets** (one container) now flags as an exception — red
"⚠ >20 pallets" badge, red Pallets cell, included in the Exceptions filter and the per-shipment exception
reason ("split the shipment"). The POs / Suppliers / Pallets columns already aggregate from the assigned POs.
NOTE for Diviyaj: pallet totals depend on `sku_labels.pallet_qty` (units per pallet), which is missing for
many SKUs — 164 shipments with POs currently show 0 pallets. n8n should populate pallet_qty for accurate
totals; the exception is correct wherever the data exists.

## v20.348 - Purchase Orders: in-place assign refresh, popup placement, MANUFACTURING=FOB

- (#6) Assigning a deposit / shipment / supplier / branch now refreshes the grid **in place** (re-fetch PO rows
  + re-render only #sup-grid) instead of reloading the whole section — keeps filters and scroll position.
- (#7) The deposit / shipment / cell picker popovers now **flip above** the anchor when they'd overflow the
  bottom of the screen (shared `placePop` helper), so a row near the bottom still gets a usable popup.
- (#13) A PO on the **MANUFACTURING** branch is FOB (collected at factory): its shipment cell shows "FOB" with
  no assign button, and the shipment picker is blocked. `isFOBdest` now treats MANUFACTURING as FOB too.

## v20.347 - Purchase Orders: status dropdown colours + descending PROD#/Batch filters

- Status dropdown now uses an explicit palette: FUTURE #D3D3FF, PRODUCTION #F2B949, READY TO SHIP #8FD9FB,
  SHIPPING #50C878, DELIVERED #2E8B57, COMPLETE #305CDE (with readable text colours).
- The Production and Batch filter dropdowns are now sorted descending (newest first).

## v20.346 - What's Next: don't flag completion/ship overdue once the PO is past that stage by status

The "What's Next" overdue check derived "production done / departed / arrived" only from `production_status`
(supplier-confirmed, frequently unset) and shipment dates — it ignored the PO's management `status`. So a PO in
**SHIPPING** with no `production_status` and no shipment departure date threw a false **"Completing overdue"**
(e.g. PO-55USJM1), even though SHIPPING is by definition past completion. Now the management status feeds the
done signals: SHIPPING / READY TO SHIP / DELIVERED ⇒ past completion (no "Completing"); SHIPPING / DELIVERED ⇒
departed (no "Shipping"); DELIVERED ⇒ arrived (no overdue). Cleared 47 false flags (46 SHIPPING + 1 DELIVERED);
genuine in-transit POs still flag "Arriving" correctly. Server-only; no DB change.

## v20.345 - Data fix: correct PO-55UKXR2 order-plan lines

PO-55UKXR2's order-plan lines were wrong — 96 lines, carrying 48 extra SKUs not on the actual Cin7 PO (the real
PO has 48 lines). Corrected against the Cin7 export of 26-06-2026; sandbox verified 96 → 48, matching the ERP
mirror exactly. **Migration `071_fix_po55ukxr2_lines.sql`** makes prod match regardless of current state
(upserts the 48 correct lines + deletes the rest; idempotent). The PO/ERP data-seed CSV
(`purchase_order_lines.csv`) was also corrected for fresh loads. No app code change.

## v20.344 - Order Plan: keep COMPLETE POs out of the pivot (fixes all-SKUs crash)

Including the 1000+ completed POs (from the ERP history load) in an all-SKUs / all-category pivot exploded it
to 1M+ cells and crashed the page. Now:
- COMPLETE is removed from the Status pills and the "All" toggle (pills: FUTURE / PRODUCTION / SHIPPING / …).
- Completed POs surface **only** via a PO search in the PO box, which requires **≥5 characters** to activate
  (a short entry no longer overrides the status filter). The PO-search override still shows any status incl.
  COMPLETE. Added a hint by the Status label.

## v20.343 - Surface supplier-risk + discontinued exceptions in SUPPLY ▸ Actions; Order Plan filter row

- The two new Order Plan exceptions now also appear in **SUPPLY ▸ Actions** (grouped per PO) until approved:
  "Supplier risk needs approval" and "Discontinued arrival needs approval", each with an "Open …" button that
  jumps to the Order Plan pre-filtered to that exception + PO. Mirrors the existing partial-carton action.
  (Discontinue uses the same per-destination date + arrive-date logic as the grid.)
- Order Plan: moved the four ⚠ action-item filters (Unapproved partials / Update ERP / Supplier risk /
  Discontinued) onto their own labelled "Action items" row, below the SKUs row.
- Fixed a regex bug where the discontinue check used `\d` inside a JS template literal (collapsed to `d`); now
  `[0-9]`. No DB change (uses migration 070).

## v20.342 - Order Plan: supplier-risk + discontinued exception flags (approve like partials)

Stage 2 of the Order Plan exceptions work. Two new per-cell exceptions, each approvable like a partial carton:
- **Supplier risk** (`s ⚠`) — the PO's supplier isn't in the SKU's allowed multi-supplier list
  (`products.supplier_multiple_all`).
- **Discontinued** (`d ⚠`) — the line's arrive (delivery) date is after the SKU's discontinue date, chosen
  per-destination (AU/CA specific, else final).
Both add a red approve button in the cell + a green tick once approved, two new filter pills with red counts
("⚠ Supplier risk", "⚠ Discontinued"), and persist via **migration 070** (`supplier_risk_approved`,
`discontinue_approved` on purchase_order_lines). The approve endpoint now takes a `field` param
(partial | supplier | discontinue). Requires migration 070.

## v20.341 - Order Plan: sticky attribute columns (Release / Carton / Supplier / Discontinue)

Stage 1 of the Order Plan exceptions work. Added four frozen label columns after SKU in the pivot — Release
window, Carton qty, Supplier (main_supplier_final) and Discontinue date — sticky on horizontal scroll with
cumulative left offsets. The `skus` endpoint now joins `planner.products` to carry supplier, carton_qty,
discontinue dates (final + AU/CA) and `supplier_multiple_all` (the latter two feed Stage 2's exception flags).
Supplier cell tooltip shows the allowed multi-supplier list. No DB change.

## v20.340 - Friendly headers on the Purchase Orders CSV (incl. Completion date)

The PO "CSV for Fulfil" export dumped raw field names as headers, so the grid's **Completion** date appeared as
the unlabelled `checkin` column. `csv()` now takes an optional header-label map; the PO export passes one that
renames the key columns to human labels — **Start date / End date / Ship date / Delivery date / Completion date**
(= warehouse check-in) — and distinguishes it from **Completion payment date** (the milestone). Other CSV
exports are unchanged.

## v20.339 - Don't flag ERP date drift on COMPLETE POs

A COMPLETE PO's dates are settled, so the "⚠ Date ≠ ERP" row badge and the ERP-recon date-drift count no longer
fire on it (`erp_date_pending` is now gated by a `poComplete` check). Matches the NEEDS-ERP filter, which
already excluded complete POs. Qty/cost ERP flags are unchanged.

## v20.338 - Purchase Orders: Production/Batch filters + clearer ACTION/ERP active state

- Added **Production** and **Batch** dropdown filters to the attribute bar (alongside Ship-to / Supplier),
  populated from the distinct `prod_no` / `batch_id` values across the visible POs. AND-combined with the
  other filters; reset to "All" clears them.
- The **ACTION ITEMS** and **NEEDS ERP** toggles had a hard-to-see inset shadow when selected. Now an active
  toggle gets a clear outer halo ring + a ✓ prefix, and the other toggle dims — so the selected filter is
  unmistakable. (They remain mutually exclusive.)

## v20.337 - PO Stock Priority: wider columns, filter pills, bolder Analyse, CSV encoding fix

Scenario ▸ PO Stock Priority polish:
- Fixed table layout with a colgroup so the **Recommendation** column gets the remaining width and **wraps**
  (was cropped by the `nowrap` scroll container).
- **Analyse** button is now bold blue (filled), to stand out from the sort/export pills.
- The **HIGH / MEDIUM / LOW / NOT REQUIRED** summary pills are now **clickable filters** — click to hide/show
  that priority in the list; hidden pills dim + strike through. CSV export follows the visible (filtered) set.
- **CSV encoding fix**: added a UTF-8 BOM + `charset=utf-8` and normalised em/en dashes + smart quotes to ASCII,
  so recommendations no longer show mojibake (e.g. "Partly needed ‚Äî …") in Excel/Sheets.

## v20.336 - Colour-code overdue date cells on Purchase Orders

The PO grid date columns now flag overdue milestones against the PO status:
- status = PRODUCTION and **End** date is past → End cell **light red**.
- status = PRODUCTION or SHIPPING and **Completion** date is past → Completion cell **red** (bold).
- status = FUTURE and **Start** date is past → Start cell **light red**.
Ship / Delivery cells are unchanged. Style-only (`dTd` helper + `datePast`).

## v20.335 - "no deposit" deposit cell shown in light grey

In SUPPLY ▸ Purchase Orders, the deposit column now renders the "no deposit" state (supplier start-deposit % = 0)
in muted grey, to visually distinguish it from "— assign" (a deposit is owed but not yet assigned) and from an
assigned deposit ref. Style-only (`.dep-pick.nodep`).

## v20.334 - Fix "n is not defined" when expanding a PO plan

Clicking PLAN on a PO whose start deposit is owed, unpaid, and has no deposit ref (e.g. PO-1700649) threw
`n is not defined`. The `payFillBtn` helper referenced `n()` (the `Number(v)||0` shorthand) which only exists
as a local inside `poExceptions`/`payPanel`, not in `payFillBtn`'s own scope — so the "pay »" quick-fill button
crashed the panel render the moment that branch was hit. Replaced with `Number(calc)`. No DB/schema change.

## v20.333 - ERP drift now reads the dedicated mirror table (not embedded columns)

The app sourced ERP qty/cost from embedded purchase_order_lines.erp_qty/erp_cost; it now reads them from the
dedicated **planner.erp_purchase_order_lines** mirror (v064) for ALL drift detection — PO grid "NEEDS ERP",
Order-Plan "Update ERP", and the Actions push items — plus the proposed-edit comparison. Migration 068
backfills the mirror from the embedded columns (behaviour unchanged on day one). The PO-lines CSV template is
now plan-only (erp_qty/erp_cost removed); ERP data loads via erp_purchase_order_lines.csv / n8n. Embedded
columns left in place but deprecated.

## v20.332 - Financial model per-quarter overrides + PO Stock Priority = production-only

- **Financial model:** growth %/price % overrides now sit IN EACH QUARTER CELL (little g/p inputs with
  tooltips), per sub-category × channel × country — not one value per row. Price % COMPOUNDS forward (a rise
  in a quarter carries into all later quarters; verified Q2 +10% lifts Q3 & Q4). Migration 067 adds a period
  key to the overlay. Removed the trailing Growth/Price columns.
- **PO Stock Priority:** PO picker restricted to **production** POs only (not shipped/complete); shows a
  count, and a clear "no SKU lines — add in Order Plan / import" message for empty POs (e.g. PO-56UKXR2).

## v20.331 - Financial model: sticky left-aligned label column

The Channel/Country/Sub-category label column in the financial model now stays left-aligned and frozen
(sticky) while scrolling the quarterly columns horizontally (an #scenario-root id rule was overriding the
exec-table sticky/left styling).

## v20.330 - Scenario: new "PO Stock Priority" tab

New SCENARIO tab. Pick a PO (search box) → per-SKU analysis of how much of the ordered quantity is actually
needed: stock on hand + OTHER inbound (this PO removed) vs forecast demand to the PO landing + cover window.
Flags each line HIGH / MEDIUM / LOW / NOT REQUIRED, shows required-from-PO + removable units + a recommendation,
sortable by priority or SKU, with full CSV export. New endpoint /api/scenario/po-stock-priority/:po. Cover
window default 13 weeks (server constant PO_STOCK_COVER_WEEKS, tunable); other inbound counted regardless of
ETA timing (v1). No migration.

## v20.329 - Financial model: full FY28 (Mar 27–Feb 28)

FY28 in the financial forecast model now runs the full year — Q4 extended to include Jan & Feb 2028 (was
Dec-only/partial). Quarterly columns scroll horizontally; header updated to "Mar 27–Feb 28".

## v20.328 - Financial model: sub-category breakdown + per-sub-cat growth/price overrides

SCENARIO ▸ Financial Forecast Model now drills channel → country → **sub-category**. Growth % and price-
increase % overrides live at the **sub-category × channel × country** level (was channel × country); country,
channel and total rows roll up from them. Price % lifts ASP across all forecast periods (a permanent uplift
inherited forward); growth % lifts units. Forecast months only; actuals untouched. Migration 066 extends the
overlay table with a subcategory key; buildExecData() now also returns a sub-category map.

## v20.327 - Upload to ERP popup: export revised order plan (Code/Qty)

The inert "Upload to ERP" popup (PO grid, Order Plan, Actions) now keeps its "does not update Fulfil/Cin7
yet" message but offers two manual-export options for the PO’s revised order plan: Download CSV and Copy to
clipboard, with headings Code (SKU) and Qty. Download = comma CSV; copy = tab-separated (pastes into columns).

## v20.326 - Order Plan: red action counts (unapproved partials + Update ERP filter)

The "⚠ Unapproved partials" pill now shows a red action count (open/non-complete partial-carton lines), and a
new "⚠ Update ERP" filter pill shows a red count of lines whose planned qty differs from the ERP and filters
the grid to them. Both exclude complete POs.

## v20.325 - Payments Report: supplier-kind filter

The Payments Report now only includes payments whose supplier has master kind = "supplier" — freight,
internal/transfer, and any payee not in the suppliers master are excluded (across PO completion/balance,
deposits and other payments).

## v20.324 - Payment summary copy → HTML table (Gmail-friendly)

The purple ⎘ "copy payment summary" button now writes a basic inline-styled HTML table to the clipboard
(text/html) alongside the TSV (text/plain fallback), so it pastes as a neat table into Gmail — and still
into Google Sheets as cells. Header shows Supplier / Payment amount / Payment reference; table columns
Reference, Amount, Type, Production ref, Deposit ref. The Xero ⧉ copy stays TSV.

## v20.323 - Deposits/Other Payments: FX action, unpaid filter, supplier dropdown, paid-delete lock

- Paid deposit with no Xero FX rate → new medium (amber) SUPPLY ▸ Actions item "Deposit FX missing".
- Other Payments now defaults to the **Unpaid** filter, and the status filters are inclusive: Unpaid =
  anything not paid (incl. overdue), Overdue = not paid & past due (fixes "nothing shows as unpaid").
- Other Payments **Supplier** is a search dropdown (datalist) populated from the suppliers master; typing a
  new supplier adds it to the suppliers table (server upsert on save).
- **Delete locked on paid items**: any deposit/other-payment with a payment date cannot be deleted — the
  delete link is hidden (shows a 🔒 locked note) and the server blocks it (like the deposit-in-use lock).

## v20.322 - Deposits table: intelligent column widths

Deposit register now uses fixed table layout with a colgroup: data columns get sensible fixed widths
(Reference/Supplier/PROD#/Xero/Amount/FX/Date/Remaining/Est. alloc/actions) and "Linked purchase orders"
absorbs the remaining width (≈670px on a wide screen) so PO lists have room to wrap. Inputs fill their cell.

## v20.321 - Deposits: Estimated allocation column + stranded-deposit action

New "Est. allocation" column (next to Remaining) = sum of the calculated start deposits (value × start%) of
the OPEN, not-yet-allocated POs on that deposit reference. Highlights: est allocation > remaining → est cell
red; open POs but est allocation = 0 while remaining > 0 → remaining cell red AND a SUPPLY ▸ Actions item
"Deposit remaining, none left to be allocated". Server: deposits payload returns est_alloc; actions query gains
the stranded-deposit branch.

## v20.320 - Deposits: uniform edit-on-click (rows read-only by default)

Every deposit row is now read-only by default with an Edit button — previously only paid/closed rows locked
while unpaid ones were always editable inline (inconsistent). Click Edit to unlock a single row (state holds
while editing), Save to relock. Closed rows still reopen first; a small "paid" badge marks paid+FX deposits.

## v20.319 - Deposits table layout: narrower Remaining, wider Linked POs, smaller PO text

Deposit register: "Remaining" column narrowed (~64px), "Linked purchase orders" column widened
(min 480px), and the PO reference links dropped 2px (11→9px) so long lists are more compact.

## v20.318 - Deposits table: PO links, no assign, wrapping, narrow date

- Removed the "assign" link from the deposit register (deposit↔PO link lives on the PO, not here).
- "Linked purchase orders" cell: each PO is now a clickable link that opens the PO in Purchase Orders on the
  PAYMENTS tab, and the cell wraps onto multiple lines for long lists.
- "Date paid" column narrowed to fit just the date entry box.

## v20.317 - Deposits: column shows linked PURCHASE ORDERS (not productions)

Correction to v20.316: the thing linked to a deposit is its purchase orders (po.deposit_ref), not productions.
The column (now "Linked purchase orders") lists the PO refs, defaulting to OPEN (non-complete) POs with the
"POs: open only / all" toggle. Server deposits payload returns pos_open (open POs); linked_pos is the full list.

## v20.316 - Deposits: assigned productions derived from POs (open-first + toggle)

The deposit register’s "Assigned production(s)" column was empty (it read the manual production_deposits
table). It now derives from the POs that reference the deposit (prod_no × supplier). By default it shows only
productions with OPEN (non-complete) POs; a "Productions: open only / all" toggle in the bar reveals the rest.
Server: deposits payload now returns prods_open + prods_all.

## v20.315 - Xero bill copy: keep DD/MM/YYYY as text in Google Sheets

The clipboard copy already emitted correctly zero-padded dates (25/06/2026), but Google Sheets re-parsed them
as dates and re-formatted to its locale (25/6/2026). The TSV copy now prefixes DD/MM/YYYY cells with a
leading apostrophe so Sheets keeps them as literal text. The downloaded CSV is unchanged (Xero needs the raw
date).

## v20.314 - Payments Report: keep pence (no integer rounding)

Bug: the `payments-report` query rounded every line amount to a whole number (`round(x)::int`), so e.g. a
deposit of **11,709.76** displayed/exported as **11,710.00**. The database was always correct — only the
report query was truncating. Now rounds to 2 dp (`round(x,2)`), run totals to 2 dp, and the Xero
description's USD label shows the exact figure. Affects display, Xero CSV (`*UnitAmount`/`*OriginalAmount`),
the summary copy and totals — all now to the penny.

## v20.313 - Payments Report: Production column, payment-summary copy, exact FX rounding

- **Production column** added to the expanded payment line table, after Type (also surfaces `deposit_ref`
  per line). Server: `payments-report` lines now carry `prod_no` + the PO's `deposit_ref`.
- **New payment-summary copy button** (purple ⎘) per run — copies, tab-separated for Google Sheets:
  (1) SUPPLIER, (2) payment amount (the live bank amount + ccy if entered, else USD total),
  (3) payment reference (`SUPPLIER-PAYMENT-…`), then the full line table (REFERENCE, AMOUNT, TYPE,
  PRODUCTION REF, DEPOSIT REF — all lines incl. "other"). Distinct from the Xero bill buttons (⬇/⧉).
- **Exact FX rounding** on the Xero bill: per-line converted amounts are rounded then the residual is
  pushed onto the largest line, so the exported total ties **exactly** to the converted target
  (no more 100,000.01).

## v20.312 - Xero bill fixes: live FX, rate from total, TSV copy

Fixes to the Payments Report Xero bill export (v20.310):
1. **Currency/conversion now apply without a page refresh.** The export reads the bank ccy + amount **live
   from the row inputs** at click time (previously it used the value loaded with the page, so a just-typed
   GBP/EUR amount was ignored until refresh — currency stayed USD and amounts unconverted).
2. **FX rate is derived from the full payment total (incl. "other" payments).** `rate = bankAmount /
   run.total`; the rate is applied to every exported line, then **"other" payments are dropped from the
   file** (they're billed separately). USD runs export at face value. `*OriginalAmount` always keeps USD.
   Export now includes deposit lines too (account code = the deposit's own `xero_account_code`, AU →
   `620.00 AU`); only "other" is excluded.
3. **Copy-to-clipboard is now TAB-separated** so it pastes into separate Google Sheets columns (the file
   download remains comma-CSV for Xero import).

## v20.311 - Delete deposits / other payments

New `POST /api/supply/deposit/:id/delete`:
- **Other payments** (`is_deposit=false`) delete freely.
- **Deposits** (`is_deposit=true`) delete only when **no purchase order is assigned** to the deposit's
  reference (server-enforced — returns 400 with a count if POs are assigned); any `production_deposits`
  assignment rows for the reference are cleaned up on delete.

UI:
- **Productions ▸ Other Payments** — a red **delete** link on every row (confirm prompt).
- **Productions ▸ Deposits** — a red **delete** link only on deposits with no POs assigned; deposits in use
  show a muted **🔒 in use** note instead (tooltip lists the assigned POs).

## v20.310 - Xero bill export from Payments Report + deposits Xero code

**Payments Report — per-run Xero bill CSV.** Each payment run gets two buttons (⬇ download, ⧉ copy to
clipboard; tooltip "Download Xero bill details"). The CSV is in Xero's bill-import format, one row per **PO
payment line** (completion/balance) in the run — deposits and other payments are excluded.
- `*ContactName` = supplier; `*InvoiceNumber` = `SUPPLIER-PAYMENT-<code>-<YYYY-MM-DD>` (`<code>` =
  `suppliers.code`, e.g. JM); `*InvoiceDate`/`*DueDate` = run date (DD/MM/YYYY); `Description` =
  `<PO> - <Type>`; `*Quantity` = 1; `*TaxType` = `No VAT`.
- **`*AccountCode`** resolves per PO: **AU delivery → `620.00 AU`** (always); else the **deposit** the PO is
  assigned to (`deposits.xero_account_code` by `deposit_ref`); else the **production** code
  (`prod_numbers.xero_account_code` by `prod_no`, `P`-prefix-insensitive).
- **Currency:** if the run was paid in a non-USD currency (bank amount + ccy entered on the run), `*UnitAmount`
  is converted at `rate = bankAmount / USD-total` (so the lines sum to the entered amount) while
  `*OriginalAmount` keeps the USD figure and `Description` appends `(<usd> USD)`. Otherwise USD throughout.
- The bank-amount input now displays with thousands separators (e.g. `100,000.00`).

**Deposits view** (`Productions ▸ Deposits`) now shows the **Xero code** column after PROD#, inline-editable
(saves `xero_account_code` via the existing deposit endpoint).

Server: `payments-report` now returns `account_code` + `supplier_code` per line. Client-only CSV build.

## v20.309 - Payments Due: reference hyperlinks

In SUPPLY ▸ Productions ▸ **Payments Due**, the Reference column is now clickable:
- **PO rows (Completion/Balance)** → open that PO in Purchase Orders with the plan expanded on the
  **PAYMENTS** tab (`gotoPO(po,'pay')`).
- **Deposit rows** → Productions ▸ Deposits filtered to that reference; **Other** → Other Payments.
Client-only change in `supply/inject.html` (reuses existing `gotoPO`/`gotoDeposit`/`gotoOther`).

## v20.308 - Payments Report defaults to last 60 days

The Payments Report now defaults its From date filter to **today − 60 days**, so it opens on recent
activity instead of the full history (the deposit register goes back to 2017, ~£30M of payments).
The From/To inputs and **Clear** button remain — Clear (or edit the dates) to see all history or any
window. Hint text updated. One-line default in `supply/inject.html` (`PAY_FROM`).

## v20.307 - Payments Report fully derived from source tables (no ledger duplication)

Restructures the Payments Report so every line is **derived from its source-of-truth table** instead of a
separate `payment_transactions` ledger that could drift. Replaces the v20.306 additive-union approach.

- **Report lines now derive from:** PO **Completion** + **Balance** milestones (`purchase_orders` pay_*),
  the **deposit register** (`deposits` is_deposit=true — the actual deposit cash payments, incl. negative
  credit-notes/write-offs), and **Other** payments (`deposits` is_deposit=false). Grouped by date+supplier
  as before; FX overlay still from `payment_fx`.
- **Starting deposits are EXCLUDED.** A PO's start-deposit milestone is a drawdown/allocation against a
  register deposit, not a separate cash payment — so it no longer appears in the report. (Fixes v20.306,
  which let no-deposit-ref start deposits through.) The register entry is the single representation of a
  deposit payment.
- **Stops reading `payment_transactions`** in the report. All completion/balance legs reproduce exactly
  from the plan (verified: 87/87 completion, 138/138 balance, £0 amount drift); deposits come from the
  register (the true ~£8M historical ledger back to 2017); Other from is_deposit=false. Removed the
  v20.306 "plan" badge.
- **Scope note:** the report now spans the full deposit history (the register goes back to 2017), newest
  first. The From/To date filter handles windowing. No default window imposed — say the word if you want
  one (e.g. default to last 12–18 months, clearable).

**Follow-on (NOT in this patch — needs Diviyaj + a migration):** the Payments **register** view and the
**Xero export** still read `payment_transactions`; repoint them to the derived lines, consolidate the two
FX overlays (`payment_fx` + `payment_run_meta`) into one per-run overlay (supplier, date, amount, currency),
then drop `payment_transactions`. See HANDOVER.md §6.

## v20.306 - Payments Report shows planner-recorded payments + payment-plan UX

Three changes. **No migration, no new env vars. The report change is read-only and additive — no
data is written, hidden, or replaced.**

1. **Payments Report now includes payments recorded in the planner.** Previously the report read only
   `payment_transactions` (the historical/bank-import ledger) + "Other" payments, so a PO-milestone
   payment recorded in the planner (PO plan panel / Payments Due) never appeared. The `payments-report`
   query now also reads PO-milestone payments straight from the plan fields
   (`pay_start_deposit_*`, `pay_completion_*`, `pay_balance_1_*`, `pay_balance_2_*`) where an amount + a
   payment date are set. **Additive/non-destructive:** a plan-derived line is shown only when the ledger
   has no row for that PO+milestone (so nothing double-counts and no existing ledger figure disappears);
   pooled start deposits (carrying a `deposit_ref`) are excluded as they pay via the register. Plan-derived
   lines carry a small **"plan"** badge to distinguish them from bank-confirmed ledger rows. When n8n later
   imports the real bank payment, the ledger row supersedes the plan line automatically.
   - *Follow-on for Diviyaj (NOT built):* the Payments **register**, FX reconciliation and **Xero export**
     still key off `payment_transactions`, so plan-recorded payments show in the *report* but don't yet
     flow to Xero. Making recording a payment write a `payment_transactions` row (so it flows end-to-end)
     is a deliberate next step that needs a migration + a decision on who owns that table in production
     (planner vs n8n). See HANDOVER.md §6.
2. **"Likely pay date" hides once a payment is recorded.** The likely-pay-date input (and the overdue
   highlight) on the PO Payments panel now key off whether a *payment date* has been recorded for that
   milestone (start also counts as paid when drawn from a deposit pool). Previously the balance row keyed
   off "is anything still owing overall," so the input lingered after payment.
3. **"pay »" quick-fill button.** On the PO Payments panel, when a milestone is owed + unpaid, a small
   `pay »` button next to the calc figure fills the Amount box with the calc amount **and** the Date paid
   with today, saves both, and refreshes the row — one click instead of two manual fields.

## v20.305 - Bugs/quick improvements: REPORTS toolbar, unpaid-payments filter, Payments Due view

Three UI changes — no migrations, no new env vars, no server data-shape changes.

1. **REPORTS toolbar removed.** The top-right AI toolbar (AI Insights / Save Forecasts, `#plan-tools`)
   now shows only on the DEMAND ▸ **planning** view. It previously also showed on REPORTS (`exec`),
   where it doesn't belong. Single-line change in `artifact_v16.7.html` `render()`.
2. **SUPPLY ▸ Purchase Orders — "⚠ Unpaid payments" filter pill.** Broader than the existing
   "Payment overdue" (which is date-past only): fires when a payment is *owed now* regardless of due date —
   either the supplier invoice total is confirmed and a balance is still owing, or a starting deposit is due
   (term deposit not assigned and not covered by a deposit pool). Excludes complete POs.
   Added to `PO_ACTCOND` + `ACTP` in `supply/inject.html` (client-side; reuses existing PO row fields).
3. **SUPPLY ▸ Productions ▸ "Payments Due" view.** New sub-tab: one worklist of every payment owed —
   PO completion + balance milestones (from the PO calc) and the deposit register + other payments —
   **grouped by supplier, ordered by due date**. Each row shows amount + due date with inline
   assigned-amount and payment-date fields, so payments can be seen *and recorded* in one place.
   **Excludes the per-PO starting deposit** (funded via the deposit register, which appears as "Deposit").
   Overdue rows (due date past, unpaid) highlighted red. Status/supplier filters. Fully client-side:
   reads `/api/supply/purchase-orders` + `/api/supply/deposits`, writes via the existing
   `/api/supply/po/:po` (pay_completion_assigned/date, pay_balance_1_amount/date) and
   `/api/supply/deposit/:id` (amount, date_paid) endpoints — no new server code.

## v20.304 - SUPPLY: credit_amount on POs + refreshed CSV import templates

- **New `purchase_orders.credit_amount`** (migration `063` + baseline `schema.sql`): a decimal credit /
  charge **added to the supplier invoice** that we must pay, **settled in the balance**. The PO calc now does
  `balance_owing = value + credit_amount − start_deposit − completion`; it flows into "total amount due" and
  the cash-flow balance line. Editable in **PO ▸ PLAN ▸ payment plan** (new **Credit amount** row); the
  Balance row shows "incl. £X credit". Added to the PO-edit allowlist. (Distinct from the supplier
  `credit_fee` financing %.)
- **CSV import templates refreshed** for fields added since they were first made:
  - `purchase_orders.csv` → + `client, client_po_ref, sales_order_ref, dispatch_order_ref,
    final_delivery_address, client_requirements, crossdock_skus, batch_date, supplier_ship_date,
    credit_fee_assigned, credit_amount`.
  - `purchase_order_lines.csv` → + `erp_cost`.
  - `README.md` column docs updated.
- **Diviyaj:** run migration `063_po_credit_amount.sql` on prod; use the refreshed templates in
  `supply_import_templates/` for the migration.
- Files: `server.mjs`, `supply/inject.html`, `migrations/063_po_credit_amount.sql`, `migrations/schema.sql`,
  `supply_import_templates/*`. Verified: setting a credit raised the balance by exactly that amount.

## v20.303 - Consolidate toolbar into nav: Weather→Actions▸Weather, Alerts→Actions, remove BI Suggestions

- **Weather** moved out of the top toolbar into **DEMAND ▸ Actions ▸ Weather** (was a stub). Renders the
  Open-Meteo outlook inline (market tabs UK/US/EU/AU + `#weather-body` via the kept `renderWeatherPanel`,
  `loadWeatherForMarket`, `fetchWeatherCacheViaMCP`). **Prod needs the Airtable MCP connector + the
  `weather_cache` table populated** (fetchWeatherCache.gs); without it the tab shows a "data not loaded" card.
  Removed the standalone `#weather-panel` + `weather-btn`.
- **Alerts** (data-integrity anomalies: negative values, zero gaps, frozen values, extreme spikes) merged
  into **Actions ▸ Actions** as cards via a new `daAlerts()` detector (reuses `scanAnomalyAlerts`); resolve
  via Done/Snooze/Dismiss like any action. Removed the standalone `#alerts-panel` + `alerts-btn`.
  ⚠ On the sandbox this surfaces **~111 alerts** (mostly medium "extreme spike") — see note below.
- **BI Suggestions removed completely**: `bi-btn` + badge, `#bi-panel`, and the panel functions
  (`renderBIPanel`/`openBIPanel`/`loadBIState`/`saveBIState`/`addBIRuleToAirtable` + the bi-rescan/.bi-tab
  bindings + the weather panel's "Add as BI rule" button). **Kept `scanBIPatterns`** — it's reused by the
  Actions ▸ Anomalies-to-review detector. `refreshToolbarBadges` left in place (null-guarded; harmless).
- Toolbar is now **AI Insights · Refresh · Save Forecasts · Help**.
- Verified: no JS errors at load, Plan grid renders, toolbar trimmed, alerts/weather relocated.
- Files: `artifact_v16.7.html`. No schema/env changes.

> **Note on alerts volume:** all alerts merge in (faithful to "merge ALERTS"), severity-sorted (high first)
> and filterable/dismissable. If 111 is too noisy, capping `daAlerts()` to high-severity (the genuine
> data-integrity issues) is a one-line change — say the word.

## v20.302 - Fix: restore the DEMAND AI-tools toolbar (regression — Save Forecasts was unreachable)

- The nav rework had relocated the AI-tools toolbar (`#plan-tools`: **AI Insights, Suggestions, Alerts,
  Weather, Refresh, Save Forecasts**) + **Help** into the DEMAND sub-nav row. But `renderDemandTabs`
  rebuilds that row with `innerHTML = …` on every render, which **destroyed** the relocated toolbar after
  the first re-render (the post-load CAL_EVENTS render) — so the whole toolbar, **including Save
  Forecasts**, vanished from the DOM.
- Fix: **park `#plan-tools`/`#help-btn` back to the main tab row before the innerHTML wipe, then
  re-append** — the same park/restore already protecting the status note/version. The toolbar now
  survives re-renders and tab switches (verified 7/7 buttons after the re-render and a tab round-trip).
- This is **Phase 1** (regression fix). Phase 2 (roll the toolbar into the navigation: Weather →
  Actions ▸ Weather using the existing Open-Meteo / Airtable `weather_cache` source; Alerts + BI
  Suggestions → Actions/Insights; Save/Refresh/Help as persistent nav buttons) is still to scope.
- Files: `artifact_v16.7.html`. No schema/env changes.

## v20.301 - DEMAND: version + "last updated" note on the nav-2 row (all pages)

- The **last-updated/version** label (`#ver` — "Data extract last updated … vX") now sits on the
  DEMAND nav-2 row, right-aligned, alongside the existing "Inputs loaded live…" note (`#st`) — on
  **all** DEMAND pages (Plan/Targets/Actions/Calendar). Both nodes are parked/restored around the
  nav rebuild (same pattern as the AI tools) and survive navigating away and back.
- `#statusbar` (the old separate status line under the filters) is now hidden throughout DEMAND since
  its contents live on nav-2; restored when leaving DEMAND. Removed the per-view show/hide added in v20.300.
- Files: `artifact_v16.7.html`. No schema/env changes.

## v20.300 - DEMAND nav-3 matches SUPPLY (full-width, tight) + SUPPLY Actions Type filter

- **DEMAND level-3 nav** now matches SUPPLY's `#config-subs`/`#rep-subnav` exactly: `.d3nav` is
  full-width (`display:flex`, was `inline-flex`) with a tight top margin. Applies to Targets ▸
  (Sell Through Scorecard / Set targets) and Actions ▸ (Actions / Insights / Weather).
  - Targets: removed the "Sell-through & cover" heading; renamed **Scorecard → Sell Through Scorecard**.
  - Tightened the nav2→nav3 whitespace by hiding the `#statusbar` ("Data extract…" line) on DEMAND
    sub-views (still shown on Plan, above the grid).
- **SUPPLY ▸ Actions**: restored the action **Type** filter as a **multi-select dropdown** (default
  "All types"). Checklist of every action type; composes with the existing Status + Severity filters.
- Files: `artifact_v16.7.html`, `supply/inject.html`. No schema/env changes.

## v20.299 - SUPPLY ▸ Purchase Orders grid: column reorder + ERP cell tidy

- **Column order**: ERP moved to position 3 (right after the sticky PO column); Shipment moved to right
  after Status; Deposit ref now follows Shipment. (Header + body rows reordered together; sticky
  PLAN/PO columns and the 21-col expand-row colspan unchanged.)
- **ERP cell**: the **⚠ Update ERP** button is softer (amber `#d97706`, was bright red `#dc2626`) and
  smaller (`font-size:10px;padding:2px 7px`); the **✗ not in ERP** and **⚠ Date ≠ ERP** buttons match
  the smaller size.
- **"✓ in sync" now only shows when nothing is off** — it is never rendered alongside a drift button.
  A date-only mismatch shows just **⚠ Date ≠ ERP** (no "in sync"); qty + date show both buttons.
- **Removed the ERP-id text** (e.g. "FF-10001") that trailed the badge — it was clutter from the
  `erp_po_id`/`erp_po` field; dropped from the cell.
- Files: `supply/inject.html`. No schema/env changes.

## v20.298 - DEMAND ▸ Calendar: typable search-list pickers for Category + SKU list

- Replaced the Calendar's plain Category input (native `<datalist>`) and free-text SKU-list input with
  **type-to-search popups** modelled on the SUPPLY supplier picker (`.cal-pick` + floating `.calpop`
  searchable list).
  - **Category** — single-select: button shows the current value; click → searchable list of `ALL` +
    the category list; pick saves `category`.
  - **SKU list** — multi-add **chips**: each SKU is a removable chip (✕); **+ SKU** opens a type-to-search
    over the SKU master (matches code *or* product name, from `SKUM`); picking appends; the field stays a
    comma-separated `sku_list`. Already-added SKUs are filtered out of the picker.
  - Saves on every pick/remove via the existing `/api/trading-calendar/:id` POST; verified add, remove,
    category change all persist. CSV up/download unchanged (still a comma list).
- Files: `artifact_v16.7.html`. No schema/env changes.
- Note: weather table check — there is **no weather table** in the sandbox DB (only `planner` + Supabase
  system schemas; no `public`/`china`). The WEATHER tab still needs its source located (likely prod or a
  separate project). See HANDOVER / memory.

## v20.297 - DEMAND: status note moved to nav-2 (right-aligned) + light-blue level-3 nav

- Moved the **"Inputs loaded live from Supabase (forecast_inputs)"** note (`#st`) up onto the DEMAND
  sub-nav row (nav-2), **right-aligned** — mirroring SUPPLY's right-aligned version label. The status
  bar below now carries only the data-extract/version line (`#ver`). `#st` is parked back into its
  `#statusbar` whenever the sub-nav is rebuilt or torn down (the same park/restore the AI tools use),
  so the live `st()` updates and other views are unaffected; `st()` is null-guarded.
- **Level-3 navs now use SUPPLY's light-blue style** (new `.d3nav` container + `.d3tab` tabs, mirroring
  SUPPLY's `#rep-subnav`/`.rtab`: `#f0f6ff` bg, `#dbeafe` border, blue-active). Applied to Targets ▸
  **Scorecard / Set targets** (was `.dsub`) and Actions ▸ **Actions / Insights / Weather** (was the grey
  `.dnav` strip). This gives the clean 3-level hierarchy: dark top (1) → grey uppercase strip (2) →
  light-blue pill bar (3), matching SUPPLY.
- Files: `artifact_v16.7.html`. No schema/env changes.

## v20.296 - DEMAND sub-nav now matches SUPPLY exactly (uppercase strip)

- The earlier v20.287 `.dnav` restyle used slate Title-case (matching REPORTS' `.view-toggle`), which
  still didn't read like SUPPLY's section nav. Aligned `.dnav` to SUPPLY's `.stab` precisely:
  **UPPERCASE** labels (`text-transform`), grey `#888` → black `#1a1a1a` active + underline, weight
  500/600, padding `6px 13px`. Also matched the `#demand-tabs` container to `#supply-subnav`
  (`gap:2px`, border `#e0e0e0`, dropped the extra `padding-bottom`).
- Applies to the DEMAND top sub-nav (PLAN/TARGETS/ACTIONS/CALENDAR) and the level-3 ACTIONS ▸
  ACTIONS/INSIGHTS/WEATHER nav (same class). The in-content `.dsub` toggles are unchanged.
- Files: `artifact_v16.7.html`. No schema/env changes.

## v20.295 - Docs: consolidated Diviyaj handover-to-live document

- Added **`HANDOVER.md`** — a single running checklist of everything outstanding to take the build to
  production (DB migrations, env vars, n8n inbound/outbound pipelines, data prerequisites, infra),
  consolidating the per-version "Deploy (Diviyaj)" notes that were scattered through this log. The ERP
  misalignment + inert-upload notes (v20.293–v20.294) are included front-and-centre under §3.
- Docs only — no app/schema/env changes.


## v20.294 - SUPPLY: ERP date-misalignment (completion vs ERP final delivery) + inert upload

- **New ERP mirror table** `planner.erp_purchase_orders` (migration `062_*.sql`): `po`, `erp_po_id`,
  `final_delivery_date`, `status`, `raw jsonb`, `synced_at`. Populated by n8n from Fulfil/Cin7
  (header-level). No FK so the sync isn't blocked by missing planner POs. **Diviyaj: run 062 on prod.**
- **Date misalignment detection**: the PO calc now LEFT JOINs the mirror and exposes `erp_final_delivery`,
  `erp_po_id`, `erp_present`, and `erp_date_pending` (= our calculated *completed-at-warehouse* date
  `eff_checkin` differs from the ERP `final_delivery_date`).
- **PO tab UI**: the **⬆ NEEDS ERP** filter now also catches date drift (`poErpMisaligned` ORs in
  `erp_date_pending`); each row shows a **⚠ Date ≠ ERP** badge (tooltip: our date vs ERP date); the ERP
  recon summary adds a "N ⚠ date ≠ ERP" count. Together these are the on-tab notification.
- **Upload is now inert** (awaiting Diviyaj's n8n webhook): every upload affordance — the PO-grid ERP
  buttons, the Order-Plan ⬆ Upload, and the SUPPLY ▸ Actions ⬆ Upload to ERP — now shows
  *"Upload feature not yet banked. To be integrated to Fulfil or Cin7."* and does **nothing else**.
  Critically it no longer fake-marks lines/dates as synced, so misalignment stays visible until a real
  ERP sync-back. (The `/api/supply/po/:po/upload` endpoint is left in place for when n8n is wired.)
- **Deferred (flagged, not silently skipped)**: a matching date card in the SUPPLY ▸ Actions list. It
  needs the multi-step completion-date calc, which currently only lives in the PO query; duplicating it
  into the Actions SQL risks the two diverging. Best added once that calc is shared (or once n8n lets us
  compare stored dates). The PO-tab filter/badge/recon is the date notification for now.
- Files: `server.mjs` (PO query join + fields), `supply/inject.html` (filter/badge/recon + inert upload),
  `migrations/062_erp_purchase_orders.sql`. Sandbox table created + 2 test rows seeded for validation
  (Ben can clear `planner.erp_purchase_orders` test rows any time).

## v20.293 - SUPPLY ▸ Purchase Orders: "NEEDS ERP" misalignment filter

- Added a **⬆ NEEDS ERP (N)** filter pill to the Purchase Orders action bar — isolates POs misaligned
  with Fulfil/Cin7: either **never pushed** (lines exist but none mirrored from ERP → upload the whole PO)
  or with **pending qty/cost changes** (planned ≠ `erp_qty`/`erp_cost` → update). Excludes complete POs.
  `poErpMisaligned(r) = erp_total>0 && progress!=='complete' && (erp_in==0 || erp_pending>0)`.
  - Spans all statuses (like ACTION ITEMS) and is mutually exclusive with it; ANDs with the
    country/supplier/type pills. The count on the pill doubles as the on-tab notification.
- No new write path: the existing per-row **✗ not in ERP / ⚠ Update ERP** buttons and the Order-Plan
  **Upload** already create-or-update via `/api/supply/po/:po/upload`, which stages to `etl_runs`
  (`status='pending'`) for n8n to push — no direct Fulfil/Cin7 write from the app. SUPPLY ▸ Actions
  continues to raise the matching "PO not in ERP" / "Order-plan change pending ERP push" cards.
- Files: `supply/inject.html` (read-only filter over existing PO list data). No schema/env changes.

## v20.292 - ACTIONS: A-player stock-out detector (completes the Actions revamp)

- New **A-player stock-out** detector (`daAplayer`, flag `DA_DETECTORS.aplayer`) under DEMAND ▸
  Actions ▸ **Actions**. Flags a **Tier-A SKU × market** that is both:
  1. running out of 3PL cover — `compute3plWeeksRemaining(sku,co) < 20wk` (the buy plan's OWN cover
     walk: on-hand + on-order consumed against the SKU's monthly demand — fully reconciled), and
  2. **selling above forecast** — trailing-3-complete-month run-rate (real SKU actuals, DTC+B2B via
     `skuSales`) annualised > the buy-plan SKU forecast (`compute3plMonthlyDemand`, fwd 12mo) × 1.10.
  - `£ = min(annualisedRR − forecast, forecast) × subcat ASP` (under-forecast units/yr, capped at 100%).
    Severity ≥£50k high / ≥£10k amber / else info. RR floor 20/mo to ignore tiny SKUs.
  - **Open in Plan ↗** jumps to DEMAND ▸ Plan, sets country + DTC channel, and scrolls to / flashes the
    SKU's sub-category row. (The buy-plan SKU popover only exists in the BUY view — `#ov` isn't in the
    DOM under DEMAND — so the jump lands on the plan grid row, consistent with the anomaly jump.)
  - On live data: 3 precise hits (Picnic Blanket ×2 + Towel-Home, all US, 12–14wk cover, +31–163% over
    forecast). Note: the estate is well-stocked (min A-tier cover 12wk, median ~52), but 143 A-player×market
    combos run above forecast — the <20wk bar isolates the genuinely at-risk ones. COVER_WK/OVER are tunable.
- This completes the DEMAND ▸ Actions revamp: ACTIONS (sell-through, events, anomalies, A-player) ·
  INSIGHTS (trading-vs-LY, forecast-vs-trend) · WEATHER (stub).
- Files: `artifact_v16.7.html`. No schema/env changes.

## v20.291 - ACTIONS: Anomalies-to-review detector + structured Open-in-Plan jump

- New **Anomalies to review** detector (`daAnomalies`, flag `DA_DETECTORS.anomalies`) under DEMAND ▸
  Actions ▸ **Actions**. Reuses the existing `scanBIPatterns()` one-off spike/dip engine, filtered to
  the **last ~12 months** (recent = actionable). Dips (possible stockout / lost sales) → amber; spikes
  (promo / one-off to sanity-check) → info. No £ (review items). Resolve via Done + Open in Plan ↗.
- Generalised **`daJumpToPlan`**: a SKU string still pops the SKU panel; an object `{sub,co,ch}` now
  switches to Plan, sets the country/channel, clears the category filter, and scrolls to + flashes the
  matching `data-rowkey` row. Cards render the jump link from either `sku` or a `jump` payload.
- Card list now re-sorts after merging server + client items (severity then £) — fixes high-severity
  client items sinking below amber server items.
- Files: `artifact_v16.7.html`. No schema/env changes.

## v20.290 - INSIGHTS: Forecast-vs-trend detector (live)

- Reframed the staged divergent-growth detector into **Forecast vs trend** (`daForecastTrend`, flag
  `DA_DETECTORS.fcTrend=true`) per Ben's call. Per top-level category, compares this FY's forecast
  growth to the category's OWN recent actual YoY trend (last complete FY vs prior). Self-referential —
  no cross-category mixing — so it's robust to the CORE/SEASONAL split structure that broke the peer model.
  - Flags when |forecast − trend| > 15pts. Ahead of trend → "forecast optimistic, overstock risk";
    behind trend → "forecast conservative, possible upside".
  - `£ = min(|divergence|,100%) × last-FY revenue` (bounded both ways). Severity ≥£80k high / ≥£20k amber / else info.
  - `FLOOR=1000` units in BOTH prior and last FY kills launch-sparse YoY noise (the £9M artefact).
  - Lands under DEMAND ▸ Actions ▸ **Insights** with the same filters + Done/Snooze/Dismiss lifecycle.
- Files: `artifact_v16.7.html`. No schema/env changes.

## v20.289 - Client-detector plumbing + divergent-growth (staged off pending grouping design)

- New read endpoint `GET /api/demand-actions/state` → `{today, state}` so client-computed actions can
  carry their own done/snooze/dismiss lifecycle (writes still go to the existing POST). Snoozes past
  their date read back as open.
- DEMAND ▸ Actions `load()` now merges server actions with client-side detector items and applies the
  saved state map. Detector framework: `daClientDetectors(stateMap)` + per-detector feature flags
  (`DA_DETECTORS`); `daRowFu` caches `calc().fu` per subcat×co×ch.
- Built **divergent-growth** detector (`daDivergentGrowth`) — but **gated OFF** (`DA_DETECTORS.divergent=false`).
  Testing on live data showed the spec's "sub-cats within a parent" peer model breaks here: a "parent"
  groups CORE/SEASONAL decompositions of one line (not comparable peers), and prior-FY launch-sparse data
  inflates YoY → absurd £ (e.g. £9.1M "at risk"). Parent-vs-parent comparison is saner but mixes wildly
  different category sizes/maturities. Needs a design decision (likely reframe to self-referential
  forecast-vs-trend divergence). Code kept for when the grouping is settled.
- No schema changes. Files: `server.mjs` (+state GET), `artifact_v16.7.html`.

## v20.288 - DEMAND ▸ Actions split into ACTIONS · INSIGHTS · WEATHER (level-3 sub-nav)

- Added a level-3 sub-nav inside DEMAND ▸ Actions (same `.dnav` style as the other menus):
  **Actions · Insights · Weather**.
- Existing items now route by type: sell-through (behind/ahead) + event-approaching + future
  stock/anomaly items → **Actions**; trading-vs-last-year (behind/ahead) → **Insights**
  (`DA_INSIGHT_TYPES` map + `daSection()` helper). Each section keeps the same worked-process
  model — Status/Market/Category filters, £-at-risk total, Done/Snooze/Dismiss against
  `demand_action_state` — scoped to that section.
- **Weather** is a "coming soon" stub (needs a weather feed + product→sensitivity map at go-live).
- Groundwork for new client-side detectors: cards can carry a `sku` and show an **Open in Plan ↗**
  link (`daJumpToPlan` switches to Plan and pops the SKU detail panel). Detectors land next.
- No schema/env changes. Files: `artifact_v16.7.html`, version bump only.

## v20.287 - Tidy: DEMAND sub-nav matches SUPPLY/REPORTS + removed dead portal-preview code

- DEMAND's main sub-nav (Plan/Targets/Actions/Calendar) was a washed-out lighter style (`.dsub`,
  muted grey). Gave it a dedicated `.dnav` class matching the SUPPLY (`.stab`) / REPORTS
  (`.view-toggle`) dark-active + underline look; container border/spacing aligned too. The secondary
  in-view `.dsub` filter toggles (Targets/Actions/Calendar) are left as-is.
- Removed the 131-line dead portal-preview block (`ppCard/ppExpand/ppPOs/ppDeposits/ppPay/subFmt`)
  from `inject.html` — superseded by the shared `portal-view.js` when CONFIG started delegating to it.
  Confirmed zero remaining references; inject syntax clean.

## v20.286 - Live portal label/barcode PDFs (full parity) + portal-view.js is now canonical

Ported the in-browser label/barcode PDF subsystem (EAN bars, SVG label builders, A4 print-moulds,
manual PDF + zip) into `portal-view.js`, so the live `/portal` ⤓ label buttons generate real PDFs —
identical to the admin. The module's default `bc` uses session-scoped endpoints:
- **`GET /api/portal/label-data`** — barcode rows, intersected with the supplier's *own* PO SKUs (can't
  pull arbitrary SKUs); `GET /api/portal/asset/:name` (fonts/logos); `GET /api/portal/img` (swatch
  proxy, session-gated).

**Validated:** clicking ⤓ PO in the live portal fetched scoped label-data (3 rows) → loaded fonts →
rendered → downloaded `PO-1619178_barcodes.zip`, button reset, zero exceptions.

`portal-view.js` is now the **single source of truth** for the renderer (the inline copy was removed
from inject.html when CONFIG started delegating to it), so it's hand-maintained, not regenerated. Header
comment updated to say so.

That closes the "exact same portal" thread: live `/portal` and CONFIG ▸ Portal are one renderer; data is
scoped + figures match; writes are ownership-checked; labels work on both. Outstanding go-live: email
provider (`RESEND_API_KEY`) for magic links, and an optional tidy of the dead inline `pp*` helpers left
in inject.html.

## v20.285 - CONFIG ▸ Portal is now a view into the real portal (single shared renderer)

The admin CONFIG ▸ Portal preview no longer has its own inline copy of the renderer — it mounts the
same `DBPortalView` (portal-view.js) the live `/portal` uses. So there is **one running copy**, and the
two are guaranteed identical:
- `inject.html` now loads `/portal-view.js` and the CONFIG ▸ Portal branch (was ~21KB of inline
  renderer) is replaced by a `DBPortalView.mount(...)` call with the admin adapter: data via the
  existing client-side fetch+filter (`loadPortalData`), writes to `/api/supply/*` "acting as" the
  chosen supplier, and **its existing barcode functions passed as `opts.bc`** so admin label downloads
  keep working unchanged.
- `mount()` only claims `id="supply-root"` when not already inside one, so the admin (which already has
  a `#supply-root`) gets no duplicate id; the live portal still gets the styling.

**Validated both surfaces (CDP):** live `/portal` (Lixin) and admin CONFIG ▸ Portal both render the
identical grid + TIMELINE/ORDER PLAN/INVOICE/SHIPMENT tabs from the shared module; `dupRoots:1`.

**Remaining:** live-portal label/barcode PDFs still show the "coming shortly" placeholder (admin labels
work). Porting the in-browser PDF/barcode subsystem to the live portal is the last open item. Dead
inline `pp*` helpers left in inject.html (harmless) can be removed in a later tidy. Email provider
(Resend env) still Diviyaj's go-live wiring.

## v20.284 - Live supplier portal now renders the EXACT CONFIG ▸ Portal UI (shared renderer)

The live `/portal` no longer uses a bespoke layout — it renders the **same** UI as the admin
CONFIG ▸ Portal preview, from the **same code**:
- **`supply/portal-view.js`** is generated from `inject.html` (build: `/tmp/build-pv.mjs`) — the exact
  `ppPOs/ppExpand/ppDeposits/wireDetail` renderer + CSS, wrapped in `DBPortalView.mount(opts)` and
  parameterised by endpoint-set + identity. Regenerate it whenever the preview changes in inject.html.
- The live portal mounts it with the **scoped** adapter: data from `/api/portal/bootstrap`, writes to
  `/api/portal/*` (session-derived supplier, ownership-checked). Served gate-exempt.
- Added scoped helper endpoints the renderer needs: `/api/portal/notes/:sid`, `/api/portal/note-read/:id`,
  `/api/portal/attachment/:id` (all ownership-checked).

**Validated end-to-end:** Lixin login → identical grid (status pills, MANAGE rows, TIMELINE/ORDER
PLAN/INVOICE/SHIPMENT tabs, real costs/line-totals/completion dates), and a cost edit in the rendered
UI persisted to `portal_line_costs` scoped to the session (`submitted_by=factory@lixin.test`).

**Notes:** label/barcode downloads show a "coming shortly" placeholder in the live portal for now (the
buttons are identical; the in-browser PDF subsystem isn't yet ported) — fast-follow. The CONFIG preview
still runs its own inline copy; since `portal-view.js` is generated from it they're identical, but a
later tidy can point CONFIG at `portal-view.js` so there's literally one running copy (as discussed).
Email provider still pending (Resend env) per v20.282.

## v20.283 - Portal: scoped data feed for the shared (exact-parity) portal view [in progress]

Stage 1 of making `/portal` render the *exact* CONFIG ▸ Portal preview UI: a `/api/portal/bootstrap`
endpoint that returns the precise `_ppData` shape the preview renderer consumes, scoped server-side to
the session's supplier. The PO rows reuse the admin purchase-orders **date/payment calc verbatim**
(`POS_SQL_PORTAL`) so the figures are identical — just filtered + trimmed of the landed-cost fields the
portal doesn't show. Validated: Lixin → 50 POs with correct computed dates/payments, lines, SKUs,
costs, crossdock, notes, submissions.

Remaining (Stage 2): port the shared renderer (`ppPOs/ppExpand/ppDeposits/wireDetail` + barcode utils)
into a `portal-view.js` used by BOTH the live `/portal` and CONFIG ▸ Portal (so config becomes a view
into the real portal view); match the Deposits-tab shape; validate both surfaces. The simpler v20.282
portal page stays live until the shared view is validated.

## v20.282 - Real supplier portal (magic-link login + single-page supplier view)

Built the actual supplier-facing portal that was previously only scaffolded (the admin CONFIG ▸
Portal *preview* existed; the real `/portal` page a supplier logs into did not).

**Two surfaces, one route `/portal`:**
1. **Login** — supplier enters their email → `POST /api/portal/request-link` issues a magic-link token
   and emails it. (Always returns ok — never reveals whether an email is registered.)
2. **Portal** — clicking the link verifies the token, sets an httpOnly session cookie, and serves the
   single-page view of all their POs: order-plan (confirm cost / amend qty / add / remove SKUs),
   **crossdock SKU quantities**, additional costs, completion date + invoice upload + carrier/tracking
   submit, and the messages thread.

**Security (all tested live):**
- Every read + write is scoped **server-side** to the session's supplier — a supplier can only ever
  see/touch their own POs. Verified: writing to another supplier's PO → `403`; no cookie → `401`;
  unregistered email → ok with nothing sent (no account enumeration).
- The portal is exempt from the planner-key gate (it has its own session auth).
- Reuses the existing portal tables + mirrors the admin write logic, with `submitted_by` = the
  session email. No new migrations.

**Deploy (Diviyaj):**
- **Email:** set `RESEND_API_KEY` (+ optional `PORTAL_FROM`) to send magic links via Resend. Until
  then, links are logged to the server console (dev fallback) — the flow works, it just doesn't email.
  Swap in any provider by editing `sendMagicEmail()` if not using Resend.
- New file `supply/portal.html`; new routes `GET /portal` + `/api/portal/*` in `server.mjs`.
- Session cookie is `Secure` automatically behind HTTPS (`x-forwarded-proto`).

## v20.281 - Harness crash guards + migrations consolidated to one baseline

**Crash guards (`server.mjs`).** Added the resilience handlers that were missing — the cause of the
repeated dev crashes:
- `pool.on('error', …)` — a dropped idle Postgres connection (`EADDRNOTAVAIL`) no longer kills the
  process; the pool just recycles the client.
- `process.on('unhandledRejection' / 'uncaughtException', …)` — a single malformed request (e.g. the
  one-off `ERR_OUT_OF_RANGE`) is logged instead of taking the whole server down. The harness holds no
  critical in-memory state (stateless proxy to Postgres), so staying up beats crashing.

**Migrations simplified (61 → 1 baseline).** `migrations/` previously held 61 incremental files
(001–061). Replaced with a single consolidated **`migrations/schema.sql`** (generated via
`pg_dump --schema=planner --schema-only`, psql meta-commands stripped, `CREATE SCHEMA IF NOT EXISTS`).
The 61 originals are preserved under `migrations/_archive/`. **Validated** by rebuilding the baseline
into a throwaway schema — recreates all 63 objects cleanly. See `migrations/README.md`.

**Deploy (Diviyaj):**
- Fresh DB → run `migrations/schema.sql` once (not the 61 files). Existing DBs are already migrated —
  don't run the baseline against them; catch up with any unapplied `_archive/` files instead.
- The crash guards are harness-only; pull `server.mjs`.

## v20.280 - Collapsible fiscal-year columns (show/hide pills)

Each FY total column header is now a **show/hide pill** (replacing the plain FY label): "▾ hide FY27/28"
when its months are shown, "▸ show FY24/25" when hidden. Clicking toggles all of that fiscal year's
Mar–Feb monthly columns. **FY24/25 and FY25/26 are collapsed by default** (just their totals show), so
the planner opens on a tidy current-year-forward view; history expands on demand. State **persists
across sessions** (`localStorage: db_fy_collapsed_v1`).

This is the collapse capability the old CSS `visibility:collapse` approach couldn't deliver — now trivial
on the data-driven `TIME_COLS`: a collapsed FY simply omits its month entries (keeps the total), and the
toggle rebuilds the column spec + re-renders. Because every row type iterates `TIME_COLS`, colgroup,
headers and all rows stay aligned automatically (verified consistent at 50 cells/row in the default view,
growing to 74 with all FYs expanded).

**Bonus — this is also the render perf fix.** The default view drops from ~66 time-columns to ~42
(~36% fewer cells), which is where render time actually goes (DOM construction, per the v20.278 finding).
So hiding history by default makes the common view faster, for free.

## v20.279 - Deep-link URLs for DEMAND / REPORTS / SCENARIO sub-tabs

Extended the existing hash router (in the harness) so every view + sub-tab has a shareable,
bookmarkable URL with working back/forward:
- **DEMAND** → `#/demand/plan`, `#/demand/targets`, `#/demand/actions`, `#/demand/calendar`
- **REPORTS** → `#/reports/ex` (exec), `#/reports/slow`, `#/reports/af`, `#/reports/ka`, `#/reports/me`, `#/reports/otb`
- **SCENARIO** → `#/scenario/prime`, `#/scenario/b2b`, `#/scenario/finmodel`
- **BUY/FBA** → `#/buy`, `#/fba` (already existed; now friendly-named alongside the above)

Hash-based (not path) — consistent with the existing `#/supply/...` deep-links, so it's fully
client-side: **no server rewrites / infra for Diviyaj to wire**. Clicking a tab updates the URL;
loading/visiting a URL restores the view (verified both directions + a cold load at `#/reports/slow`).

Mechanics: harness exposes `window.writeHash`; the artifact's DEMAND/REPORTS sub-tab clicks call it;
`applyRoute()` maps friendly names (`demand`↔planning, `reports`↔exec) and restores sub-tab state;
on-load deep-linking broadened beyond `#/supply`. Files touched: `supply/inject.html` (router),
`artifact_v16.7.html` (sub-tab click handlers).

## v20.278 - Perf investigation (lazy-hydration tried & reverted) + live FY-total fix

Investigated SKU/forecast render cost. Measured on a 50-row table: `calc()` for all rows is only
**~12 ms**; a full render is **~120–160 ms**, i.e. the cost is almost entirely **DOM construction of
the ~2,240 cells**, not input listeners and not the forecast maths. Prototyped lazy-hydration of the
forecast inputs (stub → real `<input>` on focus/click) — it worked mechanically but, as the numbers
predicted, **did not change render time** (swapping an `<input>` for a `<div>` is the same DOM cost),
so it was **reverted**. The real lever for render speed is fewer *cells* — i.e. the collapsible-FY
feature (hide history by default), which is the next change.

**Kept (genuine bug fix):** after the v20.277 fiscal rework, editing a forecast cell updated the
month values but left the **FY total columns stale** until a full re-render (the totals had lost the
data-attributes `refreshRow` keys off). `refreshRow` now recomputes the fiscal totals (and all
displayed forecast months, incl. 2029) in place — edit a month, its FY total moves immediately.

## v20.277 - Monthly strip restructured to fiscal years, Mar 2024 → Feb 2029 (core artifact)

The core planner's monthly columns now run as a **continuous month-by-month strip from March 2024**,
grouped into **fiscal (Mar–Feb) blocks** — not calendar Jan–Dec. Five fiscal years on screen:

- **FY24/25, FY25/26** — monthly actuals (2 full years of history, month by month)
- **FY26/27** — current FY: actuals to Jun 26, then forecast
- **FY27/28, FY28/29** — monthly forecast

Each block ends with its fiscal total. Actuals→forecast flips automatically at the current month
(`isActualMonth` = month ≤ current). First columns stay sticky; scroll across time (no collapse).
The left-hand annual summary columns (FY24/25, FY25/26, YTD FY26/27) are kept as a quick-glance.

**Engineering:** the time axis is now **data-driven** — a single ordered `TIME_COLS` spec
(`{month | current-fc | fy-total}`) that every row type iterates: colgroup, both header rows,
subcategory rows, SKU drill-downs + subtotal, category totals, grand total. This **replaces the old
hardcoded SKU column-index scheme** (`COL_FM_START`/`COL_F26_TOT`/… ), which couldn't scale past 3
fixed blocks and was the source of past alignment bugs. New helpers: `fyMonths`, `fyTot`, `fyBg`,
`fyTotCls`, `isActualMonth`, `buildTimeCols`, `DISP_MONTHS`/`TIME_COLS`. The cascade engine spills to
Feb 2029 (`FM_CALC`) so FY28/29 is complete. Historical blocks are neutral grey, current FY blue,
future purple/teal.

Validated via CDP: every row type renders a consistent **74 cells** (8 leading + 66 time), strip =
Mar 24→Feb 29, actual/forecast boundary correct at Jun/Jul 26, fiscal totals tie (Tea Towel UK:
FY24/25 10,720 · FY25/26 27,346 actuals · FY26/27 28,187 · FY27/28 = FY28/29 29,849).

**Deploy (Diviyaj):** artifact-only, no migrations/env. Wider table (~74 cols) — horizontal scroll,
heavier render. Forecast-save payload unchanged (calendar 2026–2028 forecast keys; 2029 spill not saved).

## v20.276 - Fiscal year (Mar–Feb) summary & total columns (core artifact)

Dock & Bay's financial year runs **March → February**. Every year *summary/total* column in the
planner now aggregates on that basis (months stay Jan–Dec; only the aggregations changed). Naming
convention: **FYxx/yy** (e.g. Mar 2025–Feb 2026 = `FY25/26`).

- **Lookback columns** (left): `2024 → FY24/25`, `2025 → FY25/26`, `YTD 26 → YTD FY26/27`. YoY bases
  shifted to the prior fiscal year. YTD now uses the **last complete month** (excludes the partial
  current month) for like-for-like YoY — matches the old subcat behaviour, applied consistently to
  all row types (SKU rows previously included the partial month).
- **Forward FY totals** are now fiscal and span two calendar month-blocks: `FY26/27` (Mar26–Feb27),
  `FY27/28`, `FY28/29`. So e.g. the total after Dec 2026 sums Mar26–Dec26 + Jan27–Feb27 — deliberately
  *not* a clean sum of the visible 2026 columns.
- **Engine spill to Feb 2029** — `FM_CALC` cascades two extra months (Jan/Feb 2029, calc-only, no new
  columns) so `FY28/29` is a complete fiscal year. Display window (`FM`) unchanged at F26+F27+F28.
- New fiscal helpers: `fyMonths`, `fyLabel`, `fyU/fyR`, `fyToDateU/R`, `fyFC`, `fyStartOf`,
  `prevMonthKey`; globals `CUR_FY_START`, `CUR_YTD_END`. Applied across header, subcategory rows, SKU
  drill-downs + FY totals, category totals and grand total.

Validated via CDP: all six row types still render **48 cells** (aligned); labels = FY24/25, FY25/26,
YTD FY26/27, FY26/27, FY27/28, FY28/29; numeric check (Tea Towel UK) FY24/25=10,720 · FY25/26=27,346
(actuals) · FY26/27=28,187 · FY27/28=FY28/29=29,849 (flat cascade) · 2029 spill present.

**Deploy (Diviyaj):** artifact-only, no migrations/env. Note the forecast-save payload still saves
calendar `2026_*…2028_*` month keys (2029 spill is display-only and not saved). The monthly column
*layout* is unchanged; only summary/total aggregation logic moved to Mar–Feb.

## v20.275 - Extend the forecast window to 2028 (core artifact)

The core demand planner now forecasts **three full years** — 2026, 2027 **and 2028** — so Ben always
sees at least two full years ahead. (Built without the column-collapse feature, per Ben's call.)

- **Engine** — `F28` array added; `FM = F26+F27+F28`. `calc()`/`calcBaseline()` cascade 2028 off the
  **2027 forecast** (`base = fu[2027_mo]`), LY-anchored and flat by default — so a row growth % or a
  per-cell override compounds through 2026→2027→2028 exactly like 2027 does off 2026.
- **Table** — 2028 added to every row type: colgroup, both header rows, subcategory rows, SKU drill-down
  rows + subtotal, category totals, and the grand-total row. 12 monthly cols + an **FY 2028** total,
  in a teal palette to distinguish from 2027 (purple) and 2026 (blue). Column widths unchanged; the
  first columns stay sticky and you scroll across time as before.
- 2028 cells are editable (% or literal overrides) and feed the same save path as 2026/27.

Validated via CDP DOM inspection: all six row types render a consistent **48 cells** and align; a
numeric check confirms 2028 anchors on 2027 (flat baseline, e.g. Tea Towel UK DTC FY27=FY28=29,849).

**Deploy (Diviyaj):** no migrations, no new env vars — artifact-only change. Forecast-save payloads
now include `2028_*` month keys (sandbox); confirm the prod save target accepts them before shipping.

## v20.274 - Revert the CSS column-collapse (kept layout persistence)

The `visibility:collapse`-on-`<col>` approach (v20.272/273) didn't collapse reliably on the real
50+ column sticky `table-layout:fixed` table — only the current-month column toggled. Reverted the
column-collapse cleanly (chevrons/`fcm-*`/`FC_COLLAPSED` removed); table back to its working state.
**Kept** the SKU-expansion layout persistence (`db_layout_expanded_v1`). Column collapse will be
rebuilt via the robust re-render/visible-months approach when the time-window work resumes.

## v20.273 - Demand planner: collapsible forecast-year columns + layout persistence (core artifact)

Phase 1–2 of the wider-time-window rework:
- **Layout persistence** — the table's expand/collapse state persists across sessions
  (`localStorage`: `db_layout_expanded_v1` SKU drill-downs, `db_layout_fccollapse_v1` column groups).
- **Excel-style column-group collapse** — click the underlined **▾ 2026 Forecast** / **2026 FY**
  (or 2027) header to collapse that year's month columns to its FY-total; ▸ to expand. Pure CSS
  (`visibility:collapse` on classed `<col>`s) — no re-render, no cell-count change; fixed widths +
  sticky columns + horizontal scroll intact; totals can't shift.

Remaining: (3) monthly 2-yr history; (4) engine+window → 2028.

## v20.270 - SCENARIO Financial Forecast Model = exec-summary layout (channel→country, quarterly)

Rebuilt the scenario financial forecast to the exact exec-summary look (year cards, channel rows
DTC/FBA/B2B expandable to countries, YoY badges) with QUARTERLY columns (FY27 Q1–Q4 + FY28),
reusing `buildExecData()`. Growth %/Price % overlay per channel × country, forecast months only,
persisted (`scenario_fin_overlay`, migration `061`). New `/api/scenario/fin-overlay` GET/POST.

## v20.269 - B2B allocation: date-aware availability + default required-by date

Availability is now computed AT the required-by date: on-hand − expected own-channel sales between
now and the date + inbound landing by then. "Keep" column shows a "{N}wk cover" sub-label. Default
required-by date = today.

## v20.268 - SCENARIO ▸ Financial Forecast Model rebuilt in the exec-summary look

Re-skinned the financial forecast model to match REPORTS ▸ Exec Summary, reusing the artifact's
global exec CSS (year cards + exec table cells + YoY badges):
- **Year cards** on top: LY (Actual) vs the scenario FY (growth + price overlay) with a YoY
  revenue/units growth badge.
- **Exec-style table**: category rows × quarter columns, each cell stacked units / £revenue with
  ▲/▼ YoY badges vs LY, a dark FY-TOTAL column, and a TOTAL row.
- Overlay unchanged in mechanism: **growth %** + **price change %** per category × quarter
  (forecast only), persisted live via `/api/scenario/fin-model`. Annotation updated.

Built entirely in the scenario planner (`inject.html`), not the core artifact.

## v20.267 - Scenario: colour the recommendation/verdict badges

`.tool-badge` + `.bg-green/amber/red/neutral/blue/purple` were scoped to `#supply-root` only,
so in the scenario planner (`#scenario-root`) the B2B recommendation/verdict badges (e.g.
"Give ✓ — 17wk left") rendered unstyled. Extended those rules to `#scenario-root` too.

## v20.266 - B2B allocation: smarter fulfilment (reserve cover + inbound-aware)

Was giving away ALL available stock (fulfil = min(qty, available)). Now:
- **Keep cover** input (default 6 wks) reserves `velocity × weeks` of own-channel stock before
  allocating to B2B — never gives into a stockout.
- **Required-by date** feeds the calc: inbound landing in that market on/before the date counts
  toward fulfilment (`/api/scenario/b2b` returns `inbound_by_date`, `next_inbound_*`).
- Fulfil = stock (after reserve) + inbound-by-date; only the remainder is a true shortfall to
  air-freight. New Keep / Inbound columns; KPIs add From stock / From inbound; verdicts updated.

## v20.265 - B2B allocation margin now uses market COGS (not avg PO cost)

- Added `products.cogs_{uk,us,eu,au,ca}_3pl_final` (**migration `060_products_cogs.sql`**) and
  loaded them from SKU_CHILD (1,068 SKUs in sandbox; refreshed `size_short` + `variant_type`
  from the same file). Diviyaj: feed these via n8n on prod.
- SCENARIO ▸ B2B allocation margin analysis now costs at the **selected market's COGS**
  (`/api/scenario/b2b` returns `cogs`), falling back to avg PO cost only where COGS is unset.

## v20.264 - REPORTS ▸ Slow Moving: category filter, release column, sort, CSV

- Added a **Category** filter (dropdown of the categories present).
- Left-aligned the **Category** column; added a **Release** (release window) column
  (`release_window` now returned by `/api/scenario/slow-moving`).
- Added a **Sort** control — **£ tied up** (default) · SKU · Cover wk.
- Added **⬇ CSV** download — exports the full filtered set (not just the 400 shown).

## v20.263 - Portal order plan: Additional costs section → total invoice cost

Supplier portal ORDER PLAN tab now has an **Additional costs** section — add multiple lines
(description · qty · price → line total), with an additional total that sums with the order-plan
line items into a **Total invoice cost**. Add/edit/remove save in place (no reload). These also
show on PURCHASE ORDERS ▸ PLAN ▸ ORDER PLAN with the same total-invoice rollup.

New table `portal_additional_costs (id, po, description, qty, price)` (**migration
`059_portal_additional_costs.sql`**); endpoints `GET /additional-costs`,
`POST /additional-cost` (add/update), `POST /additional-cost-remove`; po-detail returns
`additional_costs`.

## v20.262 - Order plan: live refresh of supplier changes (incl. new SKUs)

While the ORDER PLAN view is open it now polls supplier changes (~12s) and re-renders when the
set changes — new added SKUs and amendments appear live without re-opening. Skips a tick if a
qty cell is focused (never clobbers an in-progress edit); the poll self-stops on navigating away.

## v20.261 - Order plan: include supplier-submitted SKUs + reflect submissions without a refresh

- The **Ordered** scope now also includes SKUs the supplier submitted a quantity for (amended
  qty or an added SKU) on the POs in view — so supplier changes appear as rows even before
  they're accepted (the inline ✓ confirm shows on the cell).
- Portal qty/cost/add/remove + crossdock submits now invalidate the order-plan + purchase-orders
  caches, so re-opening ORDER PLAN reflects them immediately (no browser refresh needed).

## v20.260 - Order-plan polish: confirm column, PO filter, inline supplier-change confirm

PO PLAN ▸ ORDER PLAN: widened the table so the **Confirm** button no longer clips. Timeline
"mark unread" is now a subtle text link (the "Mark read" button is unchanged).

SUPPLY ▸ ORDER PLAN (main pivot):
- PO filter box **moved to the Status row** (after the pills), styled **pale blue**, and now
  takes **multiple POs** (space / comma / line-break). A PO filter **overrides** the status +
  country pill filters.
- Supplier changes are now **inline in the grid cells** — an amber **"100 ✓"** confirm button
  in the (PO × SKU) cell (shows the proposed qty), **prioritised over** the partial-carton
  approve button when a cell has both. The top banner is now a slim count + Accept-all.
- PO column header is a **link** → opens that PO in PURCHASE ORDERS with its ORDER PLAN tab
  expanded (`gotoPO(po,'oplan')`).

## v20.259 - Crossdock shipped quantities (portal → PO → master shipment)

- **Portal SHIPMENT tab:** the "Crossdock SKUs on this order" section moved here from ORDER PLAN
  and is now a **qty-shipped input table**. Once the PO is SHIPPING (or past est. completion),
  filling these becomes an **open action** (SHIPMENT tab + MANAGE badges) until every crossdock
  SKU has a quantity. Saves in place (no reload). No D&B approval — reflects immediately.
- **PO PLAN ▸ CLIENT:** shows the supplier-entered "Crossdock shipped" quantities.
- **Master shipment:** new **Crossdock** sub-tab — table of every crossdock SKU across the POs on
  the shipment with qty shipped · source PO · supplier · client · client sales order.

New table `crossdock_shipments (po, sku, qty)` (**migration `058_crossdock_shipments.sql`**);
endpoints `GET /crossdock-shipments`, `POST /crossdock-qty`, `GET /shipment-crossdock/:ref`;
po-detail returns `crossdock_shipped`.

## v20.258 - Accept order-plan change → writes to the line + flags ERP push (qty + price)

Accepting a supplier change now **writes through** to the order plan, not just a confirm flag:
- amended qty → `purchase_order_lines.qty`; accepted cost (final ▸ supplier) → `cost_price`;
- supplier-**added** SKUs are inserted as new order-plan lines (erp_qty 0 = new to ERP);
- the line then differs from the ERP mirror → the PO shows **⚠ Update ERP**. ERP push now
  tracks **cost as well as qty** (`erp_cost` mirror, migration `057_line_erp_cost.sql`);
  `/upload` stages qty + cost. The real Cin7/Fulfil API write remains Diviyaj's gated job.

Still open: pushing **ship date** to the ERP (header-level, separate from line qty/cost) — to
spec with the ERP integration.

## v20.257 - ORDER PLAN: centre quantity columns + footer totals

Centred the qty cells (input text + cells), the per-SKU TOTAL column, and the footer
PO TOTALS summary row (was right-aligned).

## v20.256 - SUPPLY ▸ ORDER PLAN: "All SKUs" scope pill + supplier-changes-to-approve panel

- New **All SKUs** scope pill (after Ordered, before All in category) — shows every master SKU
  as rows, not just ordered ones (respects category/release/SKU filters).
- A **"⚠ N supplier changes awaiting approval"** panel above the grid lists each unconfirmed
  portal change (PO · SKU · qty 720→800 / cost / added) with per-line **Accept** and **Accept
  all** — the same confirm workflow as the PO PLAN order-plan tab, surfaced here too.
  (`portal-line-costs` GET now returns the `unconfirmed` flag.)

## v20.255 - PO PLAN order plan: accept-changes workflow + notification + link to full order plan

- **Accept workflow** — each supplier change (cost / amended qty / added SKU) shows an
  **Accept** button on the ORDER PLAN tab; an **Accept all changes** banner confirms them in
  one click. Accepting sets `confirmed_at` and adopts the supplier cost as the final price if
  none is set. Confirmed lines show ✓. (`POST /api/supply/po-line-accept` {po, sku | all}.)
- **Notification** — unconfirmed order-plan changes now flag the PO grid badge, the red
  ACTION ITEMS filter, and the ORDER PLAN sub-tab badge (`poExceptions.oplan`; grid count
  `orderplan_unconfirmed`; po-detail line `unconfirmed`/`confirmed` flags).
- **Link to full order plan** — "↗ open in full order plan" on the ORDER PLAN tab jumps to
  SUPPLY ▸ ORDER PLAN with this PO pre-filled in the PO filter (`gotoOrderPlan` → `_pendingOP`).

Migration `056_line_confirm.sql` (adds `portal_line_costs.confirmed_at`).

## v20.254 - Portal timeline: post a note without a full-page refresh

Posting a note in the supplier-portal timeline no longer calls `loadPreview()` (which
collapsed MANAGE). It now re-fetches the supplier's notes, updates them in memory, and
re-renders just that PO's expanded panel — staying open on the TIMELINE tab. `rerenderRow`
now preserves whichever sub-tab was active (or an explicit one).

## v20.253 - Portal add-SKU: searchable picker + no full-page refresh

- The order-plan "add SKU" control is now a **searchable typeahead** (datalist input — type to
  filter the supplier's SKUs by code, product name shown as the hint) instead of a long select.
- **Add / remove no longer reload the whole portal.** Refactored the portal's per-detail
  wiring into `wireDetail(scope)`; adding or removing a SKU updates `_ppData` in memory and
  re-renders just that PO's expanded panel (`rerenderRow`), keeping MANAGE open and staying on
  the ORDER PLAN tab. (Amend qty / cost already saved without reload.)

## v20.252 - Crossdock label: bigger text, box fills the white space

Enlarged the crossdock-label text (CROSS DOCK SHIPMENT 20→23, SKU 15→18, DELIVER TO 18→21,
address 22→27, PO/Dispatch/Client 18→21) with more line spacing, and floored the DELIVER TO
box (≥ H−190) so the frame extends down toward the barcode with the carton/pallet line
anchored at its bottom — filling the previously empty middle of the label.

## v20.251 - Portal order plan: amend quantity + add SKUs

Supplier portal ORDER PLAN tab is now editable beyond cost price:
- **Amend quantity** per line (editable Qty input; defaults to the order qty).
- **Add SKUs** — a picker of the SKUs assigned to that supplier (`products.supplier_multiple_all`)
  not already on the order, plus qty + price; added rows show an "added" tag and can be removed.
- Line totals + order TOTAL recompute from the effective qty × cost.

These flow to **PURCHASE ORDERS ▸ PLAN ▸ ORDER PLAN**: amended quantities show as
`→ N ⚠` next to the order qty, and added SKUs appear as extra rows tagged "added".

New: `portal_line_costs.amended_qty` + `is_added` (**migration `055_portal_amend_qty.sql`**);
`GET /api/supply/supplier-skus/:supplier`; `POST /api/supply/portal-line-remove`;
`portal-line-cost` now also accepts amended_qty / is_added.

## v20.250 - Crossdock label rework + Final delivery address field

- New **Final delivery address** field in PURCHASE ORDERS ▸ PLAN ▸ CLIENT (multiline).
  **Migration: `054_final_delivery_address.sql`**.
- **Crossdock label (portal + PO button):** "CROSS DOCK SHIPMENT" nudged down below the
  logo; the DELIVER TO block is now a larger framed box filling the space between the SKU and
  the barcode — it shows the **final delivery address** (large), PO, **Dispatch order**
  (was "Sales order"), Client, and the carton count. `bcDownloadCrossdock` now takes the
  dispatch-order ref + delivery address; both call sites updated.

## v20.249 - PO PLAN CLIENT: Crossdock + Ships-with-supplier label downloads

Added a "Labels (A4 print mould)" row in PURCHASE ORDERS ▸ PLAN ▸ CLIENT with two buttons:
- **⤓ Crossdock** — the PO's crossdock box labels (PO / sales order / client overlaid),
  identical to the supplier-portal download.
- **⤓ Ships with supplier** — a new carton-sized "SHIPS WITH SUPPLIER" master label
  (PRODUCTION-MASTER artwork): source supplier + production ref (this PO), ships-with
  supplier + PO (the master shipment's supplier + ref), destination branch/country, client
  name + sales-order ref, and a blank carton/pallet count. Renders to an A4 4-up mould PDF.

New endpoint `GET /api/supply/ships-with/:po` resolves the label fields (master shipment
supplier via `shipments.master_po`). New client builder `buildShipsWithSVG` + `dlShipsWith`.

## v20.248 - PO PLAN CLIENT: add Client purchase order ref + Dispatch order ref

Two new editable text fields in PURCHASE ORDERS ▸ PLAN ▸ CLIENT, directly under Sales order
ref: **Client purchase order ref** and **Dispatch order ref**. **Migration:
`053_client_order_refs.sql`** (adds `purchase_orders.client_po_ref`, `dispatch_order_ref`).

## v20.247 - PO PLAN DATES: widen Source column, show "supplier portal" once approved

- Source column widened (min 250px, table max 760px) + nowrap so the Approve → production end
  button fits without wrapping.
- Once a supplier completion date is approved, the row's Source shows **supplier portal**
  (rejected shows "supplier portal · <date>").

## v20.246 - Portal: trim the Completion date column width

Reduced the date input (190px→128px) and cell min-width (210px→140px) so the column fits
the date + picker without hogging grid width.

## v20.245 - Fix: completion/invoice submission picked the wrong row; dedupe submissions

- **Bug:** in po-detail the `to_char(submitted_at,…) submitted_at` alias shadowed the
  timestamp column in `ORDER BY submitted_at`, so same-day submissions tied and the pick was
  arbitrary (showed corrupt test data). Now orders by `id DESC` (latest insert) for both the
  completion-date and invoice queries; grid subqueries likewise use `id DESC`.
- **Dedupe:** a new portal submission of a given kind now supersedes any earlier still-pending
  one for that PO (status `superseded`), so the passive completion-date auto-save can't pile
  up pending rows. Cleaned existing corrupt/duplicate test rows in the sandbox.

## v20.244 - Supplier completion date → action on PURCHASE ORDERS + DATES tab

A completion date submitted in the portal now surfaces on the D&B side:
- **Action/notification** on PURCHASE ORDERS — a pending completion date flags the PO grid
  badge, counts toward the red ACTION ITEMS filter, and lights the DATES sub-tab badge
  (`poExceptions` dates bucket; new grid field `sup_completion_pending`).
- **DATES sub-tab (PLAN)** — a "Supplier completion date" row shows the submitted date with
  **Approve → production end / Reject** buttons. Approve applies it to the production-end
  date (`end_production_overide` via the existing `/submission/:id/apply`); Reject dismisses.
  po-detail now returns `sup_completion` (id/value/status).

## v20.243 - Portal grid: stop the Completion date column clipping the input

`#supply-root table{width:100%}` made the portal grid distribute column widths and ignore
the date cell's min-width, squeezing/clipping the (now wide) date input. Added
`table.pp-tbl{width:max-content;min-width:100%}` so the grid sizes to its content and the
column holds its width (same fix already used on the expand-row and products tables).

## v20.242 - Portal: Mark read no longer reloads / closes MANAGE

Clicking Mark read called `loadPreview()`, which re-rendered the whole portal and collapsed
the open MANAGE panel. Now it updates in place — toggles the button, the note's "new" badge
+ highlight, and decrements the TIMELINE tab + MANAGE action badges — with no reload.

## v20.241 - Portal completion date: force-open picker + wider column

The native calendar wouldn't open in the webview (the picker icon is clipped/unreliable) and
the column was too narrow. Now clicking the field calls `inp.showPicker()` to force the
calendar open regardless of the icon, and the input is widened (190px, cell min 210px).

## v20.240 - Portal/PO-PLAN timeline sync, invoice persistence, passive completion date

- **Timeline now syncs both ways.** Notes posted from PO PLAN ▸ Timeline (author_kind
  `internal`) were saved with no `supplier_id`, so the portal query (`WHERE supplier_id=$1`)
  never returned them. `portal-note` now resolves the PO's supplier and stamps it.
- **Portal shows Dock & Bay notes as an action.** Internal notes appear in the supplier's
  TIMELINE with a **new** badge + amber highlight until the supplier clicks **Mark read**
  (reuses `/note-read/:id`). Unread D&B notes count toward the TIMELINE tab badge and the
  MANAGE action badge. (`portal-notes` now returns `read` + `author_email`.)
- **Invoice value persists in the portal.** The submitted invoice now shows in the INVOICE
  tab — value, date, and approval status (awaiting / approved / rejected) — and the input
  pre-fills with the last submitted value; button reads "Resubmit invoice".
- **Completion date is now passive.** Was submitting mid-keystroke then disabling the field
  + firing an alert (felt broken / "can't select"). Now: pick or type a full date, it
  debounces ~1s and saves quietly (amber → green border), no alert, no disable. Column
  widened (input 165px, cell min 175px).

## v20.239 - PURCHASE ORDERS: red "ACTION ITEMS (n)" filter

Added a red **ACTION ITEMS (n)** toggle at the front of the action-items filter row in
SUPPLY ▸ PURCHASE ORDERS. The count = POs carrying one or more open action items (the same
red badges shown next to each PO ref via `poExceptions`). Clicking it filters the grid to
just those POs, across all statuses. The existing per-type pills are relabelled "By type".

Also de-noised `poExceptions`: **completed POs no longer raise payment-overdue / no-freight
actions** (not actionable once done) — invoice-awaiting-approval and unread-supplier-notes
still flag on any PO. This affects both the new filter count and the per-row badges.

## v20.238 - Fix: Portal preview "Preview as supplier" dropdown was unselectable

The supplier select sat inside the `pill-lbl` span inside a flex `.sect-h`; the webview's
flex-shrink quirk collapsed that nested item to ~0 width, so the selected option text showed
but the control couldn't be opened. Pulled the `<select>` out as its own flex item
(`flex:0 0 auto`, explicit 240px width, styled border). Now selectable.

## v20.237 - PO PLAN: invoice approve/reject action, Order Plan cost prices, Timeline tab

PURCHASE ORDERS ▸ PLAN now closes the loop on supplier-portal submissions:
- **PAYMENTS** — a supplier-submitted invoice now shows as an **action** (red badge on the
  PAYMENTS tab + a flag on the PO grid row) with **Approve → final / Reject** buttons.
  Approving applies the submitted value to the **Final Invoice Amount** (writes
  `supplier_invoice_total`); Reject dismisses it. Uses the existing
  `/submission/:id/apply` + `/dismiss` endpoints.
- **ORDER PLAN** tab rebuilt as a cost table: SKU · Qty · Est. cost · **Supplier submitted**
  (⚠ tag when it differs from the estimate) · **Final price** (editable per line) ·
  **Line item total cost** (qty × cost) · with **order TOTAL** (qty + final cost). Final
  price defaults to the supplier-submitted price (else estimate); saved on change. These
  are the agreed prices for the (still-to-build, gated) Cin7/Fulfil push.
- **TIMELINE** tab (new) — shared note thread with the supplier, mirroring the portal.
  D&B can **post a note** (notifies the supplier portal) and **Mark read/unread** supplier
  notes. **Unread supplier notes** show as an action (TIMELINE badge + PO grid flag).

New endpoints: `POST /api/supply/po-line-final` (final cost per line),
`POST /api/supply/note-read/:id` (read/unread toggle). po-detail now returns `line_costs`
and note `id`/`read`; the purchase-orders grid query returns `sup_invoice_pending` and
`unread_notes`. **Migration: `052_line_final_cost.sql`** (adds
`planner.portal_line_costs.final_cost`).

## v20.236 - Portal: "Preview as supplier" dropdown moved left of the "Portal preview" header

## v20.235 - Portal ORDER PLAN cost prices (item 8)
- Portal ORDER PLAN tab now shows per line: SKU, Qty, Est. cost (purchase_order_lines.cost_price), Actual cost
  (supplier input, blank = use estimate), and Line total (qty × cost). A TOTAL row sums QTY and FINAL price
  (all line totals), recomputing live as the supplier types. Saved on change.
- Migration 050: planner.portal_line_costs (po, sku, actual_cost, …). New GET /api/supply/portal-line-costs +
  POST /api/supply/portal-line-cost. server.mjs + inject.html.
- (Part c — flow these to SUPPLY ▸ Purchase Orders ▸ Order Plan with a discrepancy tag + accept → ERP push — is
  still roadmap.) Item 7 (Timeline tab on PO PLAN + note read/unread) still pending.

## v20.234 - Supplier portal grid/tab refinements (1-6 of Ben's batch)
- (1) Timeline note textarea left-aligned. (2) SHIPMENT tab: tracking/carrier form hidden when a Flexport ref is
  assigned (shows "handled via Flexport"). (3) Completion-date moved out of SHIPMENT into a main-grid column
  immediately right of "Est. completion" (inline date input, submits on change). (4) Crossdock label download
  now a "⤓ Crossdock" button in the grid Barcodes cell (removed the button from ORDER PLAN; SKU list still shown).
  (5) Removed the "Shipment" column from the grid. (6) Grid headers now wrap to 2 lines, vertically centred (pp-tbl).
- STILL TODO (need schema + endpoints): (7) Timeline tab on PURCHASE ORDERS ▸ PLAN with note read/unread + unread
  action badge; (8) portal ORDER PLAN cost prices — estimated + actual (input) + line total + QTY/FINAL totals.
- inject.html only.

## v20.233 - Label filename prefixes, Client requirements left-align, portal dropdown placement
- PO ▸ PLAN ▸ Client: "Client requirements" textarea now left-aligned (was inheriting .fci right-align).
- Barcode download filenames now prefixed by kind: PROD- (product), BOX- (carton), INNER- (inner), XDOCK-
  (crossdock) — across single PNG, single A4, and all the zipped/portal downloads.
- Portal preview: moved the "Preview as supplier" dropdown up to the "Portal preview" heading row, right-aligned
  (was overlapping the label). inject.html only.
- (Portal PO/production downloads already produce A4 moulds since v20.232 — hard-refresh if you still see PNGs.)

## v20.232 - Portal downloads = A4 print moulds; portal PO view redesigned into tabs
- BUG FIX: portal PO/production barcode downloads were producing individual PNGs; now they produce A4 print-mould
  PDFs (product 36-up, carton 4-up) per SKU, zipped (new bcDownloadSheets). Barcodes-tab "A4 Print Mold" already
  worked; this aligns the portal to it.
- Portal PO grid: expand control is now a "MANAGE" button (with a red action badge when invoice/shipment info is
  outstanding); the date "Completion" column renamed "Est. completion".
- Portal PO expand redesigned into a tabbed view (like PURCHASE ORDERS ▸ PLAN): TIMELINE (status + notes),
  ORDER PLAN (SKUs + crossdock download), INVOICE (submit invoice value + doc), SHIPMENT (flexport details/dates,
  or submit completion date + tracking + carrier). Tab action badges flag outstanding items. Expand content is
  left-aligned (was inheriting right-align). inject.html only.

## v20.231 - Crossdock labels (portal) + SKU_CHILD reload with crossdock barcodes
- Reloaded the new SKU_CHILD export into sku_labels (1068, incl. inserting missing crossdock SKUs) + products
  (110 text cols). 20 CROSSDOCK SKUs now carry carton_barcode. (PREORDER SKUs still have no barcode in the data.)
- buildCrossdockSVG: crossdock/preorder box label matching the _CROSS DOCK TEMPLATES artwork (DO NOT UNPACK box,
  D&B logo, CROSS DOCK SHIPMENT / CROSSDOCK ONLY, SKU, barcode, Reg footer) with PO# / sales-order# / client name
  overlaid in the DELIVER TO white space. Verified vs CROSSDOCK-1 (barcode 0650966963767 matches the template).
- Portal: a PO with crossdock SKUs now shows "Crossdock SKUs on this order" + a "⤓ Download crossdock labels"
  button → A4 4-up PDFs (one per crossdock SKU) with the overlay, zipped. label-data gains a ?skus= mode.
- Saved roadmap memory: portal cost-price submission feature (a/b/c) for later.
- server.mjs + inject.html. DEPLOY: this used a sandbox data reload; prod gets it via n8n from SKU_CHILD.

## v20.230 - Supplier portal: per-PO and per-production barcode downloads
- Portal PO grid gets two buttons per row: "⤓ PO" (product + carton barcodes for the SKUs on that PO) and
  "⤓ {prod_no}" (all the supplier's SKUs across that production, scoped via products.supplier_multiple_all).
  Each downloads a ZIP of individual PNG labels (reuses the label engine; flat folders, no batch warning).
- New server endpoint /api/supply/label-data?po= | ?prod=&supplier= → label rows (MASTER only, barcode present),
  registered before the generic :section route. server.mjs + inject.html.
- Note: crossdock/preorder SKUs are skipped here until their carton barcodes are loaded (currently null in the
  data — awaiting a SKU_CHILD export that includes them). Crossdock overlay labels are the next step after that.

## v20.229 - BARCODES: content-size the table so thin columns (GRS) stop stretching
- Root cause of the wide GRS column: the barcode table was width:100%, so auto-layout spread the slack across
  columns. Gave it class bc-tbl with width:max-content (like po-tbl) so columns size to content and the table
  scrolls if wide. GRS/size now tight. inject.html only.

## v20.228 - BARCODES: narrower GRS + size columns
- GRS approved header shortened to "GRS" (cell still Yes/—) → column shrinks to content. Size column capped at
  90px inline-block with ellipsis + hover-title for the full code (one line, no ugly mid-word wrapping). inject only.

## v20.227 - BARCODES: force SKU column width via inline-block span (webview ignored td min-width)
- The webview ignores min-width on table cells, so the SKU column stayed narrow. Wrapped the SKU in an
  inline-block span (min-width 250px + nowrap), which reliably forces the column width. inject.html only.

## v20.226 - BARCODES: widen SKU column (fits ~35 chars, no wrap)
- SKU column header + cells set to min-width 280px, white-space:nowrap. inject.html only.

## v20.225 - BARCODES: File Download dropdown + split Download-all (products / cartons+inners)
- Replaced the "Individual PNG" checkbox (which mis-fired when unticked) with a "File Download" dropdown:
  "A4 Print Mold" (default) or "Individual PNG". Drives the per-row P/C/I buttons.
- Download-all is now two buttons: "⤓ All Products" (product labels) and "⤓ All Cartons (+inners)" (carton AND
  inner labels per SKU). Both export individual PNGs zipped + foldered by supplier (multi-supplier SKUs → each
  folder). bcDownloadAll now takes a list of kinds. inject.html only.

## v20.224 - BARCODES: RRP market is a dropdown (was multi-select pills)
- Replaced the UK/US/EU market pills with a single "Market" dropdown (All / UK / US / EU). RRP on + a market
  shows that market's RRP column; "All" shows all three. inject.html only.

## v20.223 - BARCODES: right-align Download all over the "labels" column
- Floated the ⤓ Download all button to the top-right of the Settings bar so it sits above the grid's "labels"
  column (Ben's intent). Settings bar is display:flow-root so it still contains the float / grows — no overlap
  with the grid. inject.html only.

## v20.222 - BARCODES: rename "Label settings" heading to "Settings"

## v20.221 - Label settings bar: switch to inline-block flow (fix Download-all overlapping the grid)
- The wrapped second line (Download all) overlapped the grid below — the webview wasn't growing the flex
  container's height on wrap. Switched the label-settings bar (#bc-settings) from flex to normal inline-block
  flow, so the block container always grows to fit wrapped rows and pushes the grid down. Verified. inject only.

## v20.220 - Label settings: stop controls clipping ("only Individual showed")
- Bar items were shrinking (default flex-shrink) in the webview, so the longer "Individual (PNG) vs A4 PDF"
  label collapsed and clipped. Set .bar children to flex:0 0 auto (no shrink → wrap instead), and shortened the
  labels to "Individual PNG" and "⤓ Download all" (full text in tooltips). Verified under shrink pressure. inject only.

## v20.219 - Fix overlapping controls on the Label settings (and all .bar) rows
- Root cause: the .bar rows relied on flex `gap` for spacing; some webviews don't honour flex row-gap, so when
  the bar wrapped the rows stacked on top of each other. Switched .bar / .bar-grp from `gap` to explicit child
  margins (works everywhere). Verified no overlap even with gap forced off at a narrow width. inject.html only.

## v20.218 - products.size_short + label size circle uses it
- Migration 049 adds products.size_short; loaded from SKU_CHILD CSV (9) (S/M/L/XL/XS/XXL/One Size). The barcodes
  query now sources the label size circle from coalesce(products.size_short, sku_labels.size_short). Real data:
  "One Size" (e.g. eyemask) correctly shows NO circle per the rule. DEPLOY: run migration 049 + populate via n8n.

## v20.217 - products expanded with all SKU_CHILD fields + real variant_type
- Loaded the full SKU_CHILD export (138 fields × 1048 rows) into the products table. Migration 048 adds every
  SKU_CHILD field not already on products (~104 new columns, as text): variant_type, size, product_name_final,
  product_ean, carton/inner barcodes, barcode_*_name, GRS_material_product/carton, grs_approved, pallet_qty,
  release_window, status, launch/discontinue dates, target_cover_*, inventory_* set, etc. Sandbox upserted by SKU
  (1876 → 2029 rows; products now 147 cols). Existing typed columns (uk_rt, lead times, available_*) left intact.
- BARCODES MASTER/set filter now uses the REAL variant_type (from SKU_CHILD), replacing the heuristic seed:
  745 MASTER-only barcode SKUs, no SET leaking.
- DEPLOY (Diviyaj): run migration 048 on prod AND wire n8n to populate these from SKU_CHILD (ideally typed, not
  all-text). NOTE: SKU_CHILD has no "size_short" field — the label size circle still relies on the derivation.

## v20.216 - BARCODES: only show MASTER products (hide "set" variants)
- Barcodes grid now excludes set/multipack variants: query filters coalesce(variant_type,'') NOT ILIKE 'set'.
- variant_type is a source-PIM field not previously extracted — migration 047 adds sku_labels.variant_type.
  POPULATE from the SKU_CHILD/Airtable source in prod (Diviyaj/n8n). Sandbox seeded heuristically for now:
  unambiguous multipacks (SKU ~ [0-9]SET, or PP- prefix) = 'set', else 'MASTER' → 928 barcode SKUs down to 786.
- OPEN: gift boxes (GIFT-BOX-*) left as MASTER pending Ben's confirmation of whether they're 'set'.
- server.mjs (filter) + migration 047.

## v20.215 - BARCODES: label-settings bar tidy + empty-batch download warning
- Label settings bar: dropped the divider crowding the heading (now "Label settings" with margin) and the
  margin-left:auto on Download-all; dividers sit only between control groups.
- Any label download (single PNG, A4 PDF, or Download-all) with no Batch selected now shows a proceed/cancel
  warning that BATCH / DATE OF PRODUCTION will be blank. inject.html only.

## v20.214 - BARCODES: Supplier filter on supplier_multiple_all + "Download all (by supplier)" ZIP
- Supplier filter now matches the supplier_multiple_all field (was the PO-derived supplier list).
- New "⤓ Download all (by supplier)" button: renders every product barcode in the current view to a PNG and
  packs them into a ZIP foldered by supplier. Multi-supplier SKUs (e.g. "Lixin,XR Textile") get the same label
  copied into each supplier folder; SKUs with no supplier go in "_no supplier". Hand-written STORE-method ZIP +
  CRC-32 (no lib, CSP-safe). Button shows render progress; respects the selected Batch + Show-RRP settings.
- inject.html only. (Heads-up: rendering a large view is sequential and can take a minute — filter first.)

## v20.213 - BARCODES: download mode toggle, name wraps, supplier (multiple) column
- Label settings now has an "Individual (PNG) vs A4 PDF" checkbox: unticked (default) = A4 merge sheet PDF,
  ticked = single-label PNG. (Alt-click still forces single PNG.)
- "name" column now wraps to show the full text (was a single nowrap line).
- New "supplier (multiple)" column from products.supplier_multiple_all. server.mjs query + inject.html.

## v20.212 - Carton/inner: two-line header + fix squished A4 labels
- Carton/inner header is now two lines: line 1 "BOX OF n  x" (or "INNER  x"), line 2 the SKU (was one wrapping line).
- Fixed the squished labels on the A4 sheet: the carton/inner label is now a fixed 600×841 (matching the mould
  cell aspect 1178:1652) with the address anchored to the bottom; product is padded to 575×377 (cell 564:370).
  Plus pdfA4 now places each label fit-preserving-aspect & centred (no independent x/y stretch). inject.html only.

## v20.211 - Barcode labels now render in the Gotham brand font
- Labels (product + carton/inner, single PNG and A4 PDF) now use Gotham instead of Arial. The Gotham Book/Bold
  TTFs are committed to supply/assets/, served via /api/supply/asset/gotham-book|bold, fetched as data URIs at
  label-generation time and embedded as an @font-face inside the label SVG (fonts also pre-decoded via the
  FontFace API so they're ready when the SVG rasterises). Verified the embedded font renders (not Arial fallback).
- New committed assets: supply/assets/gotham-book.ttf, gotham-bold.ttf (licensed font — Ben OK'd committing).
- server.mjs (asset route serves fonts) + inject.html (fontCss + preloadFonts + svgText family).

## v20.210 - A4 merge sheet PDF download + D&B logo on carton/inner
- BARCODES P/C/I buttons now download the **A4 merge sheet as a PDF**: product = 36-up (4×9), carton/inner = 4-up
  (2×2), using the exact cell rectangles read from the PSD molds (_A4-Mold-36/4-labels.psd; 2480×3505 @ 300 DPI).
  Built with a small hand-written PDF writer (one A4 page, the rendered label rasterised to a JPEG image XObject
  placed into each cell — no external lib, CSP-safe). Alt-click still gives the single-label PNG.
- Carton/inner now use the real D&B logo (deck-chair + wordmark) at the top, served same-origin from
  supply/assets/db-logo.png via /api/supply/asset/:name.
- New committed asset: supply/assets/db-logo.png. server.mjs + inject.html.
- REMAINING: Gotham brand font (files received — awaiting OK to commit the font binary to the repo, then I'll
  embed it). Minor: product label aspect vs mold cell stretches ~6% on fill.

## v20.209 - Carton & inner labels match the BOX_/BOX_INNER artwork
- Built the portrait carton/inner label: DOCK & BAY wordmark, "BOX OF n  x  SKU" header, swatch + size circle +
  box SKU (BOX-/INNER- prefix) + size name + BATCH, the Global Recycled Standard logo, GRS material text, the
  barcode, and the fixed UK/EU compliance address. GRS logo served same-origin from supply/assets/grs-logo.png
  (new /api/supply/asset/grs route) and embedded into the PNG. P/C/I downloads now fetch swatch + GRS as needed.
- Carton barcodes that are 12-digit (UPC-A) render correctly (padded to EAN-13).
- KNOWN GAPS: the deck-chair logo mark above DOCK & BAY (need the asset); Gotham brand font (files received,
  embedding next); the A4 merge sheets (product 4×9=36, carton/inner 2×2=4) — need the label-stock dimensions.
- New committed asset: supply/assets/grs-logo.png. server.mjs + inject.html.

## v20.208 - Barcode label size circle uses size_short (+ "One Size" = no circle)
- Added migration 046 (sku_labels.size_short — short size code for the label circle, populate from PIM).
- The product label circle now uses size_short verbatim (e.g. eyemask = "M"); when size_short is "One Size" or
  blank, no circle is shown. Falls back to deriving S/M/L/XL/XS from the size name until size_short is populated.
- server.mjs barcodes query returns size_short. inject.html lblCircle reworked.
- DEPLOY (Diviyaj): run migration 046 on prod AND populate size_short from the SKU_CHILD source.

## v20.207 - Barcode label v2: matches the Dock & Bay OUTPUT artwork (product)
- Rebuilt the product label SVG to match the real artwork: "DOCK & BAY" header, descriptor (barcode_sku_name),
  friendly size (last segment of products.product_name), SKU, optional RRP (UK, shown when "Show RRP" is on,
  no symbol), a black size circle (S/M/L/XL/XS derived from the size name), the colour swatch top-right, and a
  BATCH / DATE OF PRODUCTION block fed by the selected Batch label-setting + batch_date. Barcode is full EAN-13
  with extended guard bars and large human-readable digits (first digit + two groups of 6).
- The label download now uses the selected batch + Show-RRP setting. server.mjs barcodes query adds product_name.
- Carton/inner share the new layout (carton keeps the GRS material text). KNOWN GAPS for v3 (need from Ben/PSD):
  size-circle letter for one-size items (e.g. eyemask = "M" can't be derived); the geometric brand font (CSP
  blocks web fonts in the artifact — Diviyaj's hosted build can embed it); the carton GRS icon artwork + exact
  carton/inner layout. inject.html + server.mjs.

## v20.206 - BARCODES labels download as PNG (was HTML)
- The P / C / I label buttons now download a PNG instead of an HTML file. The label is built as pure SVG
  (barcode rects + SVG text) and rasterised to PNG via canvas at 2× for crispness. The product swatch is
  fetched through a new same-origin image proxy (/api/supply/img?url=) and embedded as a data URI so the
  canvas isn't cross-origin tainted (which would block PNG export). server.mjs (img proxy, before the generic
  :section route) + inject.html (SVG builder + rasteriser, replaces the HTML builder). No schema change.

## v20.205 - BARCODES: v1 label template + per-row downloads; column width tweaks
- Column widths: swatch column narrowed to the image (~30px, blank header); GRS carton material widened
  (min 380 / max 560px, wraps).
- v1 label template + download: new "labels" column with P / C / I buttons (shown only when that EAN exists).
  Each downloads a self-contained, printable HTML label (Product / Carton / Inner) for that SKU. The EAN-13 is
  rendered as an inline SVG by a CSP-safe encoder built in (no external lib; 12-digit codes treated as UPC-A).
  Product label shows swatch + name + SKU + size + RRP; carton shows carton name + qty + dims; all show the GRS
  material text. Marked "v1 prototype" — needs aligning to Ben's PSD label artwork (dimensions/layout) for v2.
- server.mjs barcodes query adds barcode_carton_name/inner_name, carton_qty, uk_carton dims. inject.html for the
  encoder/template/buttons. No schema change.

## v20.204 - BARCODES: divider after "Label settings:" so Batch label doesn't blend
- Added a .bar-sep between the "Label settings:" heading and the Batch group. inject.html only.

## v20.203 - BARCODES grid: drop batch column, add GRS approved + GRS carton material
- Removed the per-row "batch" column (it just repeated the one selected batch on every row). The batch selector
  stays in Label settings as a print-run setting (feeds the future label generator).
- Added "GRS carton material" (sku_labels.grs_material) and "GRS approved" columns. There is no grs_approved
  field in the schema, so GRS approved is DERIVED: Yes when the carton material text contains "GRS" (all current
  materials are "…GRS certified…"), else —. inject.html only.

## v20.202 - BARCODES label settings: group spacing fix
- The label-settings controls read as one run ("Label settingsBatch", "Show RRPMarkets"). Wrapped each control
  in a .bar-grp (tight label↔control gap) with vertical .bar-sep dividers between groups, and a colon after the
  "Label settings:" heading. inject.html only.

## v20.201 - BARCODES tab: label settings (batch, RRP toggle, markets) + PROD# cleanup
- Added a "Label settings" row (config, distinct from the filters): Batch dropdown (stamps the chosen batch's
  number/date/release onto the labels — shows a Batch column), a "Show RRP" checkbox, and UK/US/EU market pills
  for which RRP to present. RRP comes from products (uk/us/eu only). Columns appear/disappear with the settings.
- PROD# filter now lists only real production numbers (po.prod_no matching ^P[0-9]); the junk "AU" value (which
  was also in the prod_numbers reference table) no longer appears, per Ben.
- server.mjs (barcodes returns {rows, batches}; rows add uk_rt/us_rt/eu_rt; prod# regex filter) + inject.html.

## v20.200 - BARCODES tab: filters (PROD#, supplier, category, release, SKU list)
- Added a filter bar to the BARCODES tab: PROD# (dropdown), Supplier (dropdown), Category (dropdown), Release
  (seasonal, dropdown), and a SKU/name text filter that accepts a comma/space-separated list. PROD# and Supplier
  are aggregated server-side from the POs each SKU appears on (purchase_order_lines → purchase_orders), so a SKU
  shows under every prod number / supplier it was ordered on. server.mjs (barcodes query adds release_window +
  prod_nos + suppliers) + inject.html (filter bar).
- Note: PROD# options reflect raw purchase_orders.prod_no values, so a mis-entered prod_no (e.g. "AU" on some POs)
  appears as an option — a data-cleanup item, not a tool bug.

## v20.199 - PAYMENTS tab: Order value labels no longer clipped
- The "Order value" block (Estimate / Final invoice / Supplier submitted / Value used / Total amount due) was a
  fixed 520px-wide scrolling table whose wide value cells pushed an internal horizontal scroll that clipped
  content. Reworked it into the same clean label/value flex layout as the Client tab — each label sits in its
  own column, the value flexes beside it, nothing scrolls or clips. inject.html only.

## v20.198 - Server no longer computes due dates for 0% milestones
- start_due / completion_due are now null when the milestone calc is 0 (CASE WHEN start_calc/completion_calc > 0).
  The due date doesn't exist at the source, not just hidden in the UI. Verified PO-1596957 returns null for both;
  POs with a real start/completion % still get their due dates. server.mjs only. Complements v20.197.

## v20.197 - 0% payment milestones no longer show a due date / overdue warning
- A start deposit or completion payment with a 0% / $0.00 calc now shows "—" in the Due column (no date),
  no overdue ⚠, a neutral status badge, and no "likely pay date" input — there's nothing to pay, so it can't
  be due or overdue (e.g. PO-1596957: 0% start with a stale 19-Dec-25 due date + warning). The PLAN tab and
  grid exception flags also stop counting $0 milestones as overdue. Balance behaviour unchanged (already gated
  on amount owing). inject.html only (dueCell owed-gate + poExceptions guard).

## v20.196 - FOB rule finalised: no import-warehouse destination + no shipment = FOB pickup
- Per Ben: FOB = the goods don't land into one of our import warehouses (UK/US/EU/AU/CA) AND no shipment is
  assigned. DIRECT / "Direct to Client" / blank destinations are pickup → $0 freight, no import duty/tax, no
  "no freight rate" action. Once a shipment is assigned it takes priority (it carries the real destination +
  mode, including fob=$0). New shared isFOBdest(r) helper drives the PLAN LANDED COSTS view + the exception flags.
- Server: cash flow now skips freight/duty/tax for FOB POs (was defaulting blank-country POs to UK rates and
  charging freight) — keeps cash flow consistent with the PLAN view. Only the goods value flows for FOB orders.
- Supersedes the v20.194/195 interim DIRECT handling. server.mjs + inject.html.

## v20.195 - Correct DIRECT≠FOB; remove Production dropdown from PO grid
- Corrected v20.194's wrong assumption that DIRECT = FOB. DIRECT is a destination that may ship to the US/UK
  (freight + import, set on its shipment) OR be FOB pickup (no cost) — we can't tell until a shipment is assigned.
  So a DIRECT PO with no shipment now shows freight/import as "pending shipment" (not "$0 FOB"), the landed total
  is labelled "excl. freight/import — pending", and the "no freight rate" action no longer fires for DIRECT.
  A DIRECT PO with a shipment routes freight/import to that shipment as before. FOB ($0) is still honoured at the
  shipment level (mode='fob'). Non-DIRECT POs with a genuinely missing rate (and no shipment) still flag.
- Removed the "Production" (supplier production-confidence) dropdown column from the PURCHASE ORDERS grid — it
  duplicated the Status column visually and can still be set from the Actions tab. The production_status field
  and its Pipeline / What's Next uses are unchanged. inject.html only.

## v20.194 - DIRECT (direct-to-client) POs are FOB: no freight/tax, no false exception
- A PO whose destination is DIRECT (direct-to-client, no warehouse location) is now treated as FOB pickup:
  freight = $0, no import duty/tax. The PLAN ▸ LANDED COSTS tab shows "FOB" in those rows with an explanatory
  note, and the "no freight rate" exception/action flag no longer fires for DIRECT POs (it was a false positive
  — e.g. PO-1596960). Non-DIRECT POs with a genuinely missing freight rate still flag.
- Cash flow already excludes $0 lines server-side, so DIRECT POs correctly contribute only their goods value.
- inject.html only (poExceptions + payPanel landed section). No server or schema change.

## v20.193 - PO grid: exception/action flag next to the PO reference
- Added a shared poExceptions(r,d) helper (the single source of truth for PO exceptions/actions) and used it
  for both the PLAN tab badges and a new red count flag shown right of the PO reference on the main PO grid.
  Hovering the flag lists the actions. Today's signals: overdue start/completion/balance payments, supplier-vs-
  final invoice discrepancy (only once the PLAN panel is opened), and "no freight rate for destination" (can't
  estimate sea freight). inject.html only.
- Note: the PO PLAN landed-cost action "(1)" on a DIRECT PO (e.g. PO-1596960) means it has no freight rate for
  the destination so sea freight can't be estimated. For direct-to-client POs that may be expected — flagged
  for review (see deploy notes / Ben).

## v20.192 - PO PLAN: new LINKED RECORDS tab
- Added a 6th PLAN sub-tab "LINKED RECORDS" holding the cross-table reference blocks (Deposit, Payments,
  Flexport). ORDER PLAN now shows just the SKU/qty lines. inject.html only.

## v20.191 - PO PLAN: keep the open sub-tab after a save (was snapping back to PAYMENTS)
- Adding/removing a crossdock SKU (or any save that re-renders the panel) re-pulled the PO and rebuilt the
  expand panel, which reset the active sub-tab to the first one (PAYMENTS). Now poRefetchPanel remembers the
  open tab and loadPoDetail re-activates it after the re-render, so you stay on CLIENT (or whichever tab you
  were on). inject.html only.

## v20.190 - PO PLAN expand reworked into tabs + exception badges; Client UI fixes
- The PURCHASE ORDERS ▸ PLAN expand panel is now a light-blue tabbed view (same .rtab styling as the other
  level-3 navs): PAYMENTS (order value + payment plan + linked deposit/payment records), DATES, CLIENT,
  LANDED COSTS, ORDER PLAN (SKU/qty lines). Only the active tab's panel shows; all are rendered so inline
  saves keep working regardless of which tab is open.
- Each tab shows a red circle exception/action counter when something needs attention:
  - PAYMENTS: each overdue-unpaid milestone (start/completion/balance) + a supplier-vs-final invoice discrepancy.
  - LANDED COSTS: no freight rate found for the destination.
  (DATES / CLIENT have none today — wired so we can add more signals later.)
- Client section UI fixes: column-1 labels now always visible (fixed-width label column, no overflow table);
  crossdock SKU picker is a free-flowing wrapping row so the "add SKU" box stays visible no matter how many
  chips are added (was clipped by the old fixed table cell).
- inject.html only (payPanel now returns per-tab chunks + exception counts; poDetailHTML builds the tab bar;
  bindPay wires tab switching). No server or schema change.

## v20.189 - New per-PO "Client" section (name, requirements, sales order ref, crossdock SKUs)
- In PURCHASE ORDERS ▸ PLAN, each PO now opens with a "Client" section: client name, client requirements
  (textarea), sales order reference, and a Crossdock SKUs multi-picker. Eligible crossdock SKUs are any whose
  code starts with CROSSDOCK or PREORDER (union of products + sku_labels); picked SKUs render as removable chips
  and save as a comma list to purchase_orders.crossdock_skus. This sets up a future supplier-portal "download
  crossdock labels" feature.
- server.mjs: /api/supply/lookups now also returns `crossdock` (eligible SKU list); PO query returns the 4 client
  fields; PO patch whitelist accepts client, client_requirements, sales_order_ref, crossdock_skus.
- inject.html: txtIn() free-text saver (no comma-stripping), crossdockPicker() chips + add input, Client section
  in payPanel, bindPay wiring for .txtin / .xd-add / .xd-rm, .chip CSS.
- MIGRATION (for Diviyaj on prod): 045_po_client.sql — adds client_requirements, sales_order_ref, crossdock_skus
  to planner.purchase_orders (client column already existed). Applied to sandbox.

## v20.188 - PO PLAN Order value: show supplier-submitted invoice + docs + discrepancy
- In PURCHASE ORDERS ▸ PLAN ▸ "Order value", added rows for the supplier-submitted invoice value (from the
  portal, with status pending/applied) and links to the uploaded invoice document(s). If the submitted value
  differs from the internal Final invoice amount, it's highlighted amber with the delta (⚠ differs (Δ $X));
  if they match, shows a "matches" badge. po-detail now returns sup_invoice + sup_docs. server.mjs + inject.html.

## v20.187 - PO PLAN Landed cost reworked (auto sea freight, due dates, no container picker)
- PURCHASE ORDERS ▸ PLAN "Landed cost — estimated" table: added column titles (Cost / Amount / Est. due) +
  a description of what it is. Removed the container-size picker — freight now AUTO-estimates from the
  order-plan pallets as the cheapest SEA container combo (LCL/20ft/40ft) ▸ Flexport quote. Added an Est.-due
  column: freight = delivery + 14, import duty/tax = landing (USA +7) — these feed CASH FLOW. If a shipment is
  assigned, freight/tax show "→ shipment" (link) and are driven by the SHIPMENTS page instead. Landed total
  recomputed client-side. PO query now returns pallets/sea_tiers/flex_quote.
- Cash flow per-PO freight now uses the same sea-combo-from-pallets estimate (was the container-rate lookup),
  so a PO with no container_size still prices (e.g. 0.1 pallets → 1×LCL $600). server.mjs + inject.html.

## v20.186 - Shipment destination = shipment-level override, inherits from master PO
- REPLACES v20.185's approach. The shipment's Ship-to/Branch now INHERIT from the MASTER PO (calculated:
  country_code ▸ branch country; branch) and can be OVERRIDDEN at the shipment level — the override is stored
  on planner.shipments (MIGRATION 044: branch, country_code) and never written to the POs aboard, so an FBA /
  direct-to-client PO can be crossdocked via e.g. UK ILG without changing the PO. Displayed in the shipment
  plan like the dates: bold final (with src — 'calc' inherited / 'S' override) and the override control below.
  Grid Ship-to/Branch columns + the sea-rate market now use this master-PO-based value (was aggregated from all
  POs). Diviyaj: run migration 044. server.mjs + inject.html.

## v20.185 - Shipment plan: editable Destination (ship-to + branch) → POs aboard
- The shipment grid's Ship-to/Branch are derived from the POs aboard (read-only), so they're blank when the
  PO has no branch/country. Added a "Destination" editor in the shipment plan: Ship to + Branch selects that
  write to ALL POs aboard at once, then refresh — so you can fix a blank destination from the shipment view
  (the grid columns + freight estimate then inherit it). e.g. PO-55UKJM2 → set branch UK ILG → shows UK /
  UK ILG and sea rates resolve. inject.html only.

## v20.184 - Shipments grid: Ship-to country + Branch columns & filters
- SHIPMENTS grid now shows Ship to (country) and Branch columns, with filter dropdowns for each (alongside
  the existing status pills + search). Server adds branch to the shipments feed (market was already there).
  server.mjs + inject.html.

## v20.183 - Fix: shipment sea-freight $0 when PO destination blank
- Shipment freight showed $0 because the shipment's "market" (for the per-country sea rate) was read from
  po.country_code only, which is often blank. Now: market falls back to the PO's BRANCH country; and if the
  shipment still has no resolvable destination, the sea-rate lookup defaults to UK rates so the estimate still
  computes (rates are currently uniform across countries). Fixed in both the shipments feed and the cash-flow
  freight calc. e.g. PO-55UKJM2 (4.9 pallets) now estimates $3,000 instead of $0. DIRECT-to-client shipments
  still have no sea rate (freight is FOB/$0 there). server.mjs only.
- NOTE: PO-55UKJM2 has neither branch nor country_code set — worth filling its destination in PURCHASE ORDERS
  for an accurate per-country rate once sea rates differ by market.

## v20.181 - Deep-link straight to an expanded PO / shipment
- URLs can now target a specific row: #/supply/purchase-orders/<PO> opens that PO's PLAN, and
  #/supply/shipments/<ref> opens that shipment's detail. Reverse too: expanding a PO/shipment row updates the
  hash to include the ref (collapsing reverts), so the open item is shareable/bookmarkable. inject.html only.
  (Caveat: a deep-linked PO must be in the current grid filter to auto-expand — complete POs are hidden by the
  default in-progress filter.)

## v20.180 - Shipments: date field layout (final date prominent, above the override)
- Reworked each shipment date field (Departure/Landing/Arrival/Completion): LABEL → the final effective date
  shown bigger/bold (with its src badge, e.g. 16-Feb-26 calc) → then the "override" input below. Previously the
  final date was a small line under the override. inject.html only.

## v20.179 - PO search overrides filters + shipment dates calc from master PO
- PURCHASE ORDERS: a text search now overrides the status/action/country filters — it searches across ALL
  POs (count note says "search — all statuses"). Previously an in-progress filter hid search hits. CSV export
  follows the same logic. inject.html.
- SHIPMENTS: when a shipment has no override and no Flexport dates, departure/landing/arrival/completion now
  CALCULATE from the linked master PO (prod-end +7 = departure; + branch transit lead, air/sea by the
  shipment's mode = landing/arrival; +7 = completion) instead of showing blank. Tagged 'calc'. server.mjs.

## v20.178 - Shipment plan: PO refs link to Purchase Orders (PLAN)
- In a shipment's expanded detail, the "POs aboard" references are now links that open PURCHASE ORDERS with
  that PO's PLAN expanded (reuses gotoPO). inject.html only.

## v20.177 - Shipments: Delivery → Completion (arrival +7) + ERP-receipt exception
- SHIPMENTS: the "Delivery" date is renamed "Completion" and now computes as arrival + 7 days (warehouse
  received) when there's no manual override — previously it was blank unless overridden. Server returns
  `completion` + `completion_src` (S override / calc) on the shipments feed.
- ACTIONS: new "Awaiting ERP receipt" card — a PO sitting in DELIVERED past its completion (arrival +7) but
  not yet Received in Cin7/Fulfil → chase the receipt to complete the PO (informational, opens the PO).
  server.mjs + inject.html.

## v20.176 - Fix: deep-link refresh lost the level-3 sub-nav
- Refreshing on a deep link like #/supply/productions/deposits showed the content but not the level-3
  sub-nav (prod-subtabs/rep-subnav/config-subs). Cause: applyRoute ran showSupply() (auto-loads Actions)
  AND the routed section — the two async renders raced and Actions clobbered the layout. Now applyRoute
  calls showSupply(true) (show chrome, don't auto-select) so only the routed section renders. Same race
  fixed in gotoSupplySection. inject.html only.

## v20.175 - Payments Report: Deposit lines link to Deposits (not PO)
- In PRODUCTIONS ▸ Payments Report, Deposit-type lines' reference now opens PRODUCTIONS ▸ Deposits (was
  wrongly routed as a PO). Reference/deposit-ref links filter the register by the deposit CODE only (first
  comma token, e.g. "P55-UK-WK2" from "P55-UK-WK2, Weierken…") so the register actually matches. inject.html.

## v20.174 - OTHER PAYMENTS: lock paid rows + status/supplier filters
- Paid Other-payments now grey out and lock (read-only) with an Edit→Save toggle (like the Deposits
  register). Added filters: Status pills (All / Paid / Overdue / Unpaid) + a Supplier dropdown, with a count.
  inject.html only.

## v20.173 - Payments Report references are links
- In PRODUCTIONS ▸ Payments Report, the expanded sub-payment lines now link: the reference opens the PO's
  PLAN (Deposit/Completion/Balance lines) or Other Payments (Other lines), and the Deposit ref opens
  PRODUCTIONS ▸ Deposits filtered to that ref. New gotoOther() helper. inject.html only.

## v20.172 - Cash Flow deposit references link to Productions ▸ Deposits
- Deposit-pool (register-basis) references in the Cash Flow report are now links too: they open
  PRODUCTIONS ▸ Deposits with the register filtered (All) to that deposit reference. New gotoDeposit() +
  _pendingDep prefilters the deposit search on arrival. inject.html only.

## v20.171 - Cash Flow reference → opens the PO (PLAN) or shipment
- The Reference in the Cash Flow report is now a link: PO-basis lines open PURCHASE ORDERS with that PO's
  PLAN expanded; shipment-basis lines (freight / duty / tax on an assigned shipment) open SHIPMENTS with that
  shipment expanded — so you can review estimates/actuals and edit likely-paid dates on the source item.
  Deposit-pool (register) references have no single PO/shipment, so they stay plain text. Reuses the existing
  gotoPO/gotoShipment helpers. inject.html only.

## v20.170 - Hash deep-links for tabs (#/supply/reports/pipeline)
- Tabs and sub-tabs now have shareable/bookmarkable URLs via the hash, e.g. #/supply,
  #/supply/purchase-orders, #/supply/reports/pipeline, #/supply/productions/payreport, #/supply/config/freight.
  Navigating writes the hash; opening a link, refreshing, or browser back/forward restores the exact tab.
  Hash-based = pure client-side, works everywhere with no hosting change. inject.html only.
- Clean paths (/supply/reports/pipeline, no #) would need a Vercel rewrite + History API — deferred to
  Diviyaj (hosting) if wanted later.

## v20.169 - Cash Flow all dates + likely pay date editable in PO PLAN
- Cash Flow report split the single date column into Due · Likely pay date · Paid so all dates stay visible
  (esp. when filtering overdue). Columns: Due, Likely pay date, Paid, Status, Type, Reference, Amount, Month,
  Supplier, Mkt.
- PURCHASE ORDERS ▸ PLAN payment table: new editable "Likely pay date" column (next to Due) for each unpaid
  milestone (Start/Completion/Balance/Balance 2), wired to the same likely-date store as the Cash Flow report
  (set in either place, shows in both). PO query now returns likely_start/completion/balance_1/balance_2.
  server.mjs + inject.html.

## v20.168 - Cash Flow report column reorder + labelled date input
- Reordered Cash Flow columns and gave the likely-date input its own labelled column (was an unlabelled
  input crammed in the Status cell). inject.html.

## v20.167 - Pallet rebalance (smoothing) between POs + >20 signals
- PURCHASE ORDERS: new Pallets column (Σ line qty ÷ sku pallet_qty); a PO over 20 pallets is shown in red.
- ACTIONS: "Over 20 pallets" card for any PO over one container — but only BEFORE it ships (FUTURE /
  PRODUCTION / READY TO SHIP; excluded once SHIPPING/DELIVERED/COMPLETE) and excluding Direct-to-Client.
- Rebalance engine (the smoothing feature): the card's "⇄ Rebalance pallets" opens a preview that moves the
  EXCESS off any >20 PO into the under-20 POs of the SAME supplier + production + branch (same destination —
  never across markets), moving whole or partial SKUs, minimal-move (not a full repack). Preview shows the
  per-PO before→after pallets + line deltas; Apply writes the new line quantities as proposed (not pushed to
  ERP until Upload). Direct-to-Client and shipped POs are never touched. Endpoints /api/supply/rebalance/:po
  (preview) and /rebalance-apply/:po. Verified end-to-end (e.g. 21.1+12 pallets → 20+13.1 via one 1,320-unit
  move); live test reverted. server.mjs + inject.html.

## v20.166 - Portal: rename Start dep header + payment columns show only paid
- Portal PO table: renamed the "Start dep" column header to "Start deposit assigned".
- The three payment columns (Start deposit assigned, Completion, Balance) now only show a value once the
  payment has actually been MADE — i.e. when its paid date exists — and show that date underneath; unpaid
  milestones show "—" instead of the due/term amount. Amount due / Due columns are unchanged. inject.html.

## v20.165 - Deposits: lock paid+FX / closed rows (edit/save to change)
- A deposit row now LOCKS (greyed, read-only) once it's CLOSED, or once it's PAID + FX applied (date_paid
  set AND xero_fx set). Locked paid rows show a "paid" badge + an Edit button → unlocks the row inline
  (Save relocks + refreshes; edits save inline as before). Closed rows show only Reopen — you must reopen
  before they can be edited. Assign/edit controls are hidden while locked. Unlocked rows stay inline-editable.
  UI-only (deposit save endpoint unchanged). inject.html.

## v20.164 - PRODUCTIONS becomes a 4-tab section; Other Payments due dates loaded
- Moved OTHER PAYMENTS and PAYMENTS REPORT out of REPORTS ▸ Payments and into SUPPLY ▸ PRODUCTIONS as
  sub-tabs. PRODUCTIONS now has a light-blue (.rtab) sub-nav: Productions · Deposits · Other Payments ·
  Payments Report. Removed PAYMENTS from the REPORTS sub-nav (REPORTS = What's Next · Pipeline · Cash Flow ·
  Flexport). renderOtherPayments()/renderPaymentsReport() extracted as reusable container renderers; the old
  renderPayments/paySub + REPORTS 'payments' route removed.
- DATA LOAD (sandbox): populated Other Payments from WORKING_-_Sheet297_with_PO.csv — set the PO reference
  (was null) and refreshed due/paid dates on 121 matched rows (matched by description), inserted 2 new; the
  40 existing rows not in the file were left intact. All 161 Other Payments now have a due date. Data only,
  no migration. Diviyaj: this load is sandbox-only; reconcile Other-payment references into prod separately.

## v20.163 - REPORTS ▸ Payments: date filter + Other Payments due date/status
- Payments register: From / To date filter using plain text boxes (not a date picker) — accepts a full or
  partial date (2026 / 2026-06 / 2026-06-15) and filters the runs (TOTAL recomputes). Clear button resets.
- Other Payments: added an editable Due date column + a derived Status badge — Paid (date paid set),
  Overdue (due date past & unpaid), else Unpaid. Server: deposits feed now returns date_due and the
  /deposit/:id save endpoint whitelists date_due (was missing). server.mjs + inject.html.

## v20.162 - Supplier portal — Phase 4: internal one-click apply
- Pending supplier submissions now surface in SUPPLY ▸ Actions as cards: "Supplier completion date" (DATES
  group) and "Supplier invoice" (PAYMENTS group), each with one-click ✓ Apply + Dismiss (and a "view doc"
  link when an invoice attachment is present). These cards carry their own apply/dismiss — the generic
  snooze/dismiss lifecycle is suppressed for them.
- Apply writes to the live PO (the internal click is the confirmation): completion_date →
  end_production_overide, invoice_value → supplier_invoice_total; the submission flips to 'applied'
  (re-apply refused). Dismiss flips it to 'dismissed'. Endpoints: /api/supply/submission/:id/apply and
  /dismiss; server submissionActions() feeds the cards (like expediteActions). Verified end-to-end; live
  test PO reverted. server.mjs + inject.html.
- Supplier portal feature is now functional end-to-end in the sandbox (admin list → preview → write-backs →
  internal apply). Remaining: the real authenticated /portal page (token→session→same view) with Diviyaj's
  email + secure sessions; optional move of portal_attachments to Storage.

## v20.161 - Supplier portal — Phase 3: write-backs (functional in preview, acting-as)
- The portal preview is now write-enabled (you submit AS the chosen supplier to test). Per PO expand:
  notes thread + post; "Submit to Dock & Bay" forms for completion date, tracking code + carrier, and
  invoice value + document upload. Pending/applied submissions show inline.
- Mixed apply-flow (as agreed): tracking + carrier APPLY DIRECTLY to the PO's shipment (shipments.carrier_ref
  / carrier); completion date + invoice value are STAGED (supplier_submissions, pending) for internal
  one-click apply (Phase 4); notes post immediately. Invoice docs upload to portal_attachments (bytea) and
  serve via /api/supply/portal-attachment/:id.
- Endpoints: portal-note, portal-upload, portal-submit, portal-notes/:sid, portal-submissions/:sid,
  portal-attachment/:id. JSON body limit raised 4mb→12mb for uploads. supplier_id is trusted in the preview
  (acting-as); the real /portal will derive it from the session. Verified end-to-end + cleaned up test rows.
- Next: Phase 4 (staged submissions surface in SUPPLY for one-click apply) + the real authenticated /portal.

## v20.160 - Portal preview: PO status filter pills
- Purchase Orders tab in the portal preview now has status filter pills (one per status present), defaulting
  to show PRODUCTION + SHIPPING. Toggle to show/hide others; a count line shows "N of M". inject.html only.

## v20.159 - Supplier portal — Phase 2: CONFIG ▸ Portal preview
- New CONFIG ▸ Portal sub-tab: pick any supplier from a dropdown and see exactly what they'd see in the
  portal (their data only). Two inner tabs:
  - Purchase Orders — PO ref, status, start/completion/ship dates, shipment, Flexport ref, start-deposit,
    completion (+date), balance (+date), amount due (+due date), deposit ref; expand a row for its SKUs+qty.
  - Deposits — paid / drawn-down / remaining summary cards + per-deposit table.
  Deliberately shows ONLY supplier-facing fields — no cost prices, landed cost, duty/tax/freight. The render
  (ppPOs/ppDeposits) is the same view the real /portal will use; here it's fed by filtering the internal
  endpoints client-side. Read-only for now; write-backs are Phase 3. inject.html only.

## v20.158 - Supplier portal — Phase 1: schema + CONFIG ▸ Portal Users
- MIGRATION 043_supplier_portal.sql (applied to sandbox): supplier_portal_users (approved email↔supplier
  list), portal_magic_tokens (one-time, 7-day), portal_sessions, supplier_notes, supplier_submissions
  (staged write-backs), portal_attachments (bytea). Diviyaj: run 043 on prod.
- New CONFIG ▸ Portal Users sub-tab: add/edit/remove approved supplier logins (email mapped to one
  supplier, case-insensitive unique email), activate/deactivate, and "Magic link" (DEV STUB — returns the
  login URL valid 7 days + copies to clipboard; real email is Diviyaj's for prod). Endpoints:
  /api/supply/portal-users (GET), portal-user-create, portal-user/:id (patch + {_delete}), portal-magic/:id.
- Phases next: 2 = /portal page + scoped read (their POs + deposits); 3 = write-backs (notes, staged
  completion-date/invoice-value, direct tracking+carrier, file upload); 4 = internal one-click apply.
  inject.html + server.mjs.

## v20.157 - CONFIG ▸ Productions: widen Xero account input further
- The Xero account edit box wasn't wide enough for longer values (e.g. "Stock Deposits and Payments for
  P60"); widened it 260→380px (table cap 1080→1200). inject.html only.

## v20.156 - CONFIG ▸ Productions: status dropdown + wider Xero inputs
- Production Status is now a dropdown (blank / ACTIVE / CLOSED) instead of a free-text box. The editTbl
  select matches the current value case-insensitively (existing 'active'/'Closed' map onto ACTIVE/CLOSED;
  blank stays blank) and preserves any out-of-list value rather than coercing it. Saving normalises to the
  chosen value (status field already whitelisted on /prod-number/:id — no server change).
- Edit-row text inputs now honour each column's width, so the Xero code / Xero account boxes are wide
  enough to show their text (were cropped at a fixed 118px). Widened those columns + the Productions table.
  inject.html only.

## v20.155 - CONFIG sub-nav restyled to match REPORTS
- CONFIG's sub-menu (import tax / freight / duty / branches / suppliers / batches / productions / products)
  was using the .pill chip style and read like a filter. Switched it to the same light-blue .rtab underline
  tabs as the REPORTS sub-nav (generalised the level-3 sub-nav CSS to cover #config-subs). inject.html only.

## v20.154 - REPORTS: Flexport moved in + sub-nav restyled
- Moved FLEXPORT under REPORTS (sub-tabs are now What's Next, Pipeline, Payments, Cash Flow, Flexport);
  removed from the top-level SUPPLY nav.
- Restyled the REPORTS sub-nav: it was reusing the .pill chip style and read like a filter. New .rtab
  class — underline tabs matching the level-1/2 menus, in light blue (active text #2563eb, blue underline,
  light-blue tinted bar) — so it clearly reads as a tab level, not a filter. inject.html only.

## v20.153 - SUPPLY: new REPORTS parent tab
- Added a REPORTS sub-tab (right after ACTIONS) that groups the four read-across views as sub-tabs:
  WHAT'S NEXT, PIPELINE, PAYMENTS, CASH FLOW (removed from the top-level SUPPLY nav). REPORTS renders a
  pill sub-nav + a #rep-body; the four reports now render into #rep-body so the sub-nav persists.
  New selectReport(); selectSection() routes the four report keys (and 'reports') through it, so existing
  cross-nav and internal refreshes (e.g. cashflow likely-date save, payments create) stay inside REPORTS.
  Context help resolves to the active report. inject.html only.

## v20.152 - CASH FLOW Copy/CSV + clipboard copies no longer pop up an overlay
- CASH FLOW report: added **Copy** (tab-separated, paste into Sheets/Excel) and **CSV** (download)
  buttons in the toolbar. Both export the currently-filtered lines (month + all filters), columns:
  Date, Month, Type, Reference, Supplier, Market, Amount_USD, Status, Kind, Basis, Class, Due,
  Paid_date, Likely.
- **Copy to clipboard is now direct** — no more "Copy & Paste" overlay/popup. Clicking Copy writes
  straight to the clipboard and shows a short "copied ✓" alert. Applied to the BUY report Copy buttons
  too (downloadReport now uses the same copyText helper instead of showCsvOverlay). The overlay function
  is retained only as the FBA-transfer download fallback. inject.html + artifact_v16.7.html.

## v20.151 - CASH FLOW: flat list, filter by month (not grouped)
- Cash flow is now one flat itemised list (added a Month column), no longer grouped into collapsible
  month sections. New Month + year dropdown filters the list to a single month; defaults to the current
  month (falls back to All if no current-month lines). The summary strip remains a forward 6-month
  overview and reflects all filters except the month picker; clicking a strip card sets the month filter.
  TOTAL footer + count reflect the active filter. inject.html only.

## v20.150 - CASH FLOW sub-tab (UI)
- New SUPPLY ▸ CASH FLOW sub-tab (after PAYMENTS). Itemised payment lines grouped by month, each row:
  date (+ paid/due/likely tag), type (colour badge), reference, supplier, market, amount (USD), status
  (paid ✓ / overdue / due) and an estimate badge showing the basis (shpmt / pool / po).
  - Summary strip: next 6 months, committed vs estimate totals.
  - Month groups collapse (past months collapse by default; current + future open); an "Undated" group
    flags lines with no computable date.
  - Filters: type chips (all 6), status (All/Unpaid/Paid/Overdue), basis (All/Committed/Estimate),
    market dropdown, PO/supplier search. Totals reflect the filter.
  - Overdue, unpaid lines get an inline "likely payment date" picker → saves to /api/supply/likely-date
    and re-buckets the line into that month.
- inject.html only (no server change beyond v20.149). Help content added for the sub-tab.

## v20.149 - CASH FLOW backend: itemised payment line items + likely-date override
- New `/api/supply/cashflow` endpoint re-shapes the PURCHASE ORDERS calc (reused, not duplicated — the
  'cashflow' section shares the PO-calc case block) into a flat list of dated payment lines, each with
  {type, ref, supplier, country, amount, paid, estimate, basis, due, paid_date, date, date_kind, month,
  overdue, likely_date}. Four sources:
  - Supplier goods milestones — Deposit / Completion / Balance (per PO). $0 lines dropped.
  - Referenced-deposit pools — when a PO's start deposit carries a deposit_ref, the PO's own deposit line
    is suppressed and ONE line per reference (from the deposits register, paid=T/F) stands in its place.
  - Freight — due = delivery + 14d. Sized on the assigned SHIPMENT (Flexport ▸ manual ▸ sea cheapest-combo
    ▸ air), else the individual PO's est_freight.
  - Import duty + tax — due = landing (USA = landing + 7d). Σ across the shipment's POs, else per PO.
  - Freight/duty/tax (estimates) are emitted for non-complete POs only; goods milestones include paid history.
- New "likely payment date" (manual) for overdue, unpaid lines: `POST /api/supply/likely-date {line_key,
  likely_date}` (empty clears). When set, the line moves into that month (date_kind='likely'); the original
  due date is retained.
- MIGRATION 042_payment_likely_dates.sql (new table planner.payment_likely_dates). Applied to sandbox.
  Diviyaj: run 042 on prod.

## v20.148 - fix: $0 payments no longer flagged overdue
- The PURCHASE ORDERS payment_overdue flag only checked whether a milestone amount was *unassigned*
  (IS NULL), never whether anything was actually due. So a PO with a 0% deposit term (start_calc=$0),
  or a balance that nets to $0 after deposit+completion, tripped a false "overdue" exception (and a due
  date) in SUPPLY ▸ Actions. Each of the three overdue conditions now also requires its amount > 0
  (start_calc>0 / completion_calc>0 / balance owing >0.01). No migration; server.mjs only — Diviyaj: restart.

## v20.62 - shipment dates override PO everywhere + shipments in WHAT'S NEXT
- Date precedence is now uniform: a linked shipment's dates (delivery/arrival/landing/departure) 100%
  override the PO's ship/landing/delivery overrides; PO overrides only apply when the shipment has no such
  date. Fixed in the PURCHASE ORDERS date chain (eff_delivery now ranks all shipment dates above PO
  overrides; added sh.arrival_date) and the PIPELINE endpoint (was PO-first). This ripples correctly into
  balance-due / check-in dates (payments).
- WHAT'S NEXT: Shipping & Arriving sections now group by 🚢 shipment (units summed across its POs, click to
  open the shipment); Completing stays per-PO. Closes "we need shipments in the whats next report".

## v20.61 - SUPPLY section order
- Moved WHAT'S NEXT and PIPELINE directly under ACTIONS: ACTIONS, WHAT'S NEXT, PIPELINE, PRODUCTIONS,
  PURCHASE ORDERS, ... (the three "overview" views now lead the SUPPLY nav).

## v20.60 - top menu order + labels
- Top menu is now DEMAND · SUPPLY · BUY · FBA · REPORTS (SUPPLY moved to position 2). Renamed PLAN->DEMAND
  and REPORT->REPORTS (data-view keys unchanged). SCENARIO now trails after REPORTS.

## v20.59 - cross-view navigation, WHAT'S NEXT briefing, live re-render, pipeline default
- PURCHASE ORDERS: the assigned shipment is now a link that opens SHIPMENTS with that shipment expanded
  (a small ▾ still reassigns). PIPELINE cards open PURCHASE ORDERS with that PO expanded. Target view
  switches to "All" filter so the row is always found.
- New SUPPLY > WHAT'S NEXT (position 2): a forward calendar by date - which POs are completing / shipping
  / arriving soon, with window (2/4/8wk/all) + market filters; click a row to open the PO. (Reuses the
  pipeline milestone data via GET /api/supply/upcoming.)
- Edits on the PO tab (dates etc.) now invalidate the derived-view caches (pipeline/upcoming/actions/...),
  so those re-render fresh on next visit instead of showing stale data.
- PIPELINE now hides checked-in POs whose arrival is >4 weeks old by default (toggle in the bar).

## v20.58 - PURCHASE ORDERS: PLAN expand panel column-1 labels no longer cut off
- The expand panel's first column (Production start, Production end, Start deposit, Completion, etc.) was
  being squeezed/clipped because only the payment table had a min-width. Added min-width + nowrap to the
  first column of every panel table (order value / payment plan / dates / landed cost); payment-plan col1
  widened to 300px (it carries the label + % input + note). Labels now fully visible.

## v20.57 - PIPELINE: PO lifecycle as a grouped timeline (new SUPPLY view)
- New SUPPLY > PIPELINE (position 3). Every open PO is placed in one stage of its journey
  (Awaiting production -> In production -> Production complete -> In transit -> Arriving <=2wk ->
  Checked in), derived from the date chain + supplier-confirmed production status. Stages are columns;
  cards are ordered by the next milestone and coloured by health (late / due <=7d / on track). Column
  headers total PO count + units + value; market filter pills; click a card to open Purchase Orders.
- Endpoint GET /api/supply/pipeline (stages + per-PO stage/next-milestone/health).

## v20.56 - B2B Allocation scenario: re-analyse on country, verdict, AIR COST
- Switching market now re-analyses (re-fetches stock, recent sales and retail/wholesale price - all
  market-specific); previously the country pill changed nothing after the first run.
- New order-level verdict banner: take it? / take with air-freight (worth it) / decline-renegotiate
  (air cost too high or stock-out risk) / take but watch cover - with net-after-air economics and a
  stock-impact summary (how many SKUs stock out / need rushing / left thin / comfortably covered).
- Renamed "Rush $" to "Air cost" (the airfreight cost to rush in the shortfall) + a "Net after air" KPI.
- SKU column no longer truncates and drops the product name (SKU only).

## v20.55 - Supplier production-confidence layer (migration 028)
- New per-PO production status (Not started / In production / Nearing completion / Complete / Shipped) +
  last-confirmed timestamp (planner.purchase_orders.production_status + production_confirmed_at). Editable
  inline in PURCHASE ORDERS (new Production column) and in ACTIONS; writing stamps the confirmation time
  via /api/supply/po/:po/prod-status.
- New ACTION "Production unconfirmed": completion date <= today+10 (approaching or overdue), status not
  complete/shipped, and no confirmation in 14 days -> chase the supplier. (90 open POs hit this today as
  nothing is confirmed yet + all completion dates are historical; drains as statuses are set.)
- MIGRATION for Diviyaj: 028_production_status.sql (2 columns on purchase_orders).

## v20.54 - Shipment-date ACTIONS
- Two new ACTIONS enforcing "shipments must have dates": "Shipment missing dates" (assigned to live POs
  but no departure/ETA date - inline date fix writes arrival_date) and "Shipment ETA passed" (ETA in the
  past, not marked arrived - inline "Mark arrived" button sets status). Both per-shipment, posting to the
  existing /api/supply/shipment/:ref. Note: 77 linked shipments currently have no own dates (they lean on
  the PO landing override) - surfaces a shipment-date sync gap for Diviyaj's pipeline.

## v20.53 - Slow Moving + Key Arrivals UI tweaks
- Both: removed the product-name subtext under SKU; SKU column explicitly left-aligned.
- Key Arrivals: SHOW pills are now Critical / Tight / All (default Critical, was at-risk/all);
  "tight" risk now renders orange (#ea580c). Summary counts are stable across the risk filter.

## v20.52 - ERP-match hardening (PURCHASE ORDERS + ACTIONS)
- Per-PO ERP match is now 3-state: "✓ in sync" / "⚠ Update ERP (n)" drift / "✗ not in ERP (n)" (lines
  exist but none mirrored from the ERP - never pushed). Previously a never-mirrored PO looked like drift.
- PURCHASE ORDERS shows an ERP-match reconciliation summary across the visible POs (n in sync / drift /
  not in ERP). PO query returns erp_in + erp_total alongside erp_pending.
- New ACTION "PO not in ERP" (high), partitioned from "Order-plan change pending ERP push" so the two
  don't double-list. Note for Diviyaj: erp_po (the ERP PO reference) is null on all POs in the mirror -
  a pipeline gap, not flagged per-PO to avoid 102 false alarms.

## v20.51 - Key Stock Arrivals report (REPORTS sub-tab)
- New REPORTS > Key Arrivals: what is landing soon and how desperately it's needed. Groups upcoming
  arrivals by shipment (or PO if unlinked), each showing the SKUs+quantities on it scored by stockout
  risk: gap = days-to-stockout - days-to-arrival; gap<0 = CRITICAL (out of stock before it lands),
  0-14d = tight. Window pills (1/2/4wk/all), market pills, all-lines vs at-risk-only. Sorted by ETA,
  SKUs by gap. Seasonal forecast demand at destination market (AWD pooled into US); arrival = linked
  shipment date else PO landing. Endpoint GET /api/scenario/key-arrivals. ARTIFACT change - flag for Diviyaj.

## v20.50 - ACTIONS triage: severity sort/pills + inline supplier fix
- Fixed action ordering: High-severity actions now lead (was sorting "amber" above "high" alphabetically,
  burying the 122 high items below 31 amber). Added a severity summary line + High/Amber filter pills
  (with counts) above the type pills; type pills now recount within the selected severity.
- "PO missing supplier" (the largest bucket) is now inline-fixable: pick a supplier from the datalist and
  Apply -> POSTs /api/supply/po/:po/supplier (sets name + resolves supplier_id so terms apply). No more dead-end.

## v20.49 - Slow Moving seasonal velocity + Auto Forecast tunable cover/freight
- Slow Moving: new VELOCITY basis toggle - Trailing actual (last 13wk sales) vs Forecast (seasonal),
  the latter using the saved SKU forecast over the next 3 months so off-season lines aren't mis-flagged.
  Velocity, cover weeks and the cover filter all follow the selected basis.
- Auto Forecast: cover target (months, 1-12) and freight+duty (%) are now editable inputs that re-run
  the plan, instead of fixed 2-month / 15% constants.

## v20.48 - Slow Moving: pool US AWD into FBA stock
- AWD (Amazon Warehousing & Distribution, US-only upstream) is now pooled into the us_fba line - it
  feeds FBA and is the same stock pool. On-hand = us_fba available + products.awd_us, with an "incl AWD"
  note on the row; cover/value reflect the combined pool. AWD-only SKUs (FBA=0) stay visible.

## v20.47 - Slow Moving report (REPORTS sub-tab)
- New REPORTS > Slow Moving: per SKU x warehouse stock health - on-hand, trailing 13-week velocity,
  weeks of cover, days since last sale, cash tied up. Adjustable "slow if" thresholds (cover wks /
  days-since-sale / velocity / min units, blank=ignore, no-recent-sales counts as slowest) and
  Market (UK/US/EU/AU/CA) + Warehouse (3PL/FBA) pills; live client-side filtering. Sorted by cash
  tied up. Endpoint GET /api/scenario/slow-moving. AWD omitted (no AWD stock location in inventory).
  ARTIFACT change - flag for Diviyaj.

## v20.46 - Auto Forecast report (REPORTS sub-tab)
- New REPORTS > Auto Forecast: a 12-month buy plan by subcategory x primary supplier (forward-cover
  netting on the saved SKU forecast, net of on-hand stock; order month = arrival - lead time) plus the
  resulting Payments plan (starting/completion/balance deposits + freight+duty est, cash out by month).
  Market pills (All/UK/US/EU/AU). Endpoint GET /api/scenario/auto-forecast. Freight is a flat 15% uplift
  (precise landed cost stays on the PO view); cover target 2 months. ARTIFACT change - flag for Diviyaj.

## v20.45 - payments report: actual paid currency + amount input (alt currency)
- The Payments report now lets you record the actual paid currency (GBP/EUR/AUD/USD) + amount per
  payment (date x supplier), stored in planner.payment_fx (migration 027) and shown next to the USD total.

## v20.44 - create a deposit inline from a production
- In a production's deposit section: "+ create deposit" auto-creates + assigns a deposit. Reference =
  {prod_no}-{supplier code}-{n} (e.g. P54-XR-1); amount defaults to 30% of production value LESS deposits
  already assigned; date = today. All editable afterwards in the Deposits register. New endpoint
  production-deposit-create. ("assign existing" still picks an existing deposit.)

## v20.43 - deposits: newest-first, close status, to-assign/closed/all pills
- Deposits sorted newest->oldest (new deposit, no date yet, lands on top). Per-row Close/Reopen
  (manual status); To assign / Closed / All pills (default To assign = not closed). Migration 026
  adds deposits.status. Productions list already has Active/Completed/All pills.

## v20.42 - DEPOSITS under PRODUCTIONS; production detail grouped + EAN + CSV
- DEPOSITS is now a sub-tab under PRODUCTIONS (Productions | Deposits); removed from the top subnav.
  PRODUCTIONS moved to position 2 (after ACTIONS). In the Deposits sub-tab each deposit can be
  assigned to a production inline (production picker) + shows assigned production(s).
- Production detail: SKUs sorted by SKU and grouped under category sub-headings, with an EAN column
  and an "export CSV" button (SKU, quantity, EAN, category) per production.

## v20.41 - Payments report (grouped by date + supplier; makeup + alt-currency)
- The PAYMENTS > Payments tab is now a read-only report: each payment grouped by DATE + SUPPLIER with
  its makeup (Deposit / Completion / Balance / Other) + USD total + the actual paid currency/amount
  (GBP/EUR/AUD where recorded). Starting deposits excluded (they're allocations, not cash).
  New /api/supply/payments-report.

## v20.40 - tab reorg: DEPOSITS standalone, Other Payments under PAYMENTS, drop DEPOSITS & OTHER
- DEPOSITS is now its own tab showing only the deposit register (is_deposit). PAYMENTS has two sub-tabs:
  Payments (the deposit/completion/balance register, grouped by run) and Other Payments (sundry costs,
  is_deposit=false, editable + add). Removed the combined "DEPOSITS & OTHER" tab.

## v20.39 - PRODUCTIONS per-supplier + deposit assignment
- A production is now per supplier (prod_no x supplier): P54 with 4 suppliers = 4 productions.
- Assign deposits to a production in the PRODUCTIONS expand (deposit picker) -> planner.production_deposits
  (migration 025). Expand shows assigned deposits (with unassign) + SKU rollup + POs.
- Migration 025 also adds payment_transactions.paid_currency/paid_amount (alt-currency, for the payments
  report). Run on live: migrations/025_productions_payments.sql.

## v20.38 - DEMAND SKU planner: red flag for forecast with no stock [artifact edit]
- In the SKU-level planner, a forecast month is shaded light red when there's demand but no stock to
  cover it: projects on-hand (per channel's warehouse) + timed inbound (ETAs) forward; a month whose
  running balance is <= 0 with a forecast > 0 is flagged. Colours the override input + final forecast
  cell. Visibility only - does not change/remove the forecast.

## v20.37 - SCENARIO: B2B Allocation planner
- New B2B Allocation tool: enter client/date/market + SKU,qty lines -> per line shows available stock,
  fulfil now / shortfall, cover weeks after fulfilling, recommendation (Give / Caution / Don't give /
  Short+rush), airfreight rush cost (shortfall x unit weight x $10|£7 per kg toggle), wholesale (50% of
  ex-VAT retail), order revenue and gross margin (vs avg PO cost). KPI summary on top. New /api/scenario/b2b.

## v20.36 - Financial Forecast Model refinements
- Inputs are now grey inline (dashed underline, default 0%) instead of blue boxes; growth & price
  change are their own labelled rows per category ("growth" / "price change" in column 1).
- Summary totals (revenue/units/YoY) moved to a KPI bar on top of the table; revenue shown as integers.
- New "Import growth from demand plan" button: sets each category x quarter growth % from the demand-plan
  category forecast (actuals + forecast_outputs vs last-year actuals), persisted. New POST fin-model-import.

## v20.35 - availability fix: explicit SKU_CHILD flags + corrected view (bug 1) [DB + data]
- Authoritative availability now = the 12 explicit available_<co>_<ch> flags (from SKU_CHILD) AND
  launch/discontinue dates. Recreated v_product_availability to read the flags with a case-insensitive
  country join (the old uppercase-vs-lowercase join made is_available false for ALL 722 SKUs -> the
  planner never gated -> unavailable SKUs showed). Added 12 boolean flag columns + au_rt/ca_rt; AWD
  (awd_us) sourced from inventory_us_awd. Sandbox loaded from SKU_CHILD (959 rows). Migration:
  024_availability_flags.sql. Now is_available true = 2823 (was 0); e.g. TOWLB-CAB-LG-BLUE-SS24 is
  UK-FBA only (not UK-DTC), so it drops out of the UK/DTC plan.

## v20.34 - SUPPLY: PRODUCTIONS view (POs aggregated by PROD#)
- New PRODUCTIONS sub-tab: lists each production (POs grouped by prod_no) with supplier(s), PO count,
  total units/value, deposits, status; Active/Completed/All filter + search. Expand a production to
  see SKU x total qty aggregated across all its POs and the POs in it. Read-only (Phase 1 of the
  larger productions/deposits/payments rework). New /api/supply/productions + production-detail.

## v20.33 - fix BUY/FBA core-seasonal filter (+ retail-price migration prep) [artifact edit]
- BUY & FBA core/seasonal/non-core pills did nothing because the filter compared against the
  collapsed C/S code. Server now sends the full classification (_SKU_RAW.p[sku].csf = Core/Seasonal/
  Non-Core) and the filters use it, matching the pill values. Migration 023 (retail prices uk/us/eu_rt,
  B2B prep) added.

## v20.32 - SCENARIO: Financial Forecast Model (quarterly FY, persisted)
- New Financial Forecast Model: per category x market x FY (Mar-Feb), quarterly columns. Shows last
  year's actual units/revenue, editable % growth + % price change per quarter -> projected units/rev,
  FY rollup + YoY in PS and units. Persists to planner.financial_model (migration 022). FY26/FY27,
  market pills. Also added products.prod_weight_uk (B2B prep). Migration: 022_financial_model.sql.

## v20.31 - AWD wired into Prime Day (products.awd_us)
- Added products.awd_us (migration 021; from SKU_CHILD). Prime Day now shows real AWD (US-only)
  inventory in the AWD column + KPI for the US / All-markets views (n/a for other markets).
  Migration to run on live: migrations/021_awd_us.sql.

## v20.30 - SCENARIO tab scaffold + Prime Day inventory
- New SCENARIO top-nav tab (injected, parallel to SUPPLY) with sub-tabs Prime Day / B2B Allocation /
  Financial Forecast Model. Prime Day: filter by SKU list / category / market -> available inventory
  split by FBA / 3PL (AWD not yet loaded into product_inventory) + KPI totals. New /api/scenario/prime-day.
  B2B Allocation + Financial Forecast Model are placeholders (next).

## v20.29 - Exec Summary on Mar-Feb financial year [artifact edit]
- Exec Summary cards now show FY26 (Mar25-Feb26, actual) vs FY27 (Mar26-Feb27, actual+forecast)
  with YoY; the monthly table reorders to FY months (FY27 Mar26->Feb27 + FY28 partial to Dec27)
  with FY totals. FY26 derived from prior-year values carried on FY27 months. Artifact edit.

## v20.28 - REPORTS sub-tabs (Exec Summary / Slow Moving / Auto Forecast) [artifact edit]
- REPORT view now has a sub-tab bar; Exec Summary is the default (unchanged behaviour). Slow Moving
  and Auto Forecast are added as tabs with placeholders (full reports next). EDITS THE ARTIFACT
  (renderReportView + REPORT_VIEW state) - flag for Diviyaj.

## v20.27 - PLAN payment column fits labels
- The payment-plan first column (Start deposit / Completion / Balance) no longer wraps/clips:
  min-width 235px + no-wrap, table widened so full labels and descriptors show.

## v20.26 - final invoice input sizing
- Final invoice amount field is now a compact, left-aligned 120px input (fits up to 10000000.00).

## v20.25 - deposit ref as searchable popover (like the shipment picker)
- Deposit ref on the PO grid and in the PLAN panel is now a searchable popover (search reference /
  supplier, shows remaining; "No deposit" option) instead of a plain combo. Light-red when a deposit
  is required but unassigned.

## v20.24 - final invoice amount overrides the estimate
- New "Final invoice amount" input in the PLAN panel (saves to supplier_invoice_total). When set it
  trumps the order-plan estimate for every payment milestone and the landed-cost goods value.
- The PO grid value cell shows a green "final" badge when the final invoice is in use.

## v20.23 - deposit-ref colour/no-deposit + left-aligned Status
- Deposit ref shows light red when a deposit is required (supplier start% > 0) but none is assigned.
- "NO DEPOSIT" is a selectable choice; when supplier terms require no deposit (start% = 0) the field
  defaults to "no deposit" and is not flagged.
- Status dropdown is left-aligned.

## v20.22 - PO grid: sticky PLAN+PO columns; ERP read-only sync status
- Column 1 (PLAN) and column 2 (PO) are now frozen on horizontal scroll.
- ERP column is read-only: shows "in sync" when planned quantities match the ERP, or an
  "Update ERP (n)" button when order-plan lines differ (pushes via the existing upload).

## v20.21 - bulk PO upload (paste CSV/TSV)
- New "Upload POs" button on PURCHASE ORDERS opens a paste-import modal (CSV or tab; optional
  header). Recognised columns: PO, Supplier, Ship to, Branch, Status, Start. Creates new POs
  (resolving supplier_id), skips existing PO numbers, and reports created/skipped/errors.

## v20.20 - PO->shipment assign popover (create master + search)
- The PO Shipment cell opens a popover: make this PO a master shipment, join an existing shipment,
  or pick another PO that becomes the master. Searchable across shipments and POs; unassign too.

## v20.19 — Shipments tab: PLAN button, clearer alerts, editable carrier/ref
- Column 1 is now a **PLAN** button (was a bare arrow).
- The alert now says why (unlinked / overdue) with a full-reason tooltip.
- **Carrier** and **Carrier ref** are editable on the main grid (carrier ref keeps a Flexport link).

## v20.18 — dates displayed as dd-mmm-yy across SUPPLY
- All read-only date displays now render as dd-mmm-yy (e.g. 18-Jun-26): PO grid, PLAN panel
  (payment due dates + date chain), Shipments, Flexport, Payments run headers, Order Plan column
  headers, and all generic tables (linked records / suppliers / batches). Editable date pickers
  keep the native control (browser locale).

## v20.17 — Ship-to calculated from branch (override in PLAN) + country filter pills
- **Ship to** is now derived from the PO's branch country, read-only on the grid (M tag if
  overridden). The override moved to the **PLAN** panel (blank = use branch). Effective country
  drives the landed-cost duty/tax/freight lookups.
- New **Ship to** country filter pills (UK/US/AU/EU/CA/Direct, with counts) — OR within, AND with
  the progress + action-item filters.

## v20.16 — PO grid: read-only final dates + Delivery/Completion; editable in PLAN; create new PO
- Main grid dates (Start / End / Ship / Delivery / Completion) are now **read-only "final" dates**
  with source tags (M/FLEX/S/calc). **Landing replaced by Delivery**; **Completion = Delivery + 7d**
  (stock check-in — the date for Fulfil/Cin7 as their delivery date).
- Date **overrides moved into the PLAN panel** (production start/end, ship, delivery — editable;
  completion auto). Saving ripples the chain.
- **Supplier is editable** inline (resolves supplier_id so terms/lead apply).
- **+ New PO** button creates a purchase order (PO number, optional supplier); fill the rest inline.

## v20.15 — PO Branch + lead-time date chain; Branches in Settings
- New editable **Branch** column on the PO (picker from the branches table).
- **Auto date chain** (each step falls back to better info): production end = start + supplier
  production_days; ship = production end + 7d (unless shipments/Flexport departure); landing =
  ship + branch sea-lead (unless shipments/override/Flexport). Source tags: M / FLEX / S / calc.
  Balance-due and the action-item flags now follow the effective ship/landing dates.
- **Branches** table surfaced in SETTINGS (country + sea/air lead days + notes), editable.
- No migration — branches table + suppliers.production_days already existed.

## v20.14 — PURCHASE ORDERS: editable "Ship to" country
- New **Ship to** column on the PO row: a dropdown of UK / US / AU / EU / CA / Direct to Client,
  saving to country_code. Setting it drives the landed-cost freight/duty/tax (and tax/duty cards).

## v20.13 — Order Plan grid: labels in column 1, smaller PO text, wider SKU column
- Prod / Ship / Arrive labels now appear once in the column-1 header (aligned to those rows) instead
  of repeating on every PO column — PO columns just show the dates.
- PO number text reduced to 12px.
- SKU column widened (min 240px) and set to no-wrap so SKU names always fit.

## v20.12 — "to proceed" prompts in bright green
- The needs-input cues in the PLAN landed-cost panel (set country / duty % / freight) are now
  bright green (was muted grey) so the actions required to complete a calc stand out.

## v20.11 — import-duty rate card (category x destination)
- New editable **Import duty card** in Settings (product category x destination country), seeded
  with dummy textile defaults (UK/EU 12%, US 9%, AU 5%, CA 18% — flagged "verify").
- Landed-cost duty now falls back to this card when a product has no explicit duty %; a product-
  specific duty % still overrides. So duty (and the landed total) populate as soon as a PO has a
  country + lines.
- **Migration to run on live: migrations/020_duty_rates.sql**

## v20.10 — landed-cost estimate in the PLAN panel
- PLAN panel now shows a **Landed cost (est)** block: container-size selector + goods, freight
  (Flexport quote where linked, else the rate card — source tagged), import duty (Σ line value ×
  product duty% for the PO country), import tax (country rate on the landed/goods base), and the
  landed total. Changing container size ripples freight & tax.
- PO query computes these from the v20.9 rate cards + product duty% + PO country_code/container_size.

## v20.9 — SETTINGS tab: landed-cost rate cards (foundation)
- New **SETTINGS** sub-tab: editable **Import tax** rates by destination country (rate + base) and a
  **Freight** rate card by destination × container size (+ Row to add). All save inline.
- Schema (migration 019): planner.import_tax_rates, planner.freight_rates; product_countries.duty_pct
  (per-product per-country import duty); purchase_orders.container_size. Seeded tax (UK/EU/US/AU/CA)
  + a blank freight grid to fill in.
- Sets up the landed-cost calc (goods + freight + duty + tax) wired into the PLAN panel next (v20.10).
- **Migration to run on live: migrations/019_landed_cost_settings.sql**

## v20.8 — PURCHASE ORDERS action-item pills
- New toggle quick-filters: **Payment overdue**, **Late**, **Unassigned shipment**, **Production**
  (each shows a count; they AND together and with the progress filter). Flags computed server-side
  vs current_date: late = landing past & not complete; overdue = any milestone past-due & unpaid;
  unassigned = no shipment & not complete; production = status contains "production".

## v20.7 — PURCHASE ORDERS: PLAN button + editable payment plan
- Column 1 is now a compact **PLAN** button (was a wide arrow); PO table sizes to its content so
  columns no longer squish. Added a **Ship** column (date + source tag) and a **master** badge on
  the shipment cell.
- **PLAN panel** = editable payment plan per PO: Start deposit / Completion / Balance (+ Balance 2
  auto when balance 1 is partial). Each milestone shows the calc/est, an override **amount**, a
  **date**, and (start) a **deposit-ref** picker with remaining-availability. **% terms** for start
  & completion are editable per PO (override blank = supplier terms). Due dates auto from PO/ship
  dates + supplier credit. Saving re-pulls the PO so catch-up & owing ripple.
- Status badges: a start deposit drawn on a deposit ref shows as covered (not a cash due).
- New per-PO override columns (migration 018): start/completion %-override + balance-2 amount/date.
- **Migration to run on live: migrations/018_po_payment_overrides.sql**

## v20.6 — Order Plan header tidy
- Status/Country filter pills now have breathing room (gap between them).
- PO number in the column headers is larger; PROD / SHIP / ARRIVE dates split onto 3 lines.

## v20.5 — partial-carton icon ½ → p
- Order Plan: the half-carton partial markers now read **p** / **p ✓** (was ½). Annotation updated.

## v20.4 — Deposits & Other reload + editable; ACTIONS apply-before-clear
- **Deposits keyed by surrogate id** (migration 017): `reference` is no longer unique — handles the
  159 "Other" sundry payments (no ref) and the 12 deposit refs with installments/credit-notes/
  write-offs. Added xero_account_code. Sandbox reloaded from the full working list (322 rows).
- **DEPOSITS tab**: supplier is now a selectable combobox; reference/description/prod#/amount/date
  all editable; **+ Deposit** / **+ Other payment** create rows. "Other" payments show no FX /
  Used / Remaining / POs (no pool concept). Deposit Used/Remaining are pooled across rows sharing a
  ref (so credit-notes net correctly); PO-assigned is calculated from the POs pointing at the ref.
- **ACTIONS**: entering a fix value no longer auto-commits and vanishes — an explicit **Apply**
  button commits, the card stays marked ✓ for verification, and **↻ Refresh** clears resolved ones.
  "Deposit not paid" now only fires for real deposits (not Other); over-assigned check is pooled.
- Removed the bottom-right floating SUPPLY button (top-nav tab is the single entry point).
- **Migrations to run on live: migrations/017_deposits_surrogate_key.sql** (deposits data on live
  comes from the ERP/n8n, not this CSV).

## v20.3 — interactive Shipments (real planner.shipments table, dates override the PO)
- New `planner.shipments` table (migration 016): shipment_ref, master_po, carrier, carrier_ref,
  departure/landing/delivery/arrival overrides, status, notes. Seeded from existing shipment_refs.
- SHIPMENTS tab is now fully editable: per-shipment carrier/ref/status/notes + four date OVERRIDES
  (a shipment date wins over the PO's landing/delivery — precedence Shipment ▸ PO override ▸ Flexport).
- Expand a shipment to edit it, see POs aboard, mark a **master** PO, or **unassign** a PO.
- **+ New shipment** and assign **Unassigned POs** (combobox) create/wire shipments live.
- PO list landing now shows source tag **S** (shipment) ▸ M ▸ FLEX; balance-due uses shipment departure.
- New endpoints: POST /shipment/:ref (upsert), /shipment-create, /shipment/:ref/assign. lookups feed
  shipment refs from the new table. **Migration to run on live: migrations/016_shipments.sql**

## v20.2 — ACTIONS pills + inline fixes; PO Batch/PROD#/Shipment selectors
- ACTIONS grouped with **type pill filters**; each card has an **inline fix** (date picker, shipment
  combobox, Upload-to-ERP, or Open-in-Order-Plan) wired to the existing endpoints; list refreshes after.
- PURCHASE ORDERS: **Batch** column (combobox from batches), **PROD#** now a combobox (from prod_numbers),
  **Shipment** now a combobox (from existing shipments). New /api/supply/lookups feed.

## v20.1 — FBA: exact Amazon upload format, split clear buttons, multi-SKU filter
- **FBA Transfer Upload** now outputs Amazon's EXACT send-to-Amazon template (tab-separated): US/CA
  template (Expiration/Lot, in/lb) vs UK/EU/AU template (Prep/Labeling owner + Default…Seller rows,
  cm/kg). Rows = SKU, qty, blanks, units/box, #boxes, box L/W/H/weight. Carton dims from
  sku_labels (migrations 015) injected as window.FBA_DIMS.
- **Clear buttons split**: Override "Clear all" clears only override numbers; new **Clear** under the
  Ship header clears only the tick boxes (alongside Select all).
- **SKU filter accepts a list** (paste many SKUs, space/comma separated) and the box is widened.

## v20.0 — FBA tab: Create-FBA-Shipment button + per-category select-all
- **Create FBA Shipment** button in the FBA toolbar — popup "Feature to build - Direct created
  shipment in Amazon FBA" (placeholder, no function yet).
- Each category header row in the FBA transfer table has a **[ select all ]** link that ticks every
  row in that category (within the current filter). (Artefact edits.)

## v19.9 — FBA tab tweaks (⚠ edits the artefact, not just the harness)
- FBA view **defaults to Transfer FBA** (was All).
- "Selected: N units · N cartons" summary **moved left** beside the FBA Transfer Upload button
  (removed margin-left:auto).
- **Select all** button added under the **Ship** column header (ticks every visible transfer row).
- NOTE: these are 4 small direct edits to artifact_v16.7.html (FBA logic lives there) — first time the
  artefact itself is modified; flag to Diviyaj. Next: FBA upload sheet → downloadable text in correct format.

## v19.8 — Order Plan: clearer empty cells + working partial-carton approval
- 0-qty cells now render **blank/faint** (no blue box) — populated cells stand out; cells stay
  click-to-edit (border appears on hover/focus).
- Partial cartons: the cell is **highlighted amber** when unapproved with a clear **"½ ✓" approve
  button**; once approved the cell turns **green (½✓)**. (ACTIONS + Unapproved-partials filter unchanged.)

## v19.7 — PO tab polish: deposit-ref combobox, date pickers, 2dp currency
- Deposit ref is now a **type-ahead combobox** (datalist of deposit references — type to filter or pick).
- Date cells use a **native date picker** and remain typeable (input type=date).
- **All currency values show 2 decimal places**; unit/pallet counts stay whole.

## v19.6 — Order Plan: category grouping, SKU scope, release window, partial-carton approval
- SKU rows **grouped by category** (sub-headers). **SKU scope**: Ordered vs **All in category**
  (pulls the SKU master so you can add any SKU in a category to a PO). **Release-window filter**.
- **Partial cartons**: amber ½ on partial-qty cells with a green **✓ approve** tick → sets
  partial_carton_approved (shows ½✓). **Unapproved partials** filter pill; pending approvals already
  surface in ACTIONS. New: /api/supply/skus, po-line/:po_sku/approve; sku_labels.release_window (mig 014).

## v19.5 — Order Plan UX: editable blanks, PO filter, pallet exception, smarter Upload
- **Every cell is editable** (blank cells start at 0; editing creates the line via upsert — add a SKU
  to a PO). **SKU column widened & always visible** (sticky, min-width). **Filter by PO number**.
  **>20 pallets flagged red ⚠** in PO + totals. **Upload button shows only when that PO has pending
  changes** (qty ≠ ERP). po-line endpoint is now an upsert.

## v19.4 — Order Plan proposed-change persistence + Flexport active/completed + links
- Order Plan now records **source of truth (erp_qty) vs proposed (qty)** with **proposed_at/by** stamps
  (migration 013); a proposed change persists until Upload pushes it and erp_qty aligns. Pending
  changes surface in **ACTIONS** ("Order-plan change pending ERP push") so they aren't forgotten.
  (ERP re-sync must update erp_qty but preserve a still-pending proposed qty — documented for the ETL.)
- **FLEXPORT** split into **Active / Completed** (by arrival date) with filter pills; the **Flexport
  reference is now a clickable link** to app.flexport.com/shipments/<id>.
- Migration to run on live: 013_orderplan_proposed.

## v19.3 — Order Plan: production default, pills, dates/pallets, editable qty + ERP upload
- Default view = **Production status**; **Status & Country as multi-select pills** (+ All); PROD#/Category dropdowns + SKU search.
- PO column headers now show **production start→end, ship, delivery dates, units and pallets**
  (pallets = Σ qty/pallet_qty; `pallet_qty` added to sku_labels, migration 011/012).
- **Editable qty cells**: a cell turns **red when it differs from the ERP value** (`erp_qty`, mirrored
  from Cin7); per-PO **⬆ Upload** button pushes planned qtys to the ERP (sets erp_qty:=qty, logs to
  etl_runs). Endpoints: POST /api/supply/po-line/:po_sku, POST /api/supply/po/:po/upload.
  NOTE: the real ERP API write is the gated Diviyaj integration; this stages + clears the mismatch.
- Migrations to run on live: 011_sku_pallet_qty, 012_orderplan_erp_sync.

## v19.2 — Order Plan side-by-side grid (filter + group)
- ORDER PLAN rebuilt as the spec's side-by-side view: **SKU rows × PO columns**, qty in cells,
  per-SKU total column and a **PO TOTALS** (units / value) row. Filters by **PROD# / Country /
  Status / Category + SKU search** (defaults to the busiest PROD# to keep the grid readable).
  Partial-carton cells flagged ½. Endpoint enriched with po/country/category metadata.

## v19.1 — Live USD recompute on payment runs
- Editing a run's bank amount / FX now recomputes the **USD equivalent** and the **matches-legs**
  badge instantly (was on reload). Saves still persist on change via run-meta.

## v19.0 — Shipments master-shipment model (Flexport-fed)
- SHIPMENTS rebuilt: POs grouped by `shipment_ref` (master PO), with PO count / suppliers / units /
  value, **Flexport-fed dates** (departure / landing / arrival; landing precedence M ▸ FLEX), Flexport
  ref + freight. Filters Active / Completed / Exceptions / All. Expand a shipment → **POs aboard**
  (`GET /api/supply/shipment-detail/:ref`, master first).
- **Unassigned POs** section with an inline "assign to shipment" field (writes `shipment_ref` via the
  PO endpoint) — turning the "unassigned shipment" exception into a one-field fix.

## v18.9 — ACTIONS enriched (over-assigned deposits, partial cartons)
- ACTIONS now also surfaces **Deposit over-assigned** (assigned start deposits exceed the pool) and
  **Partial cartons need approval** (in-progress PO lines that aren't a full carton multiple and
  aren't yet approved), alongside date conflicts / unassigned shipments / missing supplier / unpaid deposits.

## v18.8 — Full order plan mirrored from Cin7
- `purchase_order_lines` now loaded from the **Cin7 OrdersExport** (migration 010): 4,481 lines
  across 236 of 256 POs. Rows with no SKU/QTY (landed costs) excluded; qty summed per (po,sku).
- **value-est now lights up for 236 POs** (was 1) → milestones/catch-up/balance compute across the book.
- carton size sourced from `sku_labels` via the view (Cin7 has none); `partial_carton_approved` kept as our overlay.
- Migration to run on live: `010_cin7_order_lines.sql`. NOTE: production should **sync from Cin7/Fulfil
  via n8n**, not a static seed. Future: **bidirectional** — pull from ERP + **push planned-PO updates
  (dates/price/sku/qty) back to the ERP when the supplier invoice deltas** (Diviyaj-wired; live writes gated).

## v18.7 — Payment catch-up + credit-type balance dates
- **Catch-up calc:** completion = (start% + completion%) × value − **actual start-deposit assigned**,
  so completion tops up to the cumulative target when the assigned deposit differed from straight
  start%. `catch_up` surfaced in the PO payment schedule.
- **Balance due by credit type:** `on shipment` → ship/Flexport departure + credit days;
  `on clearance` → landing + credit days.
- **Guard:** when a PO's value is unknown (no order-plan lines and no stored estimate), completion /
  balance / catch-up are shown as blank rather than misleading negatives.

## v18.5 — FIX: SUPPLY never rendered (string-replace `$'` corruption)
- Root cause of the tab not appearing at all: the inject was spliced via
  `html.replace('</body>', … + SUPPLY_INJECT + …)`. The injected JS contains `$'` (e.g.
  `legs $'+money(total)`), and in `String.replace` the replacement string treats `$'` as
  "everything after the match" — so `$'` was rewritten to the document tail (`</html>`),
  producing invalid JS → `Uncaught SyntaxError` → the whole inject aborted (no nav button, no
  floating button). Fixed by using a **function replacement** (`() => tail`), which disables all
  `$` substitution. Verified the *served* script now passes `node --check`.

## v18.4 — Bulletproof SUPPLY entry point
- Decoupled builders: `ensureRoot` / `ensureNavButton` / `ensureFloat`. SUPPLY now works even if the
  nav can't be augmented — a fixed **floating "SUPPLY ▸" button** (bottom-right, z-index 99999) is
  always added to `document.body` and opens the panel. Root is built on demand.
- Console beacon `[SUPPLY] inject vX executing` to confirm the script runs in the browser.
- All builders wrapped in try/catch; multi-trigger boot retained.

## v18.3 — Fix: SUPPLY tab sometimes didn't appear
- Bootstrap was gated solely on `DOMContentLoaded`; if that had already fired (or fired oddly with
  the 5 MB artefact) `init()` never ran. Now idempotent (guards on `#supply-btn`) and triggered on
  immediate call + DOMContentLoaded + load + timed retries. Verified headlessly (jsdom).
- `GET /` now sends `Cache-Control: no-store` so the browser never serves a stale page.

## v18.2 — Fix deposit drawdown basis
- Drawdown `used` now sums **assigned** start deposits (`pay_start_deposit_assigned`) per spec B8.6
  ("pool depletes by start-deposit assignments only"), not the start%×value estimate across all
  linked POs (which over-counted and produced negative remaining).

## v18.1 — Deposit drawdown + estimated payment dates now CALCULATED
- **Deposit drawdown** is computed, not stored: `used` = Σ start-deposit (start% × PO value) of the
  POs assigned to each reference; `remaining` = amount − used (spec B8.6).
- **Estimated payment dates** computed per PO: start due = prod start, completion due = prod end,
  **balance due = landing + supplier credit days** (credit type shown).
- PO expand now shows a **calculated payment schedule** (milestone · est amount · due · source —
  start deposit shows which deposit reference it draws on).

## v18.0 — Payments engine + DEPOSITS & OTHER split
- **Payments engine:** transactions roll into **date-grouped runs**. Each run header is editable
  (bank / paid currency / bank amount / FX) and computes the **USD equivalent** (bank amount × FX)
  with a **matches-legs ✓** check vs the run's leg total. Leg amount/date editable. Export for Xero
  (CSV) carries run bank/ccy/FX. New table `migrations/009_payment_run_meta.sql`; upsert via
  `POST /api/supply/run-meta/:date`.
- **DEPOSITS tab → "DEPOSITS & OTHER"** with sub-pills (Deposits / Other / All) driven by the CSV's
  `is_deposit` flag (20 deposits, 25 other); Type badge + Description column added.
- Migration to run on live: `009_payment_run_meta.sql`.

## v17.2 — SUPPLY restyled to native artifact look + PO refinements
- **Restyle:** SUPPLY now uses the native palette (system font, `.pill` filters, `.tw` tables,
  `tool-badge`, `.fci` editable cells, `.src` FLEX/M badges, `.annot` banners), scoped under
  `#supply-root` so it matches the other tabs and can't clash with the artefact.
- **Status colour-coded** everywhere (PO status is a colour-tinted dropdown; status columns render
  as coloured badges).
- **Deposit ref is now a lookup** (dropdown of `deposits.reference`), not free text.
- **Value est = Σ(qty × cost_price) from the order-plan lines** (falls back to the stored estimate
  where a PO has no lines yet; ∑ vs est marker shown). Milestone splits derive from it.
- **Flexport linking** — migration `008_po_flexport_link.sql` adds `purchase_orders.flexport_reference`
  (60 POs; 39 match a Flexport row). **Landing date imports from Flexport** (`FLEX` badge) unless
  manually overridden (`M`).
- Migrations to run on live: `008_po_flexport_link.sql`.
- NOTE: a real **payments engine** (runs/batches, catch-up, FX → Xero) is still to build — next.

## v17.1 — PURCHASE ORDERS management engine (inline edit + linked tables)
- PURCHASE ORDERS is now **inline-editable**: status (dropdown), prod start/end, landing, value est,
  deposit ref, shipment, ERP — each cell saves on change via `POST /api/supply/po/:po`
  (whitelisted/parameterised; targets the configured DB = sandbox).
- **Default filter = In progress** (everything not COMPLETE/FUTURE; 45 POs); pills In progress /
  Future / Complete / All.
- **Tables now linked**: expand a PO to load its related records via `GET /api/supply/po-detail/:po`
  — lines, deposit, payments (matched on po_completion/po_balance), and Flexport (by shipment name).
- CSV export respects the active filter.

## v17.0 — SUPPLY built out to the mockups (PO list, FLEXPORT, ACTIONS, editable Payments/Deposits)
- **PURCHASE ORDERS** rebuilt to mockup spec: status-badge column, Prod start/end, Landing, Value est,
  and **computed payment milestones** (Start dep / Completion / Balance from supplier terms × value),
  Deposit ref / Shipment / ERP / PROD# columns, status filter pills, search, **expandable payment
  schedule** per PO, and a **CSV for Fulfil** export.
- **ACTIONS** = the exceptions list (date conflicts, unassigned shipment, missing supplier, deposit
  not paid), grouped by type with severity.
- **FLEXPORT** new sub-tab + table — `migrations/007_flexport.sql` (`planner.flexport_shipments`, 121
  rows; `shipment_name` links to `purchase_orders.po`).
- **PAYMENTS & DEPOSITS** now have **editable input fields** (txn actual amount/date; deposit
  amount/FX/date paid) that **save to the DB** via `POST /api/supply/deposit/:reference` and
  `/api/supply/payment-txn/:id` (whitelisted fields, parameterised). Writes target the configured
  DB — currently Ben's sandbox.
- New migration to run on live: `007_flexport.sql`.

## v16.9 — SUPPLY polish + PLAN→DEMAND rename
- SUPPLY tab now hides the demand/buy filter row (Country, Channel, Category, SKU, sort, dates)
  and the plan/buy tool-bar — they belong to DEMAND/BUY only. Kept intact on those tabs.
- Top-nav **PLAN renamed to DEMAND** (spec B3.1), relabelled at serve time (artefact untouched).

## v16.8 — SUPPLY tab (Production Planner), Phase 2 data layer
- **New: SUPPLY top-nav tab** (Production Planner) on the current Express stack, with sub-tabs
  ACTIONS · PURCHASE ORDERS · ORDER PLAN · SHIPMENTS · PAYMENTS · DEPOSITS · SUPPLIERS · BATCHES · BARCODES.
  Implemented as a self-contained overlay injected by the harness — the artefact HTML is untouched.
- **New files:** `supply/inject.html` (the SUPPLY UI: style + nav button + panel + JS).
- **server.mjs:** loads `supply/inject.html`, splices it before `</body>`, single-sources `APP_VERSION`
  (replaces `__APP_VERSION__`), and adds read-only API `GET /api/supply/:section`
  (suppliers, purchase-orders, order-plan, shipments, deposits, batches, barcodes, payments, actions).
  All read-only — no writes yet (writes are a later, gated step).
- **New migrations (run on live in order):** `migrations/001_suppliers.sql` … `006_payments.sql`
  — suppliers, purchase_orders, purchase_order_lines (+v_purchase_order_lines), batches/branches/prod_numbers,
  sku_labels, deposits/payment_runs/payment_transactions. All in the `planner` schema. DDL+seed in each file.
- **No new env vars.**
- **⚠️ Vercel deploy note:** `vercel.json` `functions.includeFiles` currently bundles only
  `artifact_v16.7.html`. Add `supply/inject.html` (and the `migrations/` are not needed at runtime) so the
  SUPPLY UI isn't empty in production. Locally it's read from disk and works.
- **Status:** built + tested against Ben's sandbox Supabase; not pushed; live writes pending.
