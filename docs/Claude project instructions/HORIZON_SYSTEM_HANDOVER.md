# HORIZON — System Handover (for conversation & planning)

A complete functional + technical reference for the Dock & Bay demand/supply platform ("HORIZON").
Load this into Claude to reason about, plan, or extend the system. It describes **what every feature does**,
the **database schema**, and **how the tables connect**. Per-change history lives in `CHANGES.md`; this doc
is the durable "how it all works" picture. Current at **app v25.410**, migrations **103–114**.

> Companion docs: `CLAUDE.md` (build rules + estate), `HANDOVER.md` (Diviyaj deploy checklist),
> `DEPLOY_YYYY-MM-DD.md` (per-deploy bundle), `SUPPLY_BI_SPEC.md` (BI tab spec), `CHANGES.md` (version log).

---

## 1. What HORIZON is

An internal demand-planning + supply/purchase-order + supplier-collaboration platform for Dock & Bay
(beach/travel towels & accessories). Three audiences:

- **DEMAND planning** — forecast sales per SKU x country x channel; drive the buy plan.
- **SUPPLY / operations** — purchase orders, shipments, payments, deposits, crossdock, samples, BI.
- **SUPPLIER PORTAL** — external suppliers log in (magic link) and manage their own orders.

Product identity: SKUs like `TOWLB-CAB-LG-BLUE`. `variant_type='MASTER'` SKUs are the planning units;
`SET` = bundles. Countries: **UK, US, EU, AU, CA**. Channels: **DTC** (direct/Shopify), **FBA** (Amazon),
**B2B** (wholesale). Warehouses: `<country>_3pl` (fulfils DTC+B2B) and `<country>_fba` (fulfils FBA);
plus **AWD** (US upstream Amazon) held on `products.inventory_us_awd`.

---

## 2. Architecture & code layout

- **`server.mjs`** — Express harness on `:8124`. Serves the app, injects live data into the artifact, and
  exposes the whole `/api/**` surface (Postgres via `pg`, AI via Anthropic, email via Resend, Cin7 ERP).
  `APP_VERSION` here is the source of the version string. Diviyaj maintains the harness; Ben builds features.
- **`artifact_v16.7.html`** — the **DEMAND** app (the original Claude artifact, rehosted). Contains DEMAND
  Plan/KPIs/Targets/Actions/Calendar, **BUY**, **FBA**, **REPORTS/BI**. Data is injected server-side as
  `_SKU_RAW` (products/inventory/availability/on-order) + forecast outputs; forecasts are recomputed
  client-side.
- **`supply/inject.html`** (`SUPPLY_INJECT`) — injected into the same page; provides **SUPPLY** (Purchase
  Orders and all its sub-tabs), **SCENARIO**, **CONFIG**, **SAMPLES**, and the CONFIG portal preview.
- **`supply/portal-view.js`** (`window.DBPortalView`) — the **supplier portal view**, reused by both the real
  portal (`supply/portal.html` at `/portal`) and the CONFIG "Portal" preview (admin acting-as a supplier).
  The two mounts differ only by their `ep:{...}` endpoint map (`/api/portal/*` vs `/api/supply/*`).
- **`invoice.mjs`** — Commercial/Tax Invoice + Packing List generator (ExcelJS, fills a template).
- **`asnpdf.mjs`** — dependency-free A4 pallet-label PDF (AU Coghlans ASN).
- **`migrations/NNN_*.sql`** — schema migrations. Ben authors; Diviyaj applies to prod (one writer to prod).

Top-level nav (view toggles): **DEMAND, BUY, FBA, REPORTS, SUPPLY, SCENARIO, CONFIG** (+ SCENARIO). CONFIG is
a top-level view. On mobile a hamburger drawer mirrors these + their sub-navs.

---

## 3. Environments & data flow

- **Live (prod):** Supabase project `oolwklahstnvocaugryg`, schema `planner`. Hosted on Vercel. Diviyaj owns
  all writes/deploys. Has an auth proxy that forwards the signed-in email (permissions are live-only).
