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
- Forecasts: planner.forecast_outputs is the saved final plan, keyed sku x WAREHOUSE x
  channel x month (units). Warehouse encodes country+fulfilment: '<cc>_3pl' (e.g. uk_3pl)
  serves the DTC+B2B channels, '<cc>_fba' serves FBA. To compare forecast vs actual, map
  warehouse->country (the prefix) and treat _3pl as DTC+B2B combined. (planner.forecasts is
  the raw forecast-engine output per run; use forecast_outputs for "the plan".)
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
| `planner.sales_actuals` | 84k | **Actual sales** — fact table (source of truth) | sku, country, channel, month (date, 1st-of-month), units (numeric), revenue (numeric), source, loaded_at |
| `planner.forecast_outputs` | 34k | Saved demand **forecast** (the plan) | sku, **warehouse**, channel, month (date), units (int), source, updated_at — NB keyed by warehouse, not country |
| `planner.forecasts` | 40k | Raw forecast-**engine** output per run | run_id, level, subcategory, country, channel, sku, warehouse, month, units, method, reason |
| `planner.products` | 2.7k | **SKU master** (185 cols) | sku, product_name, category, subcategory, market_tier, core_seasonal, launch_date_uk/us/eu/au(+_final), discontinue_date_final/_ca, inventory_<wh> (on-hand: inventory_uk_3pl, inventory_us_fba, inventory_uk_nongrs, inventory_us_awd…), case_pack_size, carton_qty, moq, main_supplier_final, cost/cost_lx/cost_xr, target_cover_weeks_<cc>_<3pl\|fba>, release_window, status, clearance |
| `planner.inbound_shipments` | 2k | Inbound stock (POs + transfers) | id, reference (PO), sku, source_type, source_location, destination_warehouse, quantity, received_quantity, estimated_delivery_date, status |
| `planner.purchase_orders` | 1.4k | **Purchase orders** (79 cols) | po, supplier_name, supplier_id, status, country_code, branch, prod_no, shipment_ref, start_production, end_production_overide, warehouse_complete_date, landing_date_overide, supplier_ship_date, supplier_invoice_total, pay_start_deposit_assigned/_date, pay_completion_assigned/_date, pay_balance_1_amount/_date, pay_balance_2_amount/_date, production_status |
| `planner.purchase_order_lines` | 6.8k | PO line items | id, po, sku, qty, carton_qty, cost_price, po_status, erp_qty, erp_cost |
| `planner.shipments` | 650 | Master shipments (consolidations) | shipment_ref, master_po, carrier, mode, departure_date, landing_date, arrival_date, delivery_date, status, branch, country_code |
| `planner.deposits` | 330 | Supplier **cash payments** (deposits; `is_deposit=false` = sundry "other") | reference, supplier_name, supplier_id, prod_no, country, description, is_deposit, amount, date_due, date_likely_pay, date_paid, xero_fx, deposit_used, deposit_remaining, linked_pos, xero_account_code, status |
| `planner.payment_fx` | 430 | Bank amount + currency per payment run | run_date, supplier, paid_currency, paid_amount |
| `planner.payment_transactions` | 1.8k | Imported payment ledger (import-only) | (introspect) |
| `planner.suppliers` | 17 | Suppliers | id, code, name, default_currency, production_days, incoterm, credit_days, kind |
| `planner.branches` | 19 | Warehouses / destinations | name, country_code, sea_lead_time_days, air_lead_time_days |
| `planner.key_accounts` / `planner.key_account_forecasts` | 4 / 66 | Key-account (B2B) plan | KAF: client, sku, warehouse, ship_date, quantity, source |
| `planner.preorders` | 120 | Preorders (committed B2B demand) | reference, sku, warehouse, ship_date, quantity |
| `planner.categories` / `planner.subcategories` | 25 / 34 | Category reference | category/subcategory, is_active, grouping (subcat: is_seasonal) |
| `planner.contribution_targets` | 650 | Sell-through / contribution targets | category, country, channel, market_tier, target_contribution_pct |
| `planner.prod_numbers` | 62 | Production numbers | prod_no, status, xero_account_code, xero_account_name |
| `planner.transfer_lead_times` | 11 | 3PL→3PL transfer lanes we run | from_market, to_market, weeks |

Reference / ops tables you may also query: `erp_purchase_orders`, `erp_purchase_order_lines`
(Cin7/ERP mirror), `duty_rates`, `import_tax_rates`, `freight_rates`, `air_freight_rates`,
`flexport_shipments`.

**Warehouse ↔ country/channel** (to compare `forecast_outputs`/`preorders`/`key_account_forecasts`, which use a warehouse, against `sales_actuals`, which uses country+channel):
- `<cc>_3pl` (uk_3pl, us_3pl, eu_3pl, au_3pl) → country `<CC>`, serves the **DTC + B2B** channels.
- `<cc>_fba` (uk_fba, …, ca_fba) → country `<CC>`, serves the **FBA** channel.
So map the warehouse prefix to the country, and treat `_3pl` as DTC+B2B combined, `_fba` as FBA.

Ignore: every `z_*`, `*_bak_YYYYMMDD`, and `*_pruned_*` table (old backups); and low-value
app-state tables (`portal_*`, `*_notes`, `*_change_log`, `supply_action_state`, `suggestions`,
`weather_cache`) unless specifically asked.

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
