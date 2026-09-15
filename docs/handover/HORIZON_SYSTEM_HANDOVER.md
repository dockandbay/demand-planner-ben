# HORIZON — System Handover (for conversation & planning)

A complete functional + technical reference for the Dock & Bay demand/supply platform ("HORIZON"). Load this into Claude to reason about, plan, or extend the system. It describes what every feature does, the database schema, and how the tables connect. Per-change history lives in CHANGES.md; this doc is the durable "how it all works" picture. **Current at app v26.504, migrations 103–172** (live baseline v26.487 — see the DEPLOY docs for exactly which migrations are applied to prod).

Companion docs: CLAUDE.md (build rules + estate), HANDOVER.md (Diviyaj deploy checklist), DEPLOY_YYYY-MM-DD.md (per-deploy bundle), SUPPLY_BI_SPEC.md (BI tab spec), CHANGES.md (version log), **HORIZON_ANALYTICS.md (read-only conversational-analytics setup + query cheat-sheet — use that for "how do I query the data" rather than this doc)**.

## 1. What HORIZON is

An internal demand-planning + supply/purchase-order + supplier-collaboration platform for Dock & Bay (beach/travel towels & accessories). Three audiences:

DEMAND planning — forecast sales per SKU x country x channel; drive the buy plan.
SUPPLY / operations — purchase orders, shipments, payments, deposits, crossdock, samples, BI.
SUPPLIER PORTAL — external suppliers log in (magic link) and manage their own orders.

Product identity: SKUs like TOWLB-CAB-LG-BLUE. variant_type='MASTER' SKUs are the planning units; SET = bundles. Countries: UK, US, EU, AU, CA. Channels: DTC (direct/Shopify), FBA (Amazon), B2B (wholesale). Warehouses: <country>_3pl (fulfils DTC+B2B) and <country>_fba (fulfils FBA); plus AWD (US upstream Amazon) held on products.inventory_us_awd.