- **Sandbox (Ben):** separate Supabase (`mgqrcupazffvpzpeuxzt`), seeded from a prod copy. No auth proxy, so
  permissions never bite and everything is editable. Local dev server reads `DATABASE_URL` from `.env`.
- **ETL:** **n8n** (self-hosted, `n8n.dockandbay.com`) moves data from Airtable (source of truth for product
  data) — and later Cin7/Fulfil — into `planner` on a schedule. `etl_runs` logs runs.
- **Cin7 (ERP):** live read/write via `CIN7_*` env. The Import-PO-from-Cin7 and Cin7 date-push buttons are
  explicit user actions (live writes, gated on `CIN7_AUTH`). `erp_purchase_orders(_lines)` mirror Cin7 for
  drift detection.
- **Email:** Resend (`RESEND_API_KEY`, `PORTAL_FROM`) — magic links, portal reminders, escalations. Sandbox
  has no key, so nothing sends there.

**Product/inventory truth:** Airtable `sku_child` -> `planner.products` (182 cols incl. `inventory_*`,
`available_*`, dims, cogs, launch/discontinue, hscodes). **On-hand for the whole app resolves to
`planner.products`** — either read directly (AWD/NonGRS) or via the view `v_product_inventory`, which just
unpivots `products.inventory_uk_3pl … ca_fba`. (The `product_inventory` table is orphaned/ETL-fed-but-unread;
slated for retirement.)

---

## 4. Database schema (by domain) + connections

78 relations. Only 14 declared foreign keys — **most links are by convention** (text keys like `po`, `sku`,
`warehouse`, `supplier_name`), so mind them when joining.

### 4.1 Products & reference data
- **`products`** (182 cols) — the master. Key groups: identity (`sku`, `product_name`, `variant_type`,
  `category`, `subcategory`, `market_tier`, `core_seasonal`), availability (`available_<c>_<ch>` booleans,
  12 combos), launch/discontinue (`launch_date_<c>[_final]`, `discontinue_date_final/_au_final/_ca`),
  inventory (`inventory_<c>_<3pl|fba>`, `inventory_us_awd`, `inventory_<uk|us>_nongrs`), dims/weights
  (`uk_/us_ prod|pack|carton * w/h/l/wt`), cogs (`cogs_<c>_3pl_final`), invoice (`sku_invoice_title`,
  `hscode_<c>`), leads (`production_lead_time_weeks`, `china_to_<c>_lead_time_weeks`,
  `transfer_3pl_to_fba_lead_time_weeks`), and **`in_planning_scope`** (DERIVED by a trigger:
  `variant_type='MASTER' AND available in >=1 channel`; see 6.2).
- **`sku_labels`** (29) — barcode/label + carton dims per SKU (product/carton/inner barcodes, GRS, dims).
  Used by the label/barcode generators.
- **`categories`** / **`subcategories`** (FK `subcategories.category -> categories.category`) — taxonomy;
  `is_seasonal`, `grouping`. Subcategory is the forecast granularity.
- **`suppliers`** (29) — `id`, `name`, `business_name`, `default_currency`, deposit/completion/balance %s,
  `credit_*`, `production_days`, `incoterm`, `cin7_member_id`, **`te_id`** (Textile Exchange ID for invoices).
- **`branches`** (6) — fulfilment/destination branch: `name`, `country_code`, `sea/air_lead_time_days`,
  address. A PO's `branch` -> branch gives its country + transit leads. Branch names encode routing
  (e.g. "UK ILG", "US Geneva", "AU Coghlans", "EU iFulfillment", "Direct to Client", "Manufacturing").
- **`warehouse_config`** (5) — canonical `warehouse` codes (`uk_3pl`…`ca_fba`); FK target for several tables.
  `transfer_from_3pl_weeks`, `fba_transfer_min_units`.
