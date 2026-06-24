# Supply data import templates — transactional core

CSV templates for bulk-loading the **SUPPLY** transactional data into the `planner` schema in Supabase.
Each `.csv` here has the header row + one worked example row. Columns map 1:1 to the live table columns
(only app-managed / calculated columns are deliberately omitted — see "Do NOT load" below).

> **Who loads these:** Diviyaj owns writes to production (`oolwklahstnvocaugryg`). For your sandbox you can
> import via Supabase Studio ▸ Table editor ▸ Import CSV (match by column name). These templates load to the
> tables; they are not pasted into the app UI.

## Conventions (all files)

- **Dates:** `YYYY-MM-DD` (e.g. `2026-03-01`). Leave blank for unknown — blank = NULL.
- **Numbers:** plain, no currency symbol or thousands separators (`48250.00`, not `$48,250`). All money is **USD**
  unless a `*_currency` column says otherwise.
- **Booleans:** `true` / `false`.
- **Blank cell = NULL.** Don't put `0` where you mean "unknown".
- **Encoding:** UTF-8, comma-delimited, quote any value containing a comma.

## Load order (because rows reference each other)

These reference tables must already exist (they do in the sandbox) and rows are matched **by name/ref**, so make
sure your values match exactly:
`suppliers.name` · `prod_numbers.prod_no` · `branches.name` · `products.sku`

Then load in this order:
1. `deposits.csv`
2. `shipments.csv`
3. `flexport_shipments.csv`  *(independent — can load anytime)*
4. `purchase_orders.csv`
5. `purchase_order_lines.csv`
6. `payment_transactions.csv`

## Do NOT load (app-managed or calculated — leave to the system)

- Surrogate keys & timestamps: `id`, `po_sku`, `created_at`, `updated_at`, `proposed_at`, `production_confirmed_at`.
  (`id` and `po_sku` are auto-generated; `po_sku` = `po` + `sku`.)
- **PO ship / landing / delivery / completion dates** — these are *calculated* from `start_production` +
  supplier production days + branch lead times + any linked shipment. Only `start_production` (and optionally
  `end_production_overide`) are loaded; the rest derive. A linked shipment's dates override the PO's.
- Deposit pool maths: `deposit_used`, `deposit_remaining`, `linked_pos` — computed from PO drawdowns.
- `supplier_id` on POs/deposits — resolved from `supplier_name` on import (load the name, not the id).

---

## purchase_orders.csv

The PO header. **Key = `po`** (unique, your PO reference, e.g. `PO-56UKLX1`).

| column | req | notes |
|---|---|---|
| po | ✔ | Unique PO reference. |
| supplier_name | ✔ | Must match `suppliers.name` exactly (drives payment terms + production lead time). |
| status | ✔ | One of: FUTURE, PRODUCTION, READY TO SHIP, SHIPPING, DELIVERED, COMPLETE. |
| prod_no |  | Production number; match `prod_numbers.prod_no` (e.g. `P56`). |
| batch_id |  | Buying batch. |
| branch | ✔ | Must match `branches.name` (e.g. `UK ILG`, `US Geneva`, `DE FBA`). Sets country + sea/air lead time. |
| country_code |  | Override branch country: UK / US / EU / AU / CA / DIRECT. Blank = use the branch's country. |
| container_size |  | `20ft`, `40ft` or `LCL` (drives sea-freight estimate). |
| shipment_ref |  | Links to `shipments.shipment_ref`. Blank = not yet assigned. |
| erp_po |  | The Cin7/Fulfil PO number. |
| flexport_reference |  | The Flexport `flex_id` if linked directly. |
| deposit_ref |  | Links to `deposits.reference` (the deposit pool this PO draws on). |
| start_production | ✔* | The production start date — the anchor for all calculated dates. |
| end_production_overide |  | Manual production-end date; blank = start + supplier production days. |
| order_value_estimation |  | Estimated PO value (USD) if there are no order-plan lines yet. Lines override this. |
| supplier_invoice_total |  | Final supplier invoice (USD). Trumps the estimate for every payment / landed-cost calc. |
| start_deposit_pct_override |  | Override supplier's start-deposit %. Blank = use supplier term. |
| completion_pct_override |  | Override supplier's completion %. Blank = use supplier term. |
| pay_start_deposit_assigned |  | Actual start-deposit paid (USD). |
| pay_start_deposit_date |  | Date that deposit was paid. |
| pay_completion_assigned |  | Actual completion payment (USD). |
| pay_completion_date |  | Date completion paid. |
| pay_balance_1_amount |  | Actual balance payment (USD). |
| pay_balance_1_date |  | Date balance paid. |
| pay_balance_2_amount / pay_balance_2_date |  | Optional second balance split. |
| production_status |  | Supplier confidence: not_started / in_production / nearing_completion / complete / shipped. |
| notes |  | Free text. |

\* `start_production` isn't strictly required by the DB, but without it none of the PO dates can calculate.