## 2. Architecture & code layout
server.mjs — Express harness on :8124. Serves the app, injects live data into the artifact, and exposes the whole /api/** surface (Postgres via pg, AI via Anthropic, email via Resend, Cin7 ERP). APP_VERSION here derives from package.json ("version") — the single source of the version string. Diviyaj maintains the harness; Ben builds features.
artifact_v16.7.html — the DEMAND app (the original Claude artifact, rehosted). Contains DEMAND Plan/KPIs/Targets/Actions/Calendar, BUY, FBA, REPORTS/BI. Data is injected server-side as _SKU_RAW (products/inventory/availability/on-order) + forecast outputs; forecasts are recomputed client-side.
supply/inject.html (SUPPLY_INJECT) — injected into the same page; provides SUPPLY (Purchase Orders and all its sub-tabs), SCENARIO, CONFIG, SAMPLES, and the CONFIG portal preview.
supply/portal-view.js (window.DBPortalView) — the supplier portal view, reused by both the real portal (supply/portal.html at /portal) and the CONFIG "Portal" preview (admin acting-as a supplier). The two mounts differ only by their ep:{...} endpoint map (/api/portal/* vs /api/supply/*).
invoice.mjs — Commercial/Tax Invoice + Packing List generator (ExcelJS, fills a template).
asnpdf.mjs — dependency-free A4 pallet-label PDF (AU Coghlans ASN).
migrations/NNN_*.sql — schema migrations. Ben authors; Diviyaj applies to prod (one writer to prod).

Top-level nav (view toggles): DEMAND, BUY, FBA, REPORTS, SUPPLY, SCENARIO, CONFIG. CONFIG is a top-level view. On mobile a hamburger drawer mirrors these + their sub-navs. Sub-navs render as a light-blue "level-3" nav (e.g. DEMAND ▸ Inputs), each item routed by a hash slug (#/demand/inputs/keyaccounts).

## 3. Environments & data flow
Live (prod): Supabase project oolwklahstnvocaugryg, schema planner. Hosted on Vercel. Diviyaj owns all writes/deploys. Has an auth proxy that forwards the signed-in email (permissions are live-only).
Sandbox (Ben): separate Supabase (mgqrcupazffvpzpeuxzt), seeded from a prod copy. No auth proxy, so permissions never bite and everything is editable. Local dev server reads DATABASE_URL from .env. NB the sandbox data can be stale vs live (dates especially) — reseed via sandbox/reseed_from_live.sql when needed.
ETL: n8n (self-hosted, n8n.dockandbay.com) moves data from Airtable (source of truth for product data) — and later Cin7/Fulfil — into planner on a schedule. etl_runs logs runs.
Cin7 (ERP): live read/write via CIN7_* env. The Import-PO-from-Cin7 and Cin7 date-push buttons are explicit user actions (live writes, gated on CIN7_AUTH). **CIN7_AUTH on the local dev server writes to PRODUCTION Cin7 — never call those endpoints as a test.** erp_purchase_orders(_lines) mirror Cin7 for drift detection.
Email: Resend (RESEND_API_KEY, PORTAL_FROM) — magic links, portal reminders, escalations. Sandbox has no key, so nothing sends there.

Product/inventory truth: Airtable sku_child -> planner.products (185 cols incl. inventory_*, available_*, dims, cogs, launch/discontinue, hscodes). On-hand for the whole app resolves to planner.products — either read directly (AWD/NonGRS) or via the view v_product_inventory, which just unpivots products.inventory_uk_3pl … ca_fba. (The product_inventory table is orphaned/ETL-fed-but-unread; slated for retirement.)

## 4. Database schema (by domain) + connections

~106 live relations (≈100 base tables + 6 views), plus ~12 backup tables to ignore (z_*, *_bak_YYYYMMDD, *_pruned_*). Only ~24 declared foreign keys — most links are by convention (text keys like po, sku, warehouse, supplier_name), so mind them when joining.

### 4.1 Products & reference data
products (185 cols) — the master. Key groups: identity (sku, product_name, variant_type, category, subcategory, market_tier, core_seasonal), availability (available_<c>_<ch> booleans, 12 combos), launch/discontinue (launch_date_<c>[_final], discontinue_date_final/_au_final/_ca), inventory (inventory_<c>_<3pl|fba>, inventory_us_awd, inventory_<uk|us>_nongrs), dims/weights (uk_/us_ prod|pack|carton * w/h/l/wt), cogs (cogs_<c>_3pl_final), invoice (sku_invoice_title, hscode_<c>), leads (production_lead_time_weeks, china_to_<c>_lead_time_weeks, transfer_3pl_to_fba_lead_time_weeks), buy params (target cover weeks, forecast method, main_supplier_final), and in_planning_scope (DERIVED by a trigger: variant_type='MASTER' AND available in >=1 channel; see 6.2). NB: launch/discontinue for the demand plan read here per country (product_countries is retired — see §6.3). moq is present but ~100% null → buy plan defaults moq=1.
sku_labels (barcode/label + carton dims per SKU: product/carton/inner barcodes, GRS, dims) — used by the label/barcode generators. (Carton dims source-of-truth for planning is products, not sku_labels.)
categories / subcategories (FK subcategories.category -> categories.category) — taxonomy; is_seasonal, grouping. Subcategory is the forecast granularity.
suppliers (id, name, business_name, default_currency, deposit/completion/balance %s, credit_*, production_days, incoterm, cin7_member_id, te_id). PO currency = suppliers.default_currency (default USD); costs held in supplier currency, base currency GBP.
branches — fulfilment/destination branch: name, country_code, sea/air_lead_time_days, address. A PO's branch -> branch gives its country + transit leads. Branch names encode routing (e.g. "UK ILG", "US Geneva", "AU Coghlans", "EU iFulfillment", "Direct to Client", "Manufacturing"). Direct-to-Client / JLEW / NEXT are all DtC branches.
warehouse_config — canonical warehouse codes (uk_3pl…ca_fba); FK target for several tables. transfer_from_3pl_weeks, fba_transfer_min_units.
transfer_lead_times (mig 171) — 3PL→3PL inter-market transfer lanes (from_market, to_market, weeks); powers the Rebalance vs Urgent transfer split.
channel_map, category_exclusions, sku_exclusions, prod_numbers (production numbers + Xero account codes + require_supplier_confirmation), batches (buying batches).
### 4.2 Purchase orders & lines
purchase_orders (79 cols) — keyed by text po. Links: supplier_id -> suppliers.id (FK), branch -> branches.name, shipment_ref -> shipments.shipment_ref, deposit_ref -> deposits.reference, prod_no -> prod_numbers, batch_id -> batches, erp_po -> erp_purchase_orders. Carries production dates (start_production, end_production_overide, days_production_overide), ship/landing overrides, the payment plan fields (pay_start_deposit_*, pay_completion_*, pay_balance_1/2_*, *_pct_override, likely-pay-date overrides), packing flags (pack_*), DtC fields (client, sales_order_ref, dtc_accepted_*, dtc_key_account), crossdock_skus (CSV), require-confirmation via prod_no, supplier_confirmed_*, preship_not_required, asn_numbers, production_status, starred. status (OUR status) ∈ FUTURE / PRODUCTION / READY TO SHIP / **SHIPPED TO MASTER** / SHIPPING / DELIVERED / COMPLETE.
purchase_order_lines — po + sku + qty + carton_qty + cost_price; ERP deviation fields (erp_qty, erp_cost, proposed_*, supplier_risk_approved, discontinue_approved). ERP deviations are quantity-only; price never flags (cost rides along on push).
Computed ship/delivery/completion dates are NOT stored — they're derived in the purchase-orders query (see 6.4).
### 4.3 ERP mirror (Cin7)
erp_purchase_orders + erp_purchase_order_lines — mirror of Cin7 POs/lines. v_erp_po_drift compares them to purchase_orders(_lines) for date/qty deviations (qty-only for lines; price rides along, never flagged). erp_compare_ignored suppresses specific comparisons.
### 4.4 Shipments & inbound
shipments — shipment_ref (PK), master_po, carrier, mode, departure/landing/delivery/arrival dates, escalated, branch, country_code. POs attach via purchase_orders.shipment_ref. Shipment dates 100% override PO dates.
flexport_shipments — Flexport feed (dates, refs) used to source real ship/arrival dates.
inbound_shipments — the freight/inbound feed: reference (often = a PO), sku, destination_warehouse (FK warehouse_config), quantity/received_quantity, estimated_delivery_date. This is "confirmed inbound." Open POs not in this feed are surfaced as on-order with a calculated ETA (prod_end + 7 + branch sea transit). **Past-dated unreceived inbound is pulled forward** (est. delivery in the past → PO-grid date → this month) so it no longer drops out of the forward projection and triggers false urgents; the inbound line carries a ⚠ flag + PO link (see 6.4).
preorders — preorder commitments per sku x warehouse x ship_date.
### 4.5 Payments & deposits
deposits — deposit pool references (reference), supplier_id (FK), prod_no, amount, deposit_used/deposit_remaining, linked_pos, status, xero_account_code, is_deposit (false = sundry "other"), date_due/date_likely_pay/date_paid. A PO draws on a deposit via purchase_orders.deposit_ref; draws are capped at the ref balance (shortfall → completion). Deposits/Other are direct-entry in Supabase, NOT n8n/ERP-fed.
payment_runs + payment_transactions — the actual payment ledger (import-only), keyed to POs via po_completion/po_balance_*/deposit_ref/invoice_reference. PO payment plan lives in the purchase_orders.pay_* fields; the ledger is separate and read alongside for the Payments Report (write-through deferred).
payment_fx (bank amount + currency per run), payment_run_meta, payment_likely_dates (override likely pay dates per PO milestone), production_deposits (legacy, empty).
### 4.6 Forecasting
forecast_inputs — subcategory x country x channel x month raw forecast entries.
forecasts — versioned forecast run output; run_id -> forecast_runs.id (FK); level ('subcategory' | 'sku'), plus sku/warehouse/country/channel/month/units/method. SKU-level rows power SCENARIO Sales Planning; the demand plan cascades subcategory -> SKU client-side.
**forecast_outputs** (sku, **warehouse**, channel, month, units, source, updated_at) — sku x **warehouse** x channel x month saved output = "the plan" (used by Slow Moving forward-cover and forecast-vs-actual). ⚠ **Keyed by warehouse, not country** — to compare against sales_actuals (country+channel) map the warehouse prefix to the country and treat `<cc>_3pl` as DTC+B2B combined, `<cc>_fba` as FBA.
forecast_runs, forecast_export_settings.
sales_actuals (~83k rows) — sku x country x channel x month units/revenue. Trailing velocity, YoY, and the whole demand history come from here. month is a DATE at the 1st of the month.
Targets: contribution_targets, sell_through_targets, category_target_cover, product_target_cover_override, demand_revenue_targets (mig 168), key_account_forecasts (+ key_accounts).
price_changes (mig 169) — planned price-change entries.
### 4.7 Supplier portal
supplier_portal_users — email <-> supplier allow-list (supplier_id FK, active). Gates login.
portal_magic_tokens (one-time, 7-day), portal_sessions (psid cookie -> email -> supplier).
supplier_notes — per-PO timeline messages (po, author_kind internal|supplier, read_at). Internal @-mentions supported (team-only note that emails the tagged teammate).
supplier_submissions — supplier write-backs: kind = completion_date | invoice_value | tracking | carrier; status = pending | applied | dismissed. Mixed apply-flow (see 5.7).
portal_line_costs, portal_additional_costs (supplier-entered actual costs), portal_attachments (bytea file store), crossdock_shipments (supplier-entered shipped qty per PO x crossdock SKU), shipment_notes (shipment timeline), supplier_charges (freight charges).
### 4.8 Samples
sample_requests — ref (e.g. SR-8), supplier_id (FK), recipient address, purpose (TEXT ARRAY: sales, product, photography, marketing, operations), status, accepted_at, supplier_expected_completion, tracking_code, carrier (DHL/FedEx/UPS/Flexport/SF Express/Other), production_status, change_requested. A sample shipment IS a sample_requests record (carries SKU lines + dev samples).
sample_request_lines (FK sample_id), sample_request_dev_samples (mig 133), sample_notes (FK sample_id; timeline), sample_change_log (mig 172).
### 4.9 Config / cross-cutting
app_permissions — email -> supply_edit / demand_edit / is_admin (live-only enforcement).
app_settings — key/value store (first use: escalation recipient lists escalation_supply_chain|dtc|samples|product_dev).
invoice_consignees — consignee + notify-party per country for invoices (UK is the fallback).
bi_rules — BI tab alert rules. trading_calendar — demand events/uplifts.
financial_model + scenario_fin_overlay — Financial Forecast Model (FY quarters, growth%/price% overlay per category x country x quarter).
manufacturing_bom + manufacturing_accept — finished-bundle BOM vs manufacturing-branch POs.
buy_complex_rules (mig 170) — BUY-tab cover-target override engine ("Complex Rules", replaces First Buy).
Action state: supply_action_state (PO/supply action snooze/dismiss + snoozed_by/at), demand_action_state (demand action snooze).
suggestions (SUG-nnnn Suggestion Box), crossdock_notes (mig 111), forecast_notes (mig 112, per-cell demand-grid notes), etl_runs, air_freight_rates, freight_rates, import_tax_rates, duty_rates.
### 4.10 Views
v_product_inventory — unpivots products.inventory_* to (sku, warehouse, available). On-hand source.
v_product_availability — per (country,channel) is_available from products.available_* minus discontinued (discontinue_date_* from products); WHERE in_planning_scope; ignores launch date so pre-launch SKUs still show.
v_erp_po_drift — PO vs ERP drift. v_purchase_order_lines, category_sales_summary.