- **`channel_map`**, **`category_exclusions`**, **`sku_exclusions`**, **`prod_numbers`** (production numbers +
  Xero account codes + `require_supplier_confirmation`), **`batches`** (buying batches).

### 4.2 Purchase orders & lines
- **`purchase_orders`** (76) — keyed by text **`po`**. Links: `supplier_id -> suppliers.id` (FK),
  `branch -> branches.name`, `shipment_ref -> shipments.shipment_ref`, `deposit_ref -> deposits.reference`,
  `prod_no -> prod_numbers`, `batch_id -> batches`, `erp_po -> erp_purchase_orders`. Carries production dates
  (`start_production`, `end_production_overide`, `days_production_overide`), ship/landing overrides, the
  **payment plan** fields (`pay_start_deposit_*`, `pay_completion_*`, `pay_balance_1/2_*`,
  `*_pct_override`), packing flags (`pack_*`), DtC fields (`client`, `sales_order_ref`, `dtc_accepted_*`,
  `dtc_key_account`), `crossdock_skus` (CSV), `require`-confirmation via prod_no, `supplier_confirmed_*`,
  `preship_not_required`, `asn_numbers`, `production_status`, `starred`.
- **`purchase_order_lines`** (17) — `po` + `sku` + `qty` + `cost_price`; ERP deviation fields
  (`erp_qty`, `erp_cost`, `proposed_*`, `supplier_risk_approved`, `discontinue_approved`).
- Computed ship/delivery/completion **dates are NOT stored** — they're derived in the purchase-orders query
  (see 6.4).

### 4.3 ERP mirror (Cin7)
- **`erp_purchase_orders`** (10) + **`erp_purchase_order_lines`** (7) — mirror of Cin7 POs/lines.
  **`v_erp_po_drift`** compares them to `purchase_orders(_lines)` for date/qty deviations (qty-only for lines;
  price rides along, never flagged). `erp_compare_ignored` suppresses specific comparisons.

### 4.4 Shipments & inbound
- **`shipments`** (23) — `shipment_ref` (PK), `master_po`, `carrier`, `mode`, departure/landing/delivery/
  arrival dates, `escalated`, `branch`, `country_code`. POs attach via `purchase_orders.shipment_ref`.
- **`flexport_shipments`** (39) — Flexport feed (dates, refs) used to source real ship/arrival dates.
- **`inbound_shipments`** (12) — the freight/inbound feed: `reference` (often = a PO), `sku`,
  `destination_warehouse` (FK warehouse_config), `quantity`/`received_quantity`, `estimated_delivery_date`.
  This is "confirmed inbound." Open POs **not** in this feed are surfaced as on-order with a *calculated* ETA
  (prod_end + 7 + branch sea transit).
- **`preorders`** (6) — preorder commitments per sku x warehouse x ship_date.

### 4.5 Payments & deposits
- **`deposits`** (23) — deposit pool references (`reference`), `supplier_id` (FK), `prod_no`, `amount`,
  `deposit_used`/`deposit_remaining`, `linked_pos`, `status`, `xero_account_code`. A PO draws on a deposit via
  `purchase_orders.deposit_ref`.
- **`payment_runs`** (11) + **`payment_transactions`** (16) — the actual payment ledger (import-only), keyed
  to POs via `po_completion`/`po_balance_*`/`deposit_ref`/`invoice_reference`. **PO payment plan lives in the
  `purchase_orders.pay_*` fields**; the ledger is separate and read alongside for the Payments Report.
- **`payment_fx`**, **`payment_run_meta`**, **`payment_likely_dates`** (override likely pay dates per PO
  milestone), **`production_deposits`** (legacy, empty).

### 4.6 Forecasting
- **`forecast_inputs`** (7) — subcategory x country x channel x month raw forecast entries.
- **`forecasts`** (11) — versioned forecast run output; `run_id -> forecast_runs.id` (FK); `level`
  ('subcategory' | 'sku'), plus `sku`/`warehouse`/`country`/`channel`/`month`/`units`/`method`. SKU-level rows
  power SCENARIO Sales Planning; the demand plan cascades subcategory -> SKU client-side.
