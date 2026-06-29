# Handover to Live — for Diviyaj

The single consolidated checklist of what needs wiring to take Ben's build to production.
Ben builds features here; Diviyaj pulls this repo downstream, wires it to production data
(`oolwklahstnvocaugryg`), and ships. Per-change detail lives in `CHANGES.md` (version log);
this doc is the running "what's outstanding to go live" view. Update it as items are done.

> One writer to prod = Diviyaj. Ben never deploys to prod directly.

---

## 1. Database migrations

The `planner` schema is a consolidated baseline (`migrations/schema.sql`, current **as of migration 061**)
plus new numbered migrations on top. See `migrations/README.md`.

- **Existing prod DB** (already migrated through 061): run **only the new numbered migrations**:
  - **`062_erp_purchase_orders.sql`** — ERP mirror table (see §3).
  - **`063_po_credit_amount.sql`** — `credit_amount` on POs.
  - **`064_erp_sync_model.sql`** — ERP line mirror + drift view (see §3).
  - **`065_supplier_link_fix.sql`** — repair PO↔supplier links broken by inconsistent supplier-name
    spelling (e.g. `Jinma (Merry)` vs `Jinma (merry)`); normalises spelling + re-resolves `supplier_id`
    case-insensitively. Idempotent.
  - **`066_fin_overlay_subcategory.sql`** — financial-model scenario overlay keyed by channel × country ×
    **sub-category** (was channel × country). ⬅ *latest, not yet on prod.*
  - **`067_fin_overlay_period.sql`** — financial-model overlay also keyed by **period** (quarter), for per-cell growth/price. ⬅ *latest.*
  - **`068_erp_lines_backfill.sql`** — backfill the ERP line mirror from the (now-deprecated) embedded erp_qty/erp_cost; the app reads drift from `erp_purchase_order_lines` going forward.
  - **`069_add_cin7_suppliers.sql`** — add 4 product suppliers found in the Cin7 export but missing from the
    master (Forming Reality, Kangxun (Doris), Foamie, Chilly Bottles). Run **before** loading the PO/ERP data
    seed (see §7). Idempotent.
  - **`070_oplan_exception_approvals.sql`** — `supplier_risk_approved` + `discontinue_approved` on
    purchase_order_lines (Order Plan exception sign-off, like partial_carton_approved). Idempotent.
  - **`071_fix_po55ukxr2_lines.sql`** — data fix: PO-55UKXR2's order-plan lines were wrong (extra SKUs not on
    the real Cin7 PO). Upserts the correct 48 lines + deletes the rest. Idempotent. Run **after** the PO/ERP
    data seed (§7).
  - **`072_client_fba_tab.sql`** — `purchase_orders.client_deadline_date` + `portal_attachments.category`
    (separates Client/FBA docs from supplier invoice docs). Idempotent.
  - **`073_po_asn_numbers.sql`** — `purchase_orders.asn_numbers` (comma-separated ASN numbers; PO Shipments
    sub-tab / iFulfillment). Idempotent.
  - **`074_supplier_po_confirmation.sql`** — `supplier_confirmed_at` / `supplier_confirmed_by` on
    purchase_orders (supplier PO confirmation workflow). Idempotent.
  - **`075_shipment_notes.sql`** — `planner.shipment_notes` (per-shipment timeline; admin + portal).
  - **`076_shipment_escalated.sql`** — `shipments.escalated` / `escalated_at` (ESCALATED toggle + filter + Action).
  - **`077_prod_require_confirmation.sql`** — `prod_numbers.require_supplier_confirmation` (bool, default FALSE):
    per-production switch that turns the supplier-confirmation workflow on/off. **Live portal bootstrap must also
    surface `require_confirmation` per PO** (derive from `prod_numbers.require_supplier_confirmation` by `prod_no`,
    same as the `purchase-orders` endpoint) so the portal only asks for confirmation when the production requires it.
  - **`078_shipment_notes_read.sql`** — `shipment_notes.read_at` (read/unread on the shipment timeline; admin grid
    unread counter).
  - **`079_shipment_supplier_created.sql`** — `shipments.supplier_created_at` / `supplier_created_by` (flags a
    shipment a supplier created from the portal → raises the "Supplier created new shipment" action).
  - **`080_forecast_export_settings.sql`** — `planner.forecast_export_settings` (per-country email for the forecast
    CSV export).
  - ~~**`081_prod_no_p53_to_53.sql`**~~ — **SUPERSEDED by 083. Do NOT run 081 — run 083 instead** (083 covers
    P53 *and* every other Pnn). Left in the repo for history only.
  - **`083_streamline_prod_no.sql`** — **data streamline, HANDLE CAREFULLY (financial / Xero).** Strips the
    leading `P` from `prod_no` everywhere (→ canonical numeric form) and backfills the missing `prod_numbers`
    reference from the Xero account code. Fixes: deposits stuck on `P53/P54…`; productions split into `P54`+`54`;
    CONFIG showing `P48`; and productions (e.g. `46` = 141 POs) that never linked to their Xero account because
    `prod_numbers.prod_no` was NULL. Runs in a transaction with verification SELECTs; collision-guarded.
    Dry-run result: 0 P-prefixed left in purchase_orders/deposits, all NULL prod_numbers backfilled, **one
    manual item — `P66` exists twice (active row + closed row w/ Xero `620.46`); merge by hand.** Xero
    account-code strings are left unchanged (real GL labels). **`purchase_orders.prod_no` is n8n-sync-fed — fix
    the Airtable source too or the P-prefixed POs return on the next sync.** Idempotent.
  - **`082_po_shipment_starred.sql`** — adds `starred boolean NOT NULL DEFAULT false` to `purchase_orders`
    and `shipments` (⭐ Focus / favourite toggle on both grids). The PO/shipments read queries now select
    `starred`, so **apply this before deploying v20.401 or the grids will error**. Idempotent.
  - **`084_samples.sql`** — the **Samples** feature: `planner.sample_requests`, `sample_request_lines`,
    `sample_notes` (timeline, with `read_at` for bidirectional read/unread), and `supplier_charges`
    (sample/shipment charges → Other Payment on accept). Required for SUPPLY▸Samples + the portal Samples tab.
  - **`085_sample_change_requested.sql`** — adds `sample_requests.change_requested boolean NOT NULL DEFAULT false`
    (the "change requested after accept" re-accept workflow). Idempotent. ⬅ *latest.*

  **Invoice-upload feature (supplier portal) — live `/api/portal/*` to add (preview wired to `/api/supply/*`):**
  - `/api/portal/parse-invoice` + `/api/portal/invoice-apply` (parse a supplier `.xlsx` invoice → preview vs the
    order plan → apply qty/cost as `portal_line_costs` overrides; pure-Node parser, no dependency).
  - `/api/portal/docs` (list a PO's supplier documents) + `/api/portal/attachment-remove`; `portal-upload` takes a
    `category` (Commercial Invoice / Packing List / CI & PL / Transaction Certificate / Certificate of Origin /
    Photos / Other); bootstrap should include `docsByPo` per PO.

  **Forecast export by country (demand side) — endpoints, no live-portal wiring needed:**
  - `/api/forecast/country-csv/:country` (Forecast Analysis CSV layout), `/api/forecast/export-settings(/:country)`,
    `/api/forecast/email(/:country|-all)` (Resend), `/api/forecast/drivehq(/:country|-all)` (DriveHQ **WebDAV PUT**).

  **Live portal bootstrap (POS_SQL_PORTAL) — per-PO fields the admin preview computes client-side and the live
  portal must also provide:**
  - `ship_other_supplier`, `client_docs`
  - **`ships_with`** (= the PO's shipment ref) and **`ships_with_supplier`** (supplier owning that shipment's master PO)
  - **`require_confirmation`** (from `prod_numbers.require_supplier_confirmation` by `prod_no`)
  - **`ship_carrier`** / **`ship_carrier_ref`** (the linked shipment's `carrier` / `carrier_ref`) and **`flex_id`**
    (matched Flexport id) — drive the SHIPMENT sub-tab (read-only when a shipment is linked) and the grid Flexport col
  - **`production_status`** + **`prod_confirmed_age`** (supplier production status field + its confirmation age)

  **Live portal write paths Diviyaj must mirror (currently wired to `/api/supply/portal-submit` in the preview):**
  - **tracking/carrier** → applies to the PO's shipment; if the PO has **no** shipment, it must **create a master
    shipment** (ref = PO, master_po = PO), **assign the PO**, and stamp `supplier_created_at`/`_by` (raises the action).
  - **`production_status`** → set on the PO (validate against not_started/in_production/nearing_completion/complete/shipped;
    stamp `production_confirmed_at`).
  - The shipment payload for the **Shipment Plan** tab needs **`master_supplier`** (filters to the logged-in supplier)
    and **`carrier_ref`** (tracking shown on the card).

  **Samples feature (SUPPLY▸Samples + portal Samples tab) — live `/api/portal/*` to add (preview wired to `/api/supply/*`):**
  - Portal: `sample-accept`, `sample-update`, `sample-note`, `sample-notes/:id`, `sample-note-read/:id`,
    `sample-charge`, `sample-create`, `sample-attachment`, `sample-attachment-remove`. Bootstrap must return a
    `samples` array per supplier (lines, charges, attachments, `unread_dnb`, `is_open`, `status_calc`).
  - Charges accept (`/api/supply/charge/:id/accept`) posts an **Other Payment** (`planner.deposits`, `is_deposit=false`)
    with `reference` = sample/shipment ref and `date_due` = today.
  - Attachments reuse `planner.portal_attachments` (`category='sample'`, `po` = sample ref) — no new table.
  - On-behalf notes (D&B posting as the supplier in the preview pane) are stored `author_kind='supplier'`,
    `author_email='D&B'` and labelled "D&B as <supplier>"; they still notify the supply/samples page.

- **Fresh DB** (new env): run `migrations/schema.sql` once, then `062`–`085` in order (**skip 081 — superseded by 083**). Do **not** run
  `schema.sql` against an already-migrated DB (the table creates aren't idempotent).

---

## 2. Environment variables

- **`DATABASE_URL`** — production Supabase, **session-pooler** connection string.
- **`ANTHROPIC_API_KEY`** — for the server-side AI calls (use a current model id, e.g. `claude-sonnet-4-6`).
- **`CIN7_AUTH`** — Cin7 API auth. Accepts **either** the full header (`Basic <base64 user:key>`) **or** a bare
  `<base64>` (code adds `Basic `); or set **`CIN7_USERNAME`** + **`CIN7_KEY`** and the code base64-encodes them.
  Used by the Cin7 buttons in the PO ▸ Update-ERP popup — **"Update Cin7 Date"**, **"Update Cin7 SKUs/Qty/Price"** —
  and the bulk **"Sync Cin7 dates"** button (PUTs the planner completion date for every active date-mismatched PO).
  Cin7 writes **preserve the PO's current approval status** (read isApproved, echo it; new POs created as **draft**).
  On a successful write the local **ERP mirror is updated** so drift flags clear in real time. **Until set, all Cin7
  endpoints safely no-op (HTTP 501).** ⚠ Confirm the lineItems field names (`code`/`qty`/`unitCost`) against your account.
- **`RESEND_API_KEY`** (+ optional **`PORTAL_FROM`**) — email provider for the supplier-portal **magic-link** AND the
  **forecast "Email country" / "Email all"** feature. Until set, both log/stub instead of sending.
- **`WEBDAV_BASE`**, **`DRIVEHQ_USER`**, **`DRIVEHQ_PASS`**, **`TARGET_FOLDER`** — DriveHQ **WebDAV** upload for the
  forecast CSVs (HTTP PUT + Basic auth → `WEBDAV_BASE/TARGET_FOLDER/forecast_<CO>_12mo.csv`, fixed filename overwrites).
  Tested live (HTTP 204). Until set, the DriveHQ buttons no-op with a clear message.

No secrets in git — reference by env-var name only.

---

## 3. ERP (Fulfil/Cin7) integration — misalignment + upload  ⬅ NEW (v20.293–v20.294)

The planner detects when a PO is misaligned with the ERP and surfaces it on **SUPPLY ▸ Purchase Orders**
(the **⬆ NEEDS ERP** filter, per-row **⚠ Date ≠ ERP** badge, and ERP recon summary). Wiring needed:

- **Run migration `062_erp_purchase_orders.sql`** — creates `planner.erp_purchase_orders`
  (`po`, `erp_po_id`, `final_delivery_date`, `status`, `raw jsonb`, `synced_at`). No FK, so the sync
  isn't blocked by a missing planner PO.
- **n8n inbound (ERP → planner):**
  - **Mirror NEW POs created directly in the ERP** into the planner (the ERP is the source of truth for
    PO lines). **Upsert** `planner.purchase_orders` + `planner.purchase_order_lines` keyed on the **PO ref**
    so a PO raised in Cin7/Fulfil appears in SUPPLY automatically. On insert, set `qty = erp_qty` and
    `cost_price = erp_cost` so it lands **"in sync"**. **Must-get-right:**
    - **Resolve `supplier_id` from `supplier_name`** on upsert (the payment-terms / lead-time calc joins on
      `supplier_id`; without it, terms won't apply). The CSV importer + `po-create` do this already — mirror that.
    - **Preserve the planner's overlay fields** on re-sync — don't clobber: `deposit_ref`, `pay_*` assignments,
      `*_overide` dates, `client*` / `sales_order_ref` / `dispatch_order_ref` / `final_delivery_address`,
      `crossdock_skus`, `credit_amount`, `notes`, and `purchase_order_lines.partial_carton_approved`.
    - **Don't duplicate planner-originated POs**: POs created in the planner (New PO / BUY→PO) sit at
      `erp_qty=0` ("not in ERP") until pushed — match on PO ref so the inbound sync updates them rather than
      inserting a second row.
    - For a line edited in the planner (`proposed_at` set), refresh `erp_qty`/`erp_cost` from the ERP but
      leave the planner's `qty`/`cost_price` (the proposed change) so the drift stays visible until reconciled.
  - Populate **`planner.erp_purchase_orders`** (header) from Fulfil/Cin7 — at minimum `erp_po_id`,
    `final_delivery_date`, `status`; stamp `synced_at`. This drives the **date** check
    (our calculated *completed-at-warehouse* date vs the ERP `final_delivery_date`).
  - Keep populating **`purchase_order_lines.erp_qty` / `erp_cost`** from the ERP — this drives the
    **qty/cost** drift check (never-pushed + per-line drift).
  - Run this on a schedule (the current `erp_qty`/`erp_cost` are a one-time Cin7 import, not live — so
    today "in sync" means "matches the import," not "matches the live ERP").
- **n8n outbound (planner → ERP) — the "Upload to Fulfil" webhook:**
  - Every upload affordance in the UI (PO-grid ERP buttons, Order-Plan ⬆ Upload, Actions ⬆ Upload to ERP)
    is currently **inert** — it shows *"Upload feature not yet banked. To be integrated to Fulfil or Cin7."*
    and does nothing (it does **not** fake a local sync, so misalignment stays visible).
  - The server endpoint **`POST /api/supply/po/:po/upload`** is left in place. When the n8n webhook is
    built, point the UI buttons at it (re-enable the handlers in `supply/inject.html` — currently they call
    `erpUploadInert()`) and have n8n create/update the Fulfil PO from the staged change. Writing to the live
    ERP is a **gated** action (confirm per the hard rules).
- **Sandbox note:** Ben's sandbox has 2 test rows in `planner.erp_purchase_orders`
  (`PO-1579063` mismatch, `PO-1596956` match) used to validate detection — these are test data only,
  **do not copy to prod**.
- **Deferred (not built):** a matching date card in SUPPLY ▸ Actions — needs the completion-date calc
  shared between the PO query and the Actions query first (avoid two calcs diverging).

### Cleaner ERP-sync model (migration `064_erp_sync_model.sql`)  ⬅ NEW — target architecture
Separates the ERP truth from the plan so drift is explicit:
- **ERP mirror** (n8n-written, planner read-only): `planner.erp_purchase_orders` (header, extended) +
  **`planner.erp_purchase_order_lines`** (lines, NEW). This is the n8n **inbound** write target — upsert
  both keyed on `po` (+ `sku` for lines). One-time CSV snapshot can be loaded now via the two new templates
  (`supply_import_templates/erp_purchase_orders.csv`, `erp_purchase_order_lines.csv`).
- **Drift view** `planner.v_erp_po_drift` = the diff between the plan and the mirror
  (`po_not_in_erp` / `po_not_in_planner` / `qty_change` / `cost_change` / `line_not_in_erp` /
  `line_not_in_planner` / `completion_mismatch`). Drives the exceptions/actions list **and** the outbound
  push payload. ERP status is **open/complete** only (Cin7); the planner's management lifecycle isn't
  compared except the completed state must agree (`completion_mismatch`).
- This **supersedes** the embedded `purchase_order_lines.erp_qty/erp_cost` columns. **DONE (v20.333):** the
  app now reads all ERP drift (PO grid NEEDS-ERP, Order-Plan Update-ERP, Actions) from
  `planner.erp_purchase_order_lines`; the embedded columns are deprecated (no longer read). n8n inbound must
  now feed `erp_purchase_order_lines` (not the embedded columns); ERP CSV load = `erp_purchase_order_lines.csv`.
- **Run migration `064` on prod** (creates the lines mirror + view + extra header columns).

---

## 4. n8n data population (ETL)

- **Product fields** for the portal / labels / detectors:
  - `products.cogs_{uk,us,eu,au,ca}_3pl_final` (**migration `060`**) — feed via n8n on prod.
  - `size_short`, `variant_type` (used by the supplier portal / barcode labels).
- **Sales actuals:** confirm **≥ 2 years of monthly actuals** history is present — the DEMAND ▸ Actions
  detectors (forecast-vs-trend, anomalies, A-player) rely on it.
- **Inbound stock (`planner.inbound_shipments`):** sync both `source_type='supplier_china'` (supplier PO
  landings) **and `source_type='branch_transfer'`** (3PL↔3PL and 3PL/AWD → FBA replenishments) — these feed
  on-order/cover at each destination warehouse. CSV template: `supply_import_templates/inbound_shipments.csv`.
  Branch transfers are inbound-only here; the source warehouse's reduction comes from its live `product_inventory`.

---

## 5. Infra (Diviyaj-owned, not wired by Ben)

- Vercel production deploy + custom domain (every branch already gets a preview URL).
- Supabase migrations on prod (run the new numbered files per §1).
- n8n workflows (the pipelines in §3–§4).

---

## 6. Payments: single derived model (`payment_transactions` being retired)  ⬅ UPDATED (v20.307)

**Design (agreed with Ben).** A payment is **derived from its source-of-truth table**, not duplicated into
a separate ledger:
- **PO Completion + Balance** — `purchase_orders.pay_completion_*`, `pay_balance_1_*`, `pay_balance_2_*`.
- **Deposits** — `planner.deposits` (`is_deposit=true`) is the real deposit-payment register (~£8M back to
  2017, incl. negative credit-notes/write-offs).
- **Other payments** — `planner.deposits` (`is_deposit=false`).
- **Starting deposits are NOT payments** — a PO's start-deposit milestone is a drawdown/allocation against
  a register deposit, so it is excluded from the report entirely.

As of **v20.307** the **Payments Report** is fully derived from the above and **no longer reads
`payment_transactions`**. Validated: completion (87/87) + balance (138/138) legs reproduce exactly from the
plan (£0 drift); deposits come from the register; Other from is_deposit=false.

**Still to do (needs Diviyaj + a migration — NOT in v20.307):**
1. **Repoint the Payments register view + Xero export** off `payment_transactions` onto the same derived
   lines. (They are the only remaining readers.)
2. **Consolidate the two FX overlays** — `payment_fx` (run_date+supplier) and `payment_run_meta` (run_date)
   — into a single per-run overlay table `payment_runs(supplier, date, bank_amount, currency, fx_rate)`.
   This is the only thing the source tables lack (the actual bank settlement amount/currency for FX/Xero).
3. **Drop `payment_transactions`** once 1–2 are done. Before dropping, confirm nothing is lost: every
   completion/balance reproduces from the plan; deposits from the register; the one historical orphan
   (`PO-1699318`, MQ Print £1,413) has been loaded into `deposits` as an Other payment.
4. In production, **n8n** keeps feeding the source tables (deposit register, PO milestones) — there is no
   longer a separate ledger for it to write.

---

---

## 7. PO + ERP data seed (one-time load)  ⬅ NEW

Seeds the planner's PO tables from Ben's PRODUCTION-MASTER (plan side) + a Cin7 OrdersExport (ERP mirror).
Delivered as a separate package: **`po-erp-migration-for-diviyaj.zip`** — contains the 3 cleaned CSVs, the
`suppliers_add.sql` (= migration `069`), and a `MIGRATION_INSTRUCTIONS.md` with the full load order, supplier
normalisation map, status rules, and post-load sanity checks. Ben has already run this against his sandbox and
verified it. Load order: migration `069` → `erp_purchase_orders.csv` (upsert on `po`) →
`erp_purchase_order_lines.csv` (upsert on `po,sku`) → `purchase_order_lines.csv` (upsert on `po_sku`, plan
columns only — do **not** clobber `erp_qty`/`erp_cost`/`proposed_at`). Two prod checks called out there:
confirm `erp_purchase_orders` has a unique index on `po` (else delete-then-insert), and that the drift view
tolerates the `shipping` status.

---

_Last updated: v20.338 (26 Jun 2026)._