## 5. Features (how each works)
### 5.1 DEMAND (artifact) — top nav "DEMAND"
Plan — the big grid: SKU/sub-category rows x month columns, per selected country (CUR) + channel (CF). Forecast cells (makeFCTd) show LY actual / editable override / forecast; override key sku|co|ch|month. Overrides are % or literal. Pre-launch SKUs show but are gated FUTURE by launch date; discontinued-rundown months show a red cell border; FY actuals cells render green. Forecast cell notes: double-click a cell -> add/view notes ("N" badge + 120ms tooltip), keyed level|item|country|channel|month (forecast_notes). Multi-SKU comma filter + expand view (shared with BUY/FBA/Transfer). Inputs is a level-3 light-blue sub-nav (Key Accounts, etc.), each item a hash slug (#/demand/inputs/<slug>).
KPIs (in-stock rate, etc.), Targets (contribution/sell-through/revenue), Actions (demand action items, snoozable via demand_action_state; being reworked into a worked filter/action/dismiss process aligned to BI Alerts), Calendar (trading_calendar events + uplifts), Anomalies (grouped per SKU where same country+channel; set-cell is silent).
### 5.2 BUY (artifact)

Per SKU x market: simulate SOH month-by-month = on-hand + inbound landings (by ETA) - forecast demand, and recommend a buy. On-order POs get a calculated landing ETA so they land in the projection (open POs not in the inbound feed = prod_end+7+sea transit; if ordered, assume it ships). "On Order" card = 3PL+FBA total. Passes: 3PL buy, urgent (split sea/air), FBA transfer. Case-pack rounding, discontinue caps (urgent scan never rush-restocks a SKU's own discontinue month), Complex Rules cover-target overrides (buy_complex_rules, mig 170). Buy-3PL / buy-urgent tooltips explain the place-order & arrival dates and the rush-production + freight-weeks breakdown. Cover-band colours: understock bg #FFD6D1, overstock bg #FF746C. Numbers are module-scoped — verify via UI.

### 5.3 FBA (artifact)

FBA transfer recommendations: target FBA cover (weeks) minus FBA+AWD+inbound, capped at a % of 3PL, demand-driven. Cartons filter: Any (default) / Full / Partial (full cartons first, defer partial, never full+partial at once — applies to any transfer). SOH-FBA cell light-red when ≤2. Columns: Carton qty sits after Disc; the last column "3PL Inbound" shows open inbound with per-PO hover detail (ref, qty, dates). Per-category select-all/none (centred in the tick column); black group borders around the Ship / Transfer FBA / Override block (medium-blue headers). M+0 transfer is unified with the Transfer-FBA tab (fbaTransferRec, carton-rounded).

### 5.4 REPORTS / BI (artifact + SUPPLY_BI_SPEC.md)

Read-across views (metrics, reallocate, urgent buy, container fill, consolidate, …) + the BI alert engine (bi_rules).

### 5.5 SCENARIO (inject.html) — top nav "SCENARIO"
Prime Day — available inventory (FBA/AWD/3PL) per SKU, filterable. /api/scenario/prime-day.
B2B Allocation — should-we-take-this-order: stock impact + air-rush cost + take/decline. /api/scenario/b2b.
Financial Forecast Model — FY (Mar–Feb) quarterly units/revenue by category x market with growth%/price% overlay (financial_model, scenario_fin_overlay). /api/scenario/fin-model.
PO Stock Priority — for a production PO, how much of each line is actually needed (stock + OTHER inbound vs forecast). /api/scenario/po-stock-priority/:po.
Sales Planning — per SKU for a country+channel+month: on-hand, projected stock at month start, weeks cover, discontinued. FBA shows FBA / AWD / 3PL(transfer) as separate columns; cover uses FBA+AWD. Slow moving (>26wk trailing cover / no recent sales) + Rec. clearance flags + filters + CSV. /api/scenario/sales-planning.
Also: slow-moving, markdown/EOS, OTB, key-arrivals, auto-forecast endpoints.
### 5.6 SUPPLY > PURCHASE ORDERS (inject.html) — sub-nav PO_SUBS
PLAN — the PO grid. Filters: status/progress, country pills (OTHER = any non-UK/US/AU/EU/CA), supplier, branch, prod, batch, ACTION ITEMS, multi-SKU comma filter. Expand a PO -> detail tabs: PAYMENTS (editable payment plan), DATES (production/ship/delivery/completion + the OUR-status dropdown, bonded to the grid, incl. the "set shipped to master" action; ERP date-drift banner), CLIENT/FBA, ORDER PLAN (SKU x qty, ERP deviations), SHIPMENTS (assign/FOB, ASN, pre-ship docs), DOCUMENTS, MASTER DATA, LANDED COSTS, TIMELINE (supplier thread), LINKED RECORDS.
Action items per PO (PO_ACTCOND): payment_overdue, unpaid_payment, late (completion), production (should-have-shipped, on DATES), unassigned_shipment (excludes FOB), dtc_not_approved, po_not_approved, preship, erp_date, shipped_to_master, payment_invalid. Inline red A marker + tooltip + SNOOZE (1/3/7d) on each; snooze is silent + updates badge/tab/ACTION-ITEMS counts (supply_action_state, keyed poact|<po>|<cond>). Drawer/sub-tab links do NOT rewrite the URL to the PO (stay on the Actions tab).
Escalate the most recent TIMELINE note by email (see 5.9). "Send timeline message to supplier" quick-action posts a confirm-reminder to the portal timeline.
Invoice/Packing generator buttons (Commercial Invoice per PO, Tax Invoice per shipment).
Cin7 import (POs land PRODUCTION, mirror ERP lines, auto-filter grid) + Cin7 date-push.
Shipments — shipments grid + drawer (assign POs, Flexport links, freight cost by mode, tracking, ASN / pre-shipment docs, escalate). FOB = manufacturing branch OR non-major country + no shipment (isFOBdest).
Crossdock — on-hand+inbound for CROSSDOCK%/PREORDER% SKUs across the 4 3PL warehouses; source attribution; unknown-stock notes auto-wiped on ship-out (crossdock_notes).
Manufacturing — finished-bundle BOM vs manufacturing POs (manufacturing_bom, manufacturing_accept); grouped by production, In-production/Completed split, ready-to-ship counts.
Productions / Deposits / Other Payments / Payments Due / Payments Report / Barcodes — payment register + label/barcode downloads. Payments Due shows a "Likely pay date" column (editable input for overdue rows). Deposits saves silently. Payments Report highlights non-USD currencies.
### 5.7 CONFIG (inject.html) — top-level view

Sub-tabs (SUBS), General settings first:

General settings — escalation recipient lists (4, comma-separated) in app_settings.
Reference data: Import tax, Freight rates, Import duty, Branches, Consignees, Suppliers, Key accounts, Batches, Productions, Products (read-only), Manufacturing BOM, Forecast export.
Portal users — the email<->supplier allow-list; each row shows a per-supplier open-action count -> drawer of every open action -> Send reminder email (Resend). /api/supply/portal-signals + /api/supply/portal-remind.
Portal — acting-as-supplier preview of the real portal (renders DBPortalView with /api/supply/* EPs).
Suggestions — Suggestion Box triage (SUG-nnnn).
Permissions (admin only) — app_permissions grants (live-only).
### 5.8 SUPPLIER PORTAL (portal.html + portal-view.js) — /portal

Magic-link login (supplier_portal_users -> portal_magic_tokens -> portal_sessions cookie psid; portalAuth scopes every request to the session's supplier_id). Tabs: Purchase Orders, Shipment Plan (labels/crossdock/consolidation), Payments, Productions (order plan + barcode downloads), Samples. Suppliers submit: production status/completion date, tracking+carrier, invoice value + doc, actual cost prices, timeline notes. Apply flow (mixed): tracking/carrier -> shipment directly; completion date + invoice value -> supplier_submissions pending for internal one-click apply (completion -> purchase_orders.end_production_overide; invoice -> supplier_invoice_total); notes post immediately. Content is always left-aligned. Per-PO/shipment/sample open-action badge (grey 0 / red N).

### 5.9 Escalation

Escalate button on the most recent note of any timeline (PO / shipment / sample), on both the internal grid and the supplier portal. Emails the message: subject "horizon escalation - <ref>", body "<user> has escalated this message" + the message + an audience-matched deep link.

Supplier escalates -> routed to the matching app_settings internal list (sample+product purpose -> product-dev; other sample -> samples; DtC/JLEW/NEXT branch -> direct-to-client; else supply-chain). Link -> planner.
Dock & Bay escalates -> that supplier's active portal users. Link -> portal.
Endpoints: POST /api/supply/escalate (internal + preview), POST /api/portal/escalate (session-scoped).

## 6. Key derived logic (the non-obvious bits)
### 6.1 On-hand source

All on-hand = planner.products.inventory_* (directly for AWD/NonGRS, else via v_product_inventory). The product_inventory table is orphaned.

### 6.2 Planning scope (mig 109)

products.in_planning_scope is derived by a BEFORE trigger: coalesce(variant_type='MASTER' AND (any available_<c>_<ch> IS TRUE), false). The n8n sync must NOT set it (the trigger owns it). This fixed a recurring outage where the sync zeroed it and emptied BUY/FBA.

### 6.3 Availability & launch/discontinue

v_product_availability derives per-channel availability from products.available_* minus a past discontinue_date_* (ignores launch date so pre-launch SKUs still show). Launch/discontinue for the demand plan read planner.products per country (launch_date_<c>_final ▸ launch_date_<c>; discontinue _final/_au_final/_ca). product_countries is retired (dropped).

### 6.4 PO date engine (purchase-orders query)

Per PO: prod_end = end_production_overide ▸ start_production + supplier.production_days; ship = shipment departure ▸ flexport ▸ prod_end + 7; delivery = shipment/flexport ▸ ship + branch transit lead (air/sea by mode; sea default); completion(checkin) = delivery + 7 (DtC self-master = FOB, +0). Open-PO ETAs reuse the unshipped path (prod_end + 7 + branch sea lead). Inbound arrival (inbEffEta) resolves: future estimated_delivery_date ▸ PO-grid date (poEta) ▸ this month — past-dated unreceived inbound is pulled forward (with a ⚠ + PO link) so it doesn't drop out and cause a false urgent.

### 6.5 FOB vs DIRECT

isFOBdest = no shipment AND (manufacturing branch OR country not UK/US/EU/AU/CA). DIRECT is a real destination (direct-to-client), FOB = no import warehouse + no shipment. FOB POs don't raise "unassigned shipment".

### 6.6 Payment plan

Milestones = start deposit / completion / balance(s), % from supplier terms (suppliers.*_pct), overridable per PO (*_pct_override, pay_*). Deposits drawn on deposit_ref are capped at the ref balance (shortfall → completion). The payment_transactions ledger is import-only and read alongside the plan for reporting.

## 7. Conventions & gotchas
Text keys, few FKs: join by po, sku, warehouse, supplier_name conventionally (~24 FKs across ~106 relations).
forecast_outputs / preorders / key_account_forecasts are keyed by WAREHOUSE, not country — map <cc>_3pl -> country <CC> (DTC+B2B), <cc>_fba -> FBA when joining to sales_actuals.
Month keys: grid/forecast months are YYYY_MM strings; sales_actuals.month/forecasts.month are dates bucketed via to_char(month,'YYYY-MM').
Route order: /api/supply/:section and /api/supply/:po are catch-alls — new specific /api/supply/... GET routes can be swallowed (why settings live at /api/app-settings, consignees at /api/consignees).
Permissions live-only: requiredCap() gates writes to supply/demand/config caps; sandbox (no auth email) = full access. Portal has its own magic-link auth. SCENARIO open to all.
Emails only send on live (no RESEND_API_KEY in sandbox).
Dates: display everything as dd-Mmm-yy (29-Jul-26); never raw ISO. Show dockandbay.com users as local-part + "@".
Version bump every change (package.json + APP_VERSION + CHANGES.md) for revertability.
Deploy model: Ben builds on a branch; Diviyaj pulls, applies migrations (one writer to prod), deploys. Every deploy is summarised in DEPLOY_YYYY-MM-DD.md.
Don't point a deployed app at the sandbox DB; don't commit secrets; confirm before any live write. Sandbox Cin7 endpoints hit PRODUCTION Cin7.

## 8. Outstanding / watch-list (as of v26.504)
product_inventory orphaned — retire its n8n write step then drop it.
n8n product sync must not set in_planning_scope (trigger owns it); must sync products.cost_<code> cost columns.
products.moq is ~100% null → buy plan defaults moq=1 (add real MOQs later).
Transfer classes: Rebalance (overstock) vs Urgent (out-of-stock) split on inter-market lead times (transfer_lead_times, mig 171) — foundation built, classes pending. Buy 3PL Urgent → Urgent Air + Urgent Sea split confirmed but not yet built.
Backlog: FOB shipment plan improvements, inter-branch transfers (esp. ILG export docs), 3PL→3PL transfer reports + ACTIONS-tab surfacing + 3PL invoice process, portal cost-price discrepancy → ERP push, crossdock per-SKU selection.
Sandbox data can be stale vs live (dates) — reseed via sandbox/reseed_from_live.sql, then re-apply session migrations. ~10 stale EU POs (90d+ overdue inbound) recommended for closing.

---
*This is the durable functional/schema reference. For plain-English querying of the live data, use HORIZON_ANALYTICS.md (read-only, SELECT-only). For per-change detail, see CHANGES.md.*