- **`forecast_outputs`** (7) — sku x warehouse x channel x month saved output (used by Slow Moving forward-cover).
- **`forecast_runs`** (6), **`forecast_export_settings`** (3).
- **`sales_actuals`** (81k rows) — sku x country x channel x month `units`/`revenue`. Trailing velocity,
  YoY, and the whole demand history come from here.
- Targets: **`contribution_targets`**, **`sell_through_targets`**, **`category_target_cover`**,
  **`product_target_cover_override`**, **`key_account_forecasts`** (+ `key_accounts`).

### 4.7 Supplier portal
- **`supplier_portal_users`** (8) — email <-> supplier allow-list (`supplier_id` FK, `active`). Gates login.
- **`portal_magic_tokens`** (one-time, 7-day), **`portal_sessions`** (psid cookie -> email -> supplier).
- **`supplier_notes`** (8) — per-PO timeline messages (`po`, `author_kind` internal|supplier, `read_at`).
- **`supplier_submissions`** (13) — supplier write-backs: `kind` = completion_date | invoice_value | tracking
  | carrier; `status` = pending | applied | dismissed. Mixed apply-flow (see 5.7).
- **`portal_line_costs`**, **`portal_additional_costs`** (supplier-entered actual costs), **`portal_attachments`**
  (bytea file store), **`crossdock_shipments`** (supplier-entered shipped qty per PO x crossdock SKU),
  **`shipment_notes`** (shipment timeline), **`supplier_charges`** (freight charges).

### 4.8 Samples
- **`sample_requests`** (27) — `ref` (e.g. `SR-8`), `supplier_id` (FK), recipient address, `purpose` (TEXT
  ARRAY of: sales, product, photography, marketing, operations), `status`, `accepted_at`,
  `supplier_expected_completion`, `tracking_code`, `carrier`, `production_status`, `change_requested`.
- **`sample_request_lines`** (FK sample_id), **`sample_notes`** (FK sample_id; timeline).

### 4.9 Config / cross-cutting
- **`app_permissions`** (6) — email -> supply_edit / demand_edit / is_admin (live-only enforcement).
- **`app_settings`** (4) — key/value store. First use: escalation recipient lists
  (`escalation_supply_chain|dtc|samples|product_dev`).
- **`invoice_consignees`** (6) — consignee + notify-party per country for invoices (UK is the fallback).
- **`bi_rules`** (11) — BI tab alert rules. **`trading_calendar`** (10) — demand events/uplifts.
- **`financial_model`** (8) + **`scenario_fin_overlay`** (7) — Financial Forecast Model (FY quarters,
  growth%/price% overlay per category x country x quarter).
- **`manufacturing_bom`** + **`manufacturing_accept`** — finished-bundle BOM vs manufacturing-branch POs.
- Action state: **`supply_action_state`** (PO/supply action snooze/dismiss + snoozed_by/at),
  **`demand_action_state`** (demand action snooze).
- **`crossdock_notes`** (mig 111), **`forecast_notes`** (mig 112, per-cell demand-grid notes),
  `etl_runs`, `air_freight_rates`, `freight_rates`, `import_tax_rates`, `duty_rates`.

### 4.10 Views
- **`v_product_inventory`** — unpivots `products.inventory_*` to (sku, warehouse, available). **On-hand source.**
- **`v_product_availability`** — per (country,channel) `is_available` from `products.available_*` minus
  discontinued (`discontinue_date_*` from products); `WHERE in_planning_scope`.
- **`v_erp_po_drift`** — PO vs ERP drift. **`v_purchase_order_lines`**, **`category_sales_summary`**.

---

## 5. Features (how each works)

