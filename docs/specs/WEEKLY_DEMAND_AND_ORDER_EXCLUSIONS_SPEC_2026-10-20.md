# Weekly demand (order-date actuals) + Order exclusions: spec (20-Oct-26)

Status: **agreed scope, not built**. Phase 1 = data layer + Order exclusions page. Phase 2 = weekly / monthly switchable Demand plan.

## 1. Why
- Today Demand plan actuals are **monthly by ship date** (planner.sales_actuals, fed from the actuals sheet by n8n).
- Ben (20-Oct-26) wants:
  - forecasting to move to **weekly**
  - actuals counted on the **order date**, except wholesale preorders, which count on the ship date
  - a searchable list of **anomaly orders** that can be excluded from history

## 2. Decisions (Ben, 20-Oct-26)

| Topic | Decision |
|---|---|
| Week | **ISO week, Monday start**. Shown as "W43 · 19-Oct-26" (dd-mmm-yy). |
| Actuals date | **Order date** = Fulfil `sale_date`. Not `created_at`: imported history has the import date there. |
| Ship-date exception | **Wholesale / B2B / distributor + key-account** orders where ship date > order date + 14 days count in their **ship** week. |
| History source | **Fulfil order lines**, including Diviyaj's historical import. Years not in Fulfil stay as monthly ship-date figures, spread into weeks. |
| Forecast migration (a) | **Annual total kept per SKU x country x channel; months may shift.** Each financial year's forecast is re-spread over its weeks by the new order-date weekly shape. |
| Forecast entry | **Both, switchable**: monthly or weekly view. Editing a month re-spreads its weeks; editing a week updates its month. |
| Exclusion flag | **Any channel**, an order line with **more than 40 units of one SKU**. Threshold editable on the page, default 40. |
| Exclusion effect | Only the **flagged line(s)** come off actuals. The order's other lines stay. |
| Phase 1 | Data layer + migration + Order exclusions page + impact report. Weekly plan screen in phase 2. |

## 3. Data layer (new tables, migration files for Diviyaj)

### 3.1 `planner.order_lines`: one row per Fulfil sale line
- **Columns:**
  - identity: sale_id, line_id (PK), so_number, reference
  - context: channel, channel_segment, country, customer, key_account flag, wholesale flag, preorder flag
  - product and quantities: sku, qty, qty_cancelled, qty_shipped, unit_price, currency
  - dates: order_date (sale_date), ship_date (shipment effective date, else line shipping_date), state
- **Derived columns:**
  - `basis` = 'ship' when (wholesale or key account) and ship_date > order_date + 14 days; else 'order'
  - `demand_date` = ship_date or order_date per basis
  - `iso_week` (Monday date of demand_date's ISO week)
- **Excludes:**
  - cancelled lines; quantity = qty - qty_cancelled
  - returns (`is_return`)
  - non-product lines (type <> 'line', gift cards, round-off)
- **Sets:** exploded to components with the same rule as today (set SKU + component rows), so weekly figures match the monthly sets basis.
- **Size:** about 18k lines a year today (Fulfil holds orders from 06-May-26 onwards), so small.

### 3.2 `planner.order_exclusions`
- **Columns:** line_id (PK), excluded (bool, default false), note, changed_by, changed_at. A change log is kept as for other inputs.
- **Candidates** are computed, not stored: order_lines with qty > threshold.
- **Threshold:** stored in app_settings `order_exclusion_threshold`, default 40.

### 3.3 `planner.sales_actuals_weekly`
- **Columns:** sku, country, channel, iso_week, units, revenue, source ('fulfil' | 'monthly_spread'), built_at.
- **Built from** order_lines minus excluded lines, grouped by demand_date's ISO week.
- **Weeks before Fulfil history:** monthly ship-date actuals spread over the month's days into its weeks (source 'monthly_spread').

### 3.4 `planner.forecast_weekly`
- **Columns:** sku, country, channel, iso_week, units, version, entered_as ('month' | 'week'), updated_by, updated_at.
- **Monthly figures** = the weeks summed, with each week's days split across month boundaries. Every monthly screen and the buy plan read this sum, so nothing else changes in phase 1.

## 4. Feed (daily)
- A new HORIZON job `orderLinesSync` reads LIVE Fulfil only, the same way as the DTC 2.0 / preorders syncs: changes since the last run, a full re-read on demand. It then rebuilds sales_actuals_weekly.
- **Route for n8n:** `POST /api/cron/order-lines-sync`, x-webhook-secret = N8N_WEBHOOK_SECRET.
  - **Diviyaj:** add it to the gate exemption list and schedule it daily, after the morning Fulfil import.
- **History:** once Diviyaj's historical import is in Fulfil, one full re-read loads it. Nothing else changes.
- The existing monthly feed (sales_actuals, sheet sync) keeps running during the switch-over.

## 5. Forecast migration (a)
For each SKU x country x channel and each financial year:
1. FY total = sum of today's monthly forecast for that year (unchanged).
2. **Weekly shape:**
   - the order-date weekly actuals of the last 12 months for that sub-category x country x channel, smoothed
   - fallback: the category's shape, then even by days
3. Spread the FY total over the year's ISO weeks by that shape, rounded so the year adds up exactly.
4. Store in forecast_weekly (version 'migrated-YYYY-MM-DD'). Today's forecast_outputs stays untouched as the rollback.

**Effect:** annual totals are unchanged, but **months can shift**, because order date is earlier than ship date and the shape changes.

## 6. Order exclusions page: Demand ▸ Inputs ▸ Order exclusions
- **List:** every order with at least one line over the threshold.
  - Columns: SO (Fulfil link), reference, customer, channel, country, order date, ship date, flagged line(s) SKU x qty, order total units.
  - Toggle per order: **Excluded** (default off).
- **Search:** SO, reference, customer, SKU, channel.
- **Filters:** Excluded / Not excluded / All, channel, country, date range.
- **Threshold box:** default 40. Changing it re-lists the candidates; existing decisions are kept.
- **Excluding:** the flagged line(s) come off weekly (and therefore monthly) actuals at the next rebuild (a few seconds). Undo = toggle back.
- **Counts:** "N orders flagged · M excluded · units removed from history".
- **Replaces** the manual exclusions in the Fulfil2026 actuals file (e.g. SO58404 ArteBrands).

## 7. Impact report (before any switch on live)
- **Monthly actuals:** ship-date (today) vs order-date (new), per country x channel x month, with the biggest moves by SKU.
- **Forecast:** months before vs after the migration (annual totals equal).
- **Buy plan:** before vs after, all markets: urgent, Buy 3PL, Buy FBA, transfers, future-month buys, top SKUs.
- **Exclusions:** units removed per SKU / month.
- Ben confirms; Diviyaj then switches live to the weekly-fed monthly figures.

## 8. Phase 2 (later)
- Demand plan **Monthly / Weekly** switch: weekly columns (ISO weeks), editing either level.
- The buy plan engine stays monthly until a separate decision on weekly buying.

## 9. Open points
- The financial year start for ISO weeks: a week that straddles the FY start belongs to the FY that holds its Monday.
- Preorder flag: HORIZON's existing Fulfil preorder logic (v28.241) vs the channel rule. The channel rule applies; the preorder flag is stored for reporting.
- Diviyaj: the historical import's coverage (which years) and whether it keeps sale_date.
