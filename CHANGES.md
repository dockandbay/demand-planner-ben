# CHANGES

Version log for the demand planner (bump on every change so we can revert).
Deploy notes for Diviyaj: new env vars, migrations, and files to wire in.

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