### 5.1 DEMAND (artifact) — top nav "DEMAND"
- **Plan** — the big grid: SKU/sub-category rows x month columns, per selected **country (`CUR`)** +
  **channel (`CF`)**. Forecast cells (`makeFCTd`) show LY actual / editable override / forecast; override key
  `sku|co|ch|month`. Overrides are `%` or literal. Pre-launch SKUs show but are gated **FUTURE** by launch
  date; discontinued-rundown months show a **red cell border**. **Forecast cell notes**: double-click a cell
  -> add/view notes ("N" badge + 120ms tooltip), keyed `level|item|country|channel|month` (`forecast_notes`).
- **KPIs** (in-stock rate, etc.), **Targets** (contribution/sell-through), **Actions** (demand action items,
  snoozable via `demand_action_state`), **Calendar** (`trading_calendar` events + uplifts).

### 5.2 BUY (artifact)
Per SKU x market: simulate SOH month-by-month = on-hand + inbound landings (by ETA) - forecast demand, and
recommend a buy. **On-order POs get a calculated landing ETA so they land in the projection** (open POs not
in the inbound feed = prod_end+7+sea transit). "On Order" card = 3PL+FBA total. Passes: 3PL buy, urgent (air),
FBA transfer. Case-pack rounding, discontinue caps, first-buy contingency. Numbers are module-scoped — verify
via UI.

### 5.3 FBA (artifact)
FBA transfer recommendations: target FBA cover (weeks) minus FBA+AWD+inbound, capped at a % of 3PL. Cartons
filter: Any (default) / Full / Partial, scoped to Transfer-FBA modes.

### 5.4 REPORTS / BI (artifact + `SUPPLY_BI_SPEC.md`)
Read-across views (metrics, reallocate, urgent buy, container fill, consolidate, …) + the BI alert engine
(`bi_rules`).

### 5.5 SCENARIO (inject.html) — top nav "SCENARIO"
- **Prime Day** — available inventory (FBA/AWD/3PL) per SKU, filterable. `/api/scenario/prime-day`.
- **B2B Allocation** — should-we-take-this-order: stock impact + air-rush cost + take/decline. `/api/scenario/b2b`.
- **Financial Forecast Model** — FY (Mar–Feb) quarterly units/revenue by category x market with growth%/price%
  overlay (`financial_model`, `scenario_fin_overlay`). `/api/scenario/fin-model`.
- **PO Stock Priority** — for a production PO, how much of each line is actually needed (stock + OTHER inbound
  vs forecast). `/api/scenario/po-stock-priority/:po`.
- **Sales Planning** (v25.400+) — per SKU for a country+channel+month: on-hand, projected stock at month
  start, weeks cover, discontinued. **FBA shows FBA / AWD / 3PL(transfer) as separate columns**; cover uses
  FBA+AWD. **Slow moving** (>26wk trailing cover / no recent sales) + **Rec. clearance** (discontinued with
  stock, or >52wk overstock) flags + filters + CSV. `/api/scenario/sales-planning`.
- Also: slow-moving, markdown/EOS, OTB, key-arrivals, auto-forecast endpoints.

### 5.6 SUPPLY > PURCHASE ORDERS (inject.html) — sub-nav `PO_SUBS`
- **PLAN** — the PO grid. Filters: status/progress, country pills (**OTHER** = any non-UK/US/AU/EU/CA),
  supplier, branch, prod, batch, ACTION ITEMS. Expand a PO -> detail tabs: **PAYMENTS** (editable payment
  plan), **DATES** (production/ship/delivery/completion; ERP date-drift banner), **CLIENT/FBA**, **ORDER
  PLAN** (SKU x qty, ERP deviations), **SHIPMENTS** (assign/FOB, ASN, pre-ship docs), **DOCUMENTS**,
  **MASTER DATA**, **LANDED COSTS**, **TIMELINE** (supplier thread), **LINKED RECORDS**.
  - **Action items** per PO (`PO_ACTCOND`): payment_overdue, unpaid_payment, late (completion), production
    (should-have-shipped, on DATES), unassigned_shipment (excludes FOB), dtc_not_approved, po_not_approved,
    preship, erp_date. Inline red **A** marker + tooltip + **SNOOZE** (1/3/7d) on each; snooze is
    silent + updates badge/tab/ACTION-ITEMS counts (`supply_action_state`, keyed `poact|<po>|<cond>`).
  - **Escalate** the most recent TIMELINE note by email (see 5.9).
  - Invoice/Packing generator buttons (Commercial Invoice per PO, Tax Invoice per shipment).
  - Cin7 import (POs land PRODUCTION, mirror ERP lines, auto-filter grid) + Cin7 date-push.
