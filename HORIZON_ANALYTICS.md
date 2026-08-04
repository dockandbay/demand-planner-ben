# HORIZON → Claude Project (conversational analytics)

Set up a Claude.ai **Project** that can answer questions about the live HORIZON data in
plain English ("how many BAGTOI-MD units did we sell in the US on FBA last quarter?",
"which suppliers have the most overdue payments?", "what's our forecast vs actual by
category?"). Claude queries the production Supabase **read-only** via the connector.

---

## 1. Prerequisite (one-time)
The **Supabase connector** must be connected to your claude.ai account.
Check: claude.ai ▸ Settings ▸ **Connectors** → "Supabase" should be listed. If not, add it
at https://claude.ai/customize/connectors and authorise with the Supabase account that owns
the production project.

Production project ref: **`oolwklahstnvocaugryg`** (the shared/live HORIZON database).

## 2. Create the Project
1. claude.ai ▸ **Projects** ▸ **New project** → name it e.g. **"HORIZON Analytics"**.
2. Open the project ▸ **Settings / connectors** ▸ enable the **Supabase** connector for this project.
3. Paste the block in **§3** into the project's **custom instructions**.
4. Upload the **§4** schema cheat-sheet as **project knowledge** (paste it into a file/doc, or add it to the instructions) so Claude knows the tables without rediscovering them each chat.

## 3. Project custom instructions (paste verbatim)

```
You are an analytics assistant for HORIZON, Dock & Bay's demand & supply planner.
Answer questions about our operations by querying the live Supabase database with the
Supabase connector's execute_sql tool.

DATABASE
- Project id: oolwklahstnvocaugryg
- All tables are in the `planner` schema (always schema-qualify, e.g. planner.sales_actuals).

RULES
- READ-ONLY. Only run SELECT queries. Never INSERT, UPDATE, DELETE, TRUNCATE, ALTER, or
  apply_migration — this is production data. If a question implies a change, explain it
  instead of doing it.
- IGNORE backup tables: anything starting with `z_`, or ending `_bak_YYYYMMDD`, or named
  like `*_pruned_*`. Use the live tables listed in the cheat-sheet.
- Prefer aggregate queries with clear GROUP BY / date filters; add LIMIT when exploring.
- When unsure of columns, run `SELECT * FROM planner.<table> LIMIT 3` or query
  information_schema.columns first.

CONVENTIONS
- Markets / countries: UK, US, EU, AU, CA.
- Sales channels: DTC (website), FBA (Amazon), B2B (wholesale/key accounts).
- planner.sales_actuals.month is a DATE at the 1st of the month; units + revenue per
  sku × country × channel × month. This is the source of truth for actual sales.
- Forecasts live in planner.forecast_outputs (the saved plan) — join to sales_actuals on
  sku/country/channel/month to compare forecast vs actual.
- Inventory (on-hand) is in planner.products as inventory_<warehouse> columns
  (e.g. inventory_uk_3pl, inventory_us_fba, inventory_uk_nongrs, inventory_us_awd).
- Open stock coming in is planner.inbound_shipments (quantity vs received_quantity;
  estimated_delivery_date; destination_warehouse like 'uk_3pl'/'us_fba').
- Money: costs are held in the supplier's currency (suppliers.default_currency, default
  USD); the reporting base currency is GBP. Actual bank payments + currency per run are in
  planner.payment_fx and planner.deposits. Always state the currency in answers.
- Dates: present dates as dd-Mmm-yy (e.g. 29-Jul-26).

STYLE
- Show the SQL you ran (brief), then the answer with the key numbers. Round sensibly.
- If a result set is large, summarise + show the top N and say what was truncated.
```

## 4. Schema cheat-sheet (add as project knowledge)

Core analytics tables (row counts approximate, live):

| Table | ~rows | What it is | Key columns |
|---|---|---|---|
| `planner.sales_actuals` | 83k | **Actual sales** — the fact table | sku, country, channel, month (date), units, revenue, source |
| `planner.forecast_outputs` | 34k | Saved demand **forecast** (the plan) | sku, country, channel, month, units (introspect for exact cols) |
| `planner.products` | 2.7k | **SKU master** (185 cols) | sku, product_name, category, subcategory, market_tier, core_seasonal, launch_date_*, discontinue_date_*, inventory_* (on-hand per wh), cost/cost_lx/cost_xr, target_cover_weeks_*, case_pack_size, moq, main_supplier_final |
| `planner.inbound_shipments` | 2k | Inbound stock (POs + transfers) | sku, reference (PO), quantity, received_quantity, estimated_delivery_date, destination_warehouse, source_type |
| `planner.purchase_orders` | 1.4k | **Purchase orders** | po, supplier_name, status, country_code, branch, start_production, end_production_overide, pay_* (deposit/completion/balance amounts+dates), supplier_invoice_total, shipment_ref, prod_no |
| `planner.purchase_order_lines` | 6.8k | PO line items | po, sku, qty, carton_qty, cost_price |
| `planner.shipments` | 650 | Master shipments (consolidations) | shipment_ref, master_po, carrier, departure_date, landing_date, arrival_date, delivery_date, status, mode |
| `planner.deposits` | 330 | Supplier **cash payments** (deposits + other) | reference, supplier_name, amount, date_paid, date_due, date_likely_pay, is_deposit, prod_no, country, xero_account_code |
| `planner.payment_fx` | 430 | Bank amount + currency per payment run | run_date, supplier, paid_amount, paid_currency |
| `planner.suppliers` | 17 | Suppliers | id, name, code, default_currency, production_days, incoterm, credit_days |
| `planner.branches` | 19 | Warehouses / destinations | name, country_code, sea_lead_time_days, air_lead_time_days |
| `planner.key_accounts` / `planner.key_account_forecasts` | 4 / 66 | Key-account (B2B) plan | client, sku, month, units |
| `planner.preorders` | 120 | Preorders (committed B2B demand) | sku, country, month, units |
| `planner.categories` / `planner.subcategories` | 25 / 34 | Category reference | name, ordering |
| `planner.contribution_targets` | 650 | Sell-through / contribution targets | category/subcat, target |

Reference / ops tables you may also query: `erp_purchase_orders`, `erp_purchase_order_lines`
(Cin7/ERP mirror), `duty_rates`, `import_tax_rates`, `freight_rates`, `air_freight_rates`,
`transfer_lead_times`, `prod_numbers`, `flexport_shipments`.

Ignore: every `z_*`, `*_bak_YYYYMMDD`, and `*_pruned_*` table (old backups).

## 5. Try it
Once set up, ask the project things like:
- "Total units and revenue by market and channel for the last 3 complete months."
- "Top 10 SKUs by revenue this year; how does each compare to its forecast?"
- "Which POs have an unpaid balance past its due date, and how much (in supplier currency)?"
- "Which SKUs in the US have less than 4 weeks of FBA cover vs their forecast?"
- "How much stock (units + value) is inbound but overdue (ETA passed, not received)?"

---
*Read-only analytics only. For any change to HORIZON data, go through the app or Diviyaj —
never let the analytics project write to production.*
