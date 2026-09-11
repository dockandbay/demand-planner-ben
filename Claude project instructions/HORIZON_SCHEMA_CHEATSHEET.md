# HORIZON — Schema cheat-sheet (join keys)

Lightweight reference for querying the HORIZON database (Supabase project `oolwklahstnvocaugryg`, schema
**`planner`**, read-only). For full feature detail see `HORIZON_SYSTEM_HANDOVER.md`. Current at app v25.410.

**Golden rules**
- Everything is in the `planner` schema. Qualify tables (`planner.purchase_orders`).
- Only **14 real foreign keys** exist — **most links are by convention on text keys**: `po`, `sku`,
  `warehouse` (`uk_3pl`…`ca_fba`), `supplier_name`, `reference`. Join on those.
- **On-hand stock = `planner.products.inventory_*`** (or the `v_product_inventory` view). Ignore
  `product_inventory` (orphaned).
- **Planning units = `products.variant_type='MASTER'` AND `in_planning_scope=true`**.
- **Month keys:** `sales_actuals.month` / `forecasts.month` are dates -> bucket with
  `to_char(month,'YYYY-MM')`. The demand grid uses `YYYY_MM` strings.

---

## Core entities & how they join

### products (the master; 182 cols) — key: `sku`
- Identity: `sku`, `product_name`, `variant_type` (MASTER/SET), `category`, `subcategory`, `market_tier`,
  `core_seasonal`, `in_planning_scope`.
- Availability: `available_<uk|us|eu|au|ca>_<dtc|fba|b2b>` (booleans).
- Launch/discontinue: `launch_date_<c>[_final]`, `discontinue_date_final` (+ `_au_final`, `_ca`).
- **On-hand:** `inventory_<c>_<3pl|fba>`, `inventory_us_awd`, `inventory_<uk|us>_nongrs`.
- Costs/dims: `cogs_<c>_3pl_final`, `uk_/us_ prod|pack|carton _(w|h|l|wt)`.
- Invoice: `sku_invoice_title`, `hscode_<c>`.  Leads: `production_lead_time_weeks`, `china_to_<c>_lead_time_weeks`.
- Joins: `sku` <-> `sales_actuals.sku`, `purchase_order_lines.sku`, `forecasts.sku`, `inbound_shipments.sku`,
  `sku_labels.sku`, `preorders.sku`.

### purchase_orders (76 cols) — key: `po` (text)
- `supplier_id` -> **suppliers.id** (FK); `supplier_name` (denormalised).
- `branch` -> **branches.name**; `shipment_ref` -> **shipments.shipment_ref**; `deposit_ref` ->
  **deposits.reference**; `prod_no` -> **prod_numbers**; `batch_id` -> **batches**; `erp_po` ->
  **erp_purchase_orders.po**.
- Dates: `start_production`, `end_production_overide`, `days_production_overide`, `*_date_overide`.
- Payment plan: `pay_start_deposit_*`, `pay_completion_*`, `pay_balance_1/2_*`, `*_pct_override`,
  `credit_amount`, `order_value_estimation`.
- Status/flags: `status`, `production_status`, `require`-confirmation (via `prod_no`), `supplier_confirmed_*`,
  `crossdock_skus` (CSV of SKUs), `client`, `sales_order_ref`, `dtc_accepted_*`, `dtc_key_account`,
  `preship_not_required`, `asn_numbers`, `starred`, `pack_*`.
- Ship/delivery/completion dates are **computed at query time** (not stored): prod_end +7 = ship,
  + branch transit = delivery, +7 = completion.

### purchase_order_lines (17) — keys: `po`, `sku`
- `po` -> purchase_orders.po; `sku` -> products.sku. `qty`, `cost_price`.
- ERP deviation: `erp_qty`, `erp_cost`, `proposed_*`, `supplier_risk_approved`, `discontinue_approved`.

### suppliers (29) — key: `id` (also `name`)
- `default_currency`, `start_deposit_pct` / `completion_pct` / `balance_pct`, `credit_*`, `production_days`,
  `incoterm`, `cin7_member_id`, `te_id`. Joined by `purchase_orders.supplier_id`,
  `deposits.supplier_id`, `sample_requests.supplier_id`, `supplier_portal_users.supplier_id`.

### shipments (23) — key: `shipment_ref`
- `master_po` (the lead PO), `carrier`, `mode`, `departure/landing/delivery/arrival_date`, `escalated`,
  `branch`, `country_code`. POs attach via `purchase_orders.shipment_ref`.