- **Shipments** — shipments grid + drawer (assign POs, Flexport links, freight cost by mode, tracking, ASN /
  pre-shipment docs, escalate). FOB = manufacturing branch OR non-major country + no shipment (`isFOBdest`).
- **Crossdock** (v25.403) — on-hand+inbound for CROSSDOCK%/PREORDER% SKUs across the 4 3PL warehouses; source
  attribution (inbound->PO / preorder / assigned crossdock PO); unknown-stock notes auto-wiped on ship-out
  (`crossdock_notes`); + crossdock assigned to open POs not yet inbound.
- **Manufacturing** — finished-bundle BOM vs manufacturing POs (`manufacturing_bom`, `manufacturing_accept`).
- **Productions / Deposits / Other Payments / Payments Due / Payments Report / Barcodes** — the former
  productions views + payment register + label/barcode downloads.

### 5.7 CONFIG (inject.html) — top-level view
Sub-tabs (`SUBS`), **General settings** first:
- **General settings** — escalation recipient lists (4, comma-separated) in `app_settings`.
- Reference data: Import tax, Freight rates, Import duty, Branches, Consignees, Suppliers, Key accounts,
  Batches, Productions, Products (read-only), Manufacturing BOM, Forecast export.
- **Portal users** — the email<->supplier allow-list; each row shows a **per-supplier open-action count** ->
  drawer of every open action -> **Send reminder email** (Resend). `/api/supply/portal-signals` +
  `/api/supply/portal-remind`.
- **Portal** — acting-as-supplier preview of the real portal (renders `DBPortalView` with `/api/supply/*` EPs).
- **Permissions** (admin only) — `app_permissions` grants (live-only).

