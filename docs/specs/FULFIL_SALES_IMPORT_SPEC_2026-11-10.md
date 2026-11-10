# Fulfil sales import: analysis and design (10-Nov-26)

Ben 10-Nov-26: historical orders are now in Fulfil (AU and EU near complete). Build an n8n process that (a) imports sales orders for every channel, (b) aggregates revenue and units, (c) builds weekly and monthly tables for the changeover, (d) runs daily and only imports changes, (e) surfaces anomaly orders for exclusion, (f) checks the preorders import. New tables first, then HORIZON is pointed at them.

All figures below are read-only reads of live Fulfil (data warehouse + API) and live Supabase on 10-Nov-26.

## 1. What is in Fulfil now

"Historical" is not a location: it is 16 **sales channels** named `HISTORICAL <channel>` (ids 87-102, created Nov-26). All orders in them are state `done`.

| Historical channel | Orders | From | To |
|---|---|---|---|
| HISTORICAL Amazon.com | 328,918 | 19-Aug-20 | 23-Jun-26 |
| HISTORICAL dockandbay-us | 116,431 | 31-Jul-20 | 08-Sep-26 |
| HISTORICAL dockandbay-au | 83,777 | 31-May-21 | 26-Aug-26 |
| HISTORICAL dockandbay-eu | 44,052 | 31-Jul-20 | 16-Sep-26 |
| HISTORICAL dockandbay-ca | 25,668 | 31-Jul-20 | 21-May-26 |
| HISTORICAL Amazon.ca | 23,010 | 19-Aug-20 | 13-Jul-26 |
| HISTORICAL Amazon.de | 18,493 | 20-Aug-20 | 16-Jun-26 |
| HISTORICAL Amazon.com.au | 15,704 | 26-Aug-22 | 24-Aug-26 |
| HISTORICAL dockandbay-us-ws | 12,208 | 07-Jan-20 | 14-Sep-26 |
| HISTORICAL dock-bay-gma | 7,493 | 14-Nov-22 | 23-Nov-24 |
| HISTORICAL Amazon.it / .es / .fr | 4,498 / 3,847 / 3,469 | Aug-20 | Jun-26 |
| HISTORICAL TheView | 2,483 | 16-May-23 | 28-Jun-24 |
| HISTORICAL dockandbay-eu-ws | 1,430 | 02-Mar-20 | 26-May-26 |
| HISTORICAL dockandbay-ca-ws | 852 | 08-Jan-21 | 07-Jul-25 |

Total about 692k historical orders (about 1.5M lines). Data warehouse `sales_orders` = 858k orders, exported hourly.

**UK has no historical channel yet.** dockandbay-uk has 2026 only, Amazon.co.uk from Jun-26, no UK wholesale history. UK before 2026 stays on today's `sales_actuals` until a UK import exists.

## 2. Findings that shape the design