### inbound_shipments (12) — confirmed inbound feed
- `reference` (usually a `po`), `sku`, `destination_warehouse` (-> warehouse_config), `quantity`,
  `received_quantity`, `estimated_delivery_date`, `status`. Outstanding = `quantity - received_quantity > 0`.

### deposits (23) — key: `reference`
- Deposit pools: `supplier_id` (FK), `amount`, `deposit_used`, `deposit_remaining`, `linked_pos`, `status`,
  `prod_no`, `xero_account_code`. POs draw via `purchase_orders.deposit_ref`.

### payments
- `payment_runs` (`id`, `invoice_reference`, `payment_date`, `total_payment`, `usd/gbp/eur_amount`).
- `payment_transactions` (ledger; `transaction_type`, `transaction_amount`, `transaction_supplier`,
  `po_completion`, `po_balance_1..3`, `deposit_ref`, `invoice_reference`) — import-only.

### forecasting & sales
- `sales_actuals` (81k) — `sku`, `country`, `channel` (DTC/FBA/B2B), `month`, `units`, `revenue`. The history.
- `forecasts` — `run_id` (-> forecast_runs.id), `level` (subcategory|sku), `sku`/`subcategory`, `country`,
  `channel`, `warehouse`, `month`, `units`, `method`. SKU-level = the committed per-SKU forecast.
- `forecast_outputs` — `sku`, `warehouse`, `channel`, `month`, `units` (saved cascade output).
- Targets: `contribution_targets`, `sell_through_targets`, `category_target_cover`,
  `product_target_cover_override`, `key_account_forecasts` (+ `key_accounts`).

### supplier portal
- `supplier_portal_users` (email <-> supplier, `active`), `portal_sessions`, `portal_magic_tokens`.
- `supplier_notes` (per-`po` timeline; `author_kind` internal|supplier, `read_at`).
- `supplier_submissions` (`po`, `kind` completion_date|invoice_value|tracking|carrier, `status`
  pending|applied|dismissed).
- `portal_line_costs`, `portal_additional_costs`, `crossdock_shipments` (`po`,`sku`,`qty`),
  `shipment_notes`, `supplier_charges`, `portal_attachments` (bytea).

### samples
- `sample_requests` — `ref` (e.g. SR-8), `supplier_id`, `purpose` (TEXT ARRAY: sales|product|photography|
  marketing|operations), `status`, `accepted_at`, `supplier_expected_completion`, `production_status`.
- `sample_request_lines` (`sample_id` FK), `sample_notes` (`sample_id` FK; timeline).

### reference / config
- `branches` (`name`, `country_code`, `sea/air_lead_time_days`), `warehouse_config` (`warehouse`, `country`,
  `warehouse_type`), `categories`/`subcategories` (FK), `channel_map`, `prod_numbers`, `batches`,
  `import_tax_rates`, `duty_rates`, `freight_rates`, `air_freight_rates`, `invoice_consignees`,
  `app_permissions`, `app_settings`, `bi_rules`, `trading_calendar`, `financial_model` +
  `scenario_fin_overlay`, `manufacturing_bom`.

### views
- `v_product_inventory(sku, warehouse, available)` — on-hand (unpivot of products.inventory_*).
- `v_product_availability(sku, country, channel, is_available)` — availability minus discontinued.
- `v_erp_po_drift` — PO vs Cin7 drift. `v_purchase_order_lines`, `category_sales_summary`.

---

## Declared foreign keys (the only enforced links)
```
deposits.supplier_id            -> suppliers.id
purchase_orders.supplier_id     -> suppliers.id
sample_requests.supplier_id     -> suppliers.id
supplier_portal_users.supplier_id -> suppliers.id
sample_notes.sample_id          -> sample_requests.id
sample_request_lines.sample_id  -> sample_requests.id
forecasts.run_id                -> forecast_runs.id
subcategories.category          -> categories.category
category_target_cover.warehouse -> warehouse_config.warehouse
inbound_shipments.destination_warehouse -> warehouse_config.warehouse
key_account_forecasts.warehouse -> warehouse_config.warehouse
preorders.warehouse             -> warehouse_config.warehouse
product_inventory.warehouse     -> warehouse_config.warehouse
product_target_cover_override.warehouse -> warehouse_config.warehouse
```
Everything else joins on the text keys noted above (`po`, `sku`, `warehouse`, `supplier_name`, `reference`).