## purchase_order_lines.csv

One row per PO × SKU. **Key = (`po`, `sku`)**; `id`/`po_sku` auto-generate.

| column | req | notes |
|---|---|---|
| po | ✔ | Must match a `purchase_orders.po`. |
| sku | ✔ | Must match `products.sku`. |
| qty | ✔ | Ordered units (planned). |
| cost_price |  | Unit cost (USD). PO value = Σ(qty × cost_price) across lines. |
| carton_qty |  | Units per carton (for the full-carton check). |
| erp_qty |  | Qty as it stands in the ERP. Lets the tool flag drift (planned vs ERP). Set = qty if already in ERP. |
| po_status |  | Optional per-line status mirror. |

## shipments.csv

Groups one or more POs into a physical shipment. **Key = `shipment_ref`.** A shipment's dates **override** the
PO's calculated dates and Flexport.

| column | req | notes |
|---|---|---|
| shipment_ref | ✔ | Unique shipment reference (often the master PO number). |
| master_po |  | The lead PO of the shipment. |
| carrier |  | Flexport / DHL / Fedex / FOB / Other. |
| carrier_ref |  | Carrier tracking / Flexport `flex_id`. If this = a `flexport_shipments.flex_id`, dates auto-link. |
| mode |  | `sea`, `air` or `fob` (drives freight cost + lead time). |
| departure_date |  | Departs origin. |
| landing_date |  | Lands at destination port. |
| arrival_date |  | Arrives (port/hub). |
| delivery_date |  | Delivered to warehouse / client. |
| status |  | Planned / Active / Complete. |
| cost_manual |  | Manual freight cost override (USD) — used when there's no Flexport quote. |
| tracked_delivery_date |  | DHL/Fedex tracked delivery date (manual for now). |
| tracked_source |  | Source of the tracked date (e.g. DHL). |
| notes |  | Free text. |

## flexport_shipments.csv

Data exported from Flexport. **Key = `flex_id`.** Links to a shipment when `shipment_name` = a
`shipments.shipment_ref` **or** `flex_id` = a `shipments.carrier_ref`.

| column | req | notes |
|---|---|---|
| flex_id | ✔ | Flexport shipment id. |
| shipment_name |  | Should equal the matching `shipments.shipment_ref`. |
| mode |  | Ocean / Air (Flexport's wording). |
| status_description |  | Flexport status text. |
| incoterm |  | FOB / EXW / etc. |
| freight_type |  | FCL / LCL / Air. |
| mbl_number |  | Master bill of lading. |
| container_numbers |  | Container number(s). |
| packing_date / departure_date / landing_date / arrival_date / cleared_customs_date |  | Milestone dates the app reads. |
| planned_transit_time / actual_transit_time |  | Days. |
| total_quoted_amount |  | Freight quote (USD) — used as the freight estimate when present. |
| total_freight_cost |  | Actual freight billed (USD). |
| customs_duty_cost |  | Duty billed by Flexport (USD). |
| vat_costs |  | Import VAT billed (USD). |
| total_invoiced_amount |  | Total Flexport invoice (USD). |

## deposits.csv

The deposit / sundry-payment register (entered directly here — not ERP-fed). **Key = `id` (auto)**;
`reference` groups a pool that several POs can draw on.

| column | req | notes |
|---|---|---|
| reference |  | Pool key (e.g. `DEP-LX-2026Q1`). Multiple rows can share it (installments). Blank = standalone payment. |
| is_deposit | ✔ | `true` = deposit; `false` = "Other" sundry cost (freight fee, write-off…). |
| supplier_name |  | Match `suppliers.name`. |
| prod_no |  | Production this relates to. |
| country |  | UK / US / EU / AU / CA. |
| description |  | Free text. |
| amount |  | Amount (USD). |
| date_due |  | When the deposit is due. |
| date_paid |  | When it was paid (blank = unpaid). |
| estimated_pay_date |  | Expected pay date if not yet paid. |
| xero_fx |  | FX adjustment (USD) for Xero reconciliation. |
| xero_account_code |  | GL account code. |
| status |  | e.g. paid / pending. |
| production_contract |  | Contract reference. |

## payment_transactions.csv

The actual payments ledger (what was paid, grouped into runs). **Key = `id` (auto).**

| column | req | notes |
|---|---|---|
| payment_date | ✔ | Date the payment was made. |
| payment_run_ref |  | Groups payments made together in one bank run. |
| transaction_reference |  | What it pays — usually the PO number. |
| transaction_type | ✔ | Deposit / Completion / Balance / Other. |
| transaction_amount | ✔ | Amount in **USD** (base). |
| transaction_supplier |  | Supplier paid. |
| invoice_reference |  | Supplier invoice number. |
| deposit_ref |  | Deposit pool reference if drawn from one. |
| paid_currency |  | Currency actually paid (e.g. CNY, GBP). |
| paid_amount |  | Amount in `paid_currency`. |