1. **No double counting between historical and live.** Joined on `order_reference` (Shopify name e.g. `AU-138126`, Amazon order id) there are 0 historical/live duplicates; pre-cutover orders sit in the live channels as state `ignored`. About 10 live/live duplicates exist (Amazon.co.uk 6, dockandbay-uk 2): dedupe on reference.
2. **Dedupe key is `order_reference`**, not `channel_identifier` (live = Shopify numeric id, historical = blank).
3. **Wholesale orders sit inside the historical DTC channels.** Orders whose reference is not Shopify-style (`US-123`, `AU-123`, `EU-123`, `CA-123`) are Cin7 B2B orders (Unti Distribution `UDIS…`, Dillard's `DILL-…`, Goldstar, DXKI, `CINC…`):
   - HISTORICAL dockandbay-us: 2,892 such orders = 316,910 units (46% of the channel)
   - HISTORICAL dockandbay-eu: 14,509 orders = 301,904 units (76%)
   - HISTORICAL dockandbay-au: 510 orders = 123,973 units (31%)
   Rule: **reclassify to B2B** (not exclude). Shopify-ref orders then have almost no big lines.
4. **Shipping is a product line.** `SHIPPING` / category Shipping lines count as units (AU DTC 2025: 14,604 of 81,126; live Amazon.com 29,769). Must be filtered (merch only).
5. **AU SKU prefix.** AU sets use `AU-TOWLB-…` where HORIZON has `TOWLB-…`. Strip `AU-` when the stripped code is a HORIZON SKU.
6. **Lines without a SKU.** Live Amazon EU lines mostly have no product (Amazon.de 1,037 lines, .fr 265, .es 233, .it 196; Amazon.com 595). Needs a fix in Fulfil (listing mapping) or a listing-SKU fallback.
7. **Channels the current mapper does not know:** all `HISTORICAL …`, `UK - Wholesale & Distributor`, `TikTok US`, `Markettime US`, `dock-bay-gma`, `TheView`, `dockandbay-ca`, `dockandbay-ca-ws`. Company code `DBA` appears on some dockandbay-au and Amazon.com.au orders (distinct orders, not duplicates).
8. **2025 reconcile, Fulfil (rules 3-4 applied except shipping) vs HORIZON `sales_actuals` (units):**

| Market | Channel | Fulfil | HORIZON | Note |
|---|---|---|---|---|
| AU | DTC | 81,126 | 60,407 | 14,604 shipping lines + AU- prefix; rest under review (beach towel components higher in Fulfil, tea towels lower) |
| AU | B2B | 25,817 | 0 | HORIZON has no AU B2B |
| US | DTC | 69,175 | 80,564 | |
| US | B2B | 140,855 | 90,899 | |
| US | FBA | 107,407 | 100,939 | |
| EU | DTC / B2B / FBA | 32,831 / 81,801 / 10,199 | 29,115 / 42,098 / 9,118 | |
| CA | DTC / B2B / FBA | 14,347 / 4,853 / 9,010 | 0 / 0 / 8,076 | CA decommissioned in HORIZON |

   The gaps are expected to shrink a lot once shipping is removed and sets are handled; a full SKU x month reconcile is a build step before any switch.
9. **Preorders (f): fine.** Every historical order is `done`; the preorders sync reads only confirmed / processing orders with a future ship date, so history cannot leak in. One gap: Amazon `provisional` state (281 orders) is ignored by the current order-lines sync and should count as a sale.
10. **The existing build (v28.416, migration 377)** already has `planner.order_lines`, `order_exclusions`, `sales_actuals_weekly`, an incremental sync (`orderLinesSync`, by `write_date`, 45 s budget with cursor) and `/api/cron/order-lines-sync`. **On live it has never run: 0 rows, no n8n schedule.** Today `sales_actuals` comes from n8n `0cnelOi4FWiG3NLF` (Google Sheet "ACTUALS AIRTABLE - EXCLUDE B2B ORDERS", daily 02:30 UTC, monthly).

## 3. Proposed design

### Principle
Logic stays in HORIZON (versioned, testable, same pattern as preorders): n8n only schedules and loops. Nothing existing changes until Ben switches after the reconcile.

### Tables (migration 428, additive)
- **`planner.fulfil_channel_map`** (new): Fulfil channel name -> market, HORIZON channel, flags (wholesale, key account, custom, historical, marketplace), `dtc_ref_pattern` (orders not matching it are B2B), active. Replaces the hard-coded `olMapChannel`, editable in CONFIG, seeded with every channel above.
- **`planner.order_lines`** (exists, extend): add `company`, `warehouse_code`, `order_reference`, `is_historical`, `is_merch`, `line_amount` (sale currency), `amount_company_ccy`, `listing_sku`, `class_rule` (why the channel was set, e.g. `ref_not_shopify -> B2B`), `fulfil_updated_at`. Unique on `line_id`.
- **`planner.order_anomalies`** (new): one row per order x rule (`line_over_threshold`, `order_over_p999`, `zero_price`, `internal_customer`, `duplicate_reference`, `no_sku`), score, detected_at. Ben's decisions stay in `order_exclusions` (exists).
- **`planner.sales_actuals_weekly`** (exists): rebuilt from order_lines (merch only, exclusions applied), plus revenue.
- **`planner.sales_actuals_fulfil`** (new): monthly, **same columns as `sales_actuals`** (sku, country, channel, month, units, revenue, source, loaded_at), so the switch is a source setting (`app_settings.sales_actuals_source = sheet | fulfil | hybrid`), with per market x channel cut-over dates (hybrid keeps UK pre-2026 from the sheet).
- **`planner.sales_import_runs`** (new): run log (mode, watermark from/to, lines read/upserted/deleted, ms, errors) for health checks.

### Daily import (d): only changes
- Watermark = Fulfil `write_date` of `sale.line` and `sale.sale` (a header change, e.g. state -> cancel, must also re-read its lines), 2-day overlap, keyset by id, 45 s budget per call; n8n loops while `more=true`.
- Deletions / cancels: lines of orders whose state moved to cancel are set to qty 0 (kept for audit); a weekly light check compares order counts per channel x month with the warehouse.
- Rebuild only the touched weeks and months (not the whole table).
- n8n: one flow, daily 03:00 London, POST `/api/cron/sales-import` (inside the prod auth-gate secret bracket), loop until done, then `/api/data-cache/invalidate`, Sentry check-in.

### Historical backfill (one-off)
About 1.5M lines. Option A: the same REST route in full mode, looped by n8n (about 3,000 pages, roughly 1-2 hours, can run overnight). Option B: export from the Fulfil data warehouse (far faster, needs a BigQuery service account from Fulfil / Diviyaj). Recommend A unless warehouse credentials are easy.

### Anomalies (e)
Rules above, surfaced on DEMAND > Inputs > Order exclusions (exists) with the rule, units, customer and a one-click exclude. B2B reclassification is automatic (rule 3), not an exclusion.

### Changeover (c)
Reconcile page: per market x channel x month, sheet vs Fulfil units and revenue, with drill to SKU; buy plan before/after snapshot before any switch (standing rule).

## 4. Open questions for Ben
1. Revenue: sale currency (as today's sheet appears to be) or GBP?
2. Sets: count the set SKU as sold (current HORIZON) or explode to components? Need a SKU-level check of the beach towel gap first.
3. Zero-price lines (free gifts, replacements): count as demand or not?
4. CA history (DTC 14k, B2B 5k, FBA 9k units in 2025): import (CA is decommissioned) or skip?
5. AU B2B and US B2B from history: currently not in HORIZON's B2B actuals (B2B is forecast from client orders). Store them and show, but keep out of the DTC/FBA demand history?
6. UK history: is a UK historical import coming, or does UK pre-2026 stay on the sheet permanently?
7. Amazon EU lines with no SKU: fix in Fulfil (Diviyaj) or fall back to listing SKU?