### 5.8 SUPPLIER PORTAL (`portal.html` + `portal-view.js`) — `/portal`
Magic-link login (`supplier_portal_users` -> `portal_magic_tokens` -> `portal_sessions` cookie `psid`;
`portalAuth` scopes every request to the session's `supplier_id`). Tabs: Purchase Orders, Shipment Plan
(labels/crossdock/consolidation), Payments, Productions (order plan + barcode downloads), Samples. Suppliers
**submit**: production status/completion date, tracking+carrier, invoice value + doc, actual cost prices,
timeline notes. **Apply flow (mixed):** tracking/carrier -> shipment directly; completion date + invoice
value -> `supplier_submissions` **pending** for internal one-click apply (completion ->
`purchase_orders.end_production_overide`; invoice -> `supplier_invoice_total`); notes post immediately.
Per-PO/shipment/sample **open-action badge** (grey 0 / red N).

### 5.9 Escalation (v25.407–409)
**Escalate** button on the most recent note of any timeline (PO / shipment / sample), on both the internal
grid and the supplier portal. Emails the message: subject `horizon escalation - <ref>`, body
"`<user>` has escalated this message" + the message + an **audience-matched deep link**.
- **Supplier escalates** -> routed to the matching `app_settings` internal list: sample with `product`
  purpose -> product-dev; other sample -> samples; branch DtC/JLEW/NEXT -> direct-to-client; else supply-chain.
  Link -> planner.
- **Dock & Bay escalates** -> that supplier's active portal users. Link -> portal.
- Endpoints: `POST /api/supply/escalate` (internal + preview), `POST /api/portal/escalate` (session-scoped).

---

## 6. Key derived logic (the non-obvious bits)

### 6.1 On-hand source
All on-hand = `planner.products.inventory_*` (directly for AWD/NonGRS, else via `v_product_inventory`). The
`product_inventory` table is orphaned.

### 6.2 Planning scope (mig 109)
`products.in_planning_scope` is **derived by a BEFORE trigger**:
`coalesce(variant_type='MASTER' AND (any available_<c>_<ch> IS TRUE), false)`. The n8n sync must NOT set it
(the trigger owns it). This fixed a recurring outage where the sync zeroed it and emptied BUY/FBA.

### 6.3 Availability & launch/discontinue
`v_product_availability` derives per-channel availability from `products.available_*` minus a past
`discontinue_date_*`. Launch/discontinue for the demand plan read `planner.products` per country
(`launch_date_<c>_final ▸ launch_date_<c>`; discontinue `_final`/`_au_final`/`_ca`). `product_countries` is
retired.

### 6.4 PO date engine (purchase-orders query)
Per PO: `prod_end = end_production_overide ▸ start_production + supplier.production_days`; `ship = shipment
departure ▸ flexport ▸ prod_end + 7`; `delivery = shipment/flexport ▸ ship + branch transit lead (air/sea by
mode; sea default)`; `completion(checkin) = delivery + 7` (DtC self-master = FOB, +0). Open-PO ETAs reuse the
unshipped path (prod_end + 7 + branch sea lead).

### 6.5 FOB vs DIRECT
`isFOBdest` = no shipment AND (manufacturing branch OR country not UK/US/EU/AU/CA). DIRECT is a real
destination (direct-to-client), FOB = no import warehouse + no shipment. FOB POs don't raise
"unassigned shipment".

### 6.6 Payment plan
Milestones = start deposit / completion / balance(s), % from supplier terms (`suppliers.*_pct`), overridable
per PO (`*_pct_override`, `pay_*`). Deposits drawn on `deposit_ref` are capped at the ref balance. The
`payment_transactions` ledger is import-only and read alongside the plan for reporting.

---

## 7. Conventions & gotchas

- **Text keys, few FKs:** join by `po`, `sku`, `warehouse`, `supplier_name` conventionally.
- **Month keys:** grid/forecast months are `YYYY_MM` strings; `sales_actuals.month`/`forecasts.month` are
  dates bucketed via `to_char(month,'YYYY-MM')`.
- **Route order:** `/api/supply/:section` and `/api/supply/:po` are **catch-alls** — new specific
  `/api/supply/...` GET routes can be swallowed (why settings live at `/api/app-settings`, consignees at
  `/api/consignees`).
- **Permissions live-only:** `requiredCap()` gates writes to supply/demand/config caps; sandbox (no auth
  email) = full access. Portal has its own magic-link auth. SCENARIO open to all.
- **Emails only send on live** (no `RESEND_API_KEY` in sandbox).
- **Version bump every change** (`APP_VERSION` in server.mjs + package.json + `CHANGES.md`) for revertability.
- **Deploy model:** Ben builds on a branch; Diviyaj pulls, applies migrations (one writer to prod), deploys.
  Every deploy is summarised in `DEPLOY_YYYY-MM-DD.md`.
- **Don't** point a deployed app at the sandbox DB; don't commit secrets; confirm before any live write.

---

## 8. Outstanding / watch-list (as of v25.410)

- Migrations **111/112/113** not yet on live (Crossdock notes, Forecast notes, escalation General Settings
  won't work on live until applied). Mig **114** is optional cleanup (drops dead + backup tables).
- **`product_inventory`** orphaned — retire its n8n write step then drop it.
- n8n product sync must not set `in_planning_scope` (trigger owns it).
- Login session cap to 3 days (auth-proxy config, Diviyaj).
- 3,280 SHIPPING POs historically missing from `inbound_shipments` (data-feed gap).
- One SKU (`TOWLB-CAB-XL-POSPIN`) needs its AU discontinue date set in Airtable/products.
