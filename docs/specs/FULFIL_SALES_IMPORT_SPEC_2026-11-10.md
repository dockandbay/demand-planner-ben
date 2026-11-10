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

## 4. Decisions (Ben 10-Nov-26)
1. **Revenue in local currency** of the market / store: UK GBP, US USD, EU EUR, AU AUD, CA CAD. Strays convert to the store's currency (dockandbay-au NZD, AUD 224 in 2025; dockandbay-us CAD, 71 orders). Checked: Fulfil holds dockandbay-au in AUD, so NZD checkouts already arrive as AUD.
   **GBP copy** (today's `sales_actuals` revenue is GBP, converted upstream; HORIZON converts nothing itself): UK-entity channels use Fulfil's own company-currency GBP (actual rate at order date); AU entity (AUD) converts with CONFIG > Exchange rates for the FY. Store both: `revenue_local` + `currency` + `revenue_gbp`.
2. **Sets: as today** (the set SKU counts as sold, no explosion in the import).
3. **Zero-price lines count for demand, not for ASP**: units in, revenue 0, and excluded from the ASP denominator (store `is_free`).
4. **Key-account orders hidden in the DTC channels are dropped** (non-Shopify references in dockandbay-us / -au / -eu / -ca / -uk). Ben: almost all are key accounts.
5. **Wholesale channels import as B2B actuals** (HISTORICAL -us-ws / -eu-ws / -ca-ws, live -uk-ws / -us-ws / -eu-ws, Faire, eZComm, Markettime); key-account and custom channels stay excluded as today.
6. **All CA imported** (Shopify CA, CA wholesale, Amazon.ca) as CA history even though the stores are closed.
7. **No-SKU lines**: fall back where possible, flag the rest as an anomaly; explore later (note: docs/specs/FULFIL_NO_SKU_LINES_NOTE_2026-11-10.md).
8. **UK and the whole switch wait**: this is a test build. Nothing switches; UK historical is expected next week and is tested then.

## 5. Sandbox test, 2025 AU + EU (10-Nov-26, v28.757-758)
Imported 45,224 orders / 124,288 lines (HISTORICAL dockandbay-au, Amazon.com.au, dockandbay-eu, -eu-ws, Amazon DE/IT/ES/FR) in about 7 minutes (about 100 orders a second; full history about 2 hours). Compared with LIVE sales_actuals (the sheet), units / GBP:

| Market channel | Sheet units | Fulfil units | Diff | Sheet GBP | Fulfil GBP | Diff |
|---|---|---|---|---|---|---|
| AU DTC | 60,407 | 62,281 | +3.1% | 1,077,728 | 1,125,064 | +4.4% |
| AU FBA | 7,609 | 7,508 | -1.3% | 167,430 | 160,868 | -3.9% |
| EU DTC | 29,115 | 28,751 | -1.3% | 610,685 | 693,950 | +13.6% |
| EU FBA | 9,118 | 9,113 | -0.1% | 245,622 | 202,140 | -17.7% |
| EU B2B | 42,098 | 25,861 | -38.6% | 436,696 | 299,178 | -31.5% |

Findings:
1. Units reconcile within about 3% for AU and EU DTC / FBA. Months differ by timing: the sheet is ship month, Fulfil is order month (AU Nov-25 +38%, Dec-25 -15%: Black Friday orders shipped in December).
2. **Historical orders have no ship date.** Fulfil's line shipping date (and created_at) on imported orders is the import date (Nov-26); no metadata or shipments carry the old dispatch date. The first run put all EU wholesale 2025 into Nov-26; fixed (historical always on order date = old system created date). The "ship date if more than 2 weeks after created" rule therefore only works for live orders until Diviyaj imports a ship date.
3. **EU B2B gap**: the 60 non-Shopify orders dropped from HISTORICAL dockandbay-eu in 2025 (55,827 units, 33 customers: TAG / Roman Forster CH 27k, DISTRIBUCIONES XKI ES 13k, Galeria, Kitchen Cabinet Onlineshop, small shops) are not all key accounts; the sheet counts about 16k of them as EU B2B. AU: 11 orders, 25,481 units dropped.
4. **Revenue basis differs by channel**: historical orders have tax 0 in Fulfil. EU DTC revenue per unit is 15% above the sheet (Fulfil looks VAT-inclusive for Shopify EU history), EU Amazon 18% below (sheet looks VAT-inclusive for Amazon EU). Needs Diviyaj: are historical amounts gross or net?
5. AU revenue uses the FY25 CONFIG rate for every year before FY25 (CONFIG has no older rates).
6. The sheet has junk SKU rows (e.g. '|DTC', 684 units AU DTC Nov-25).
7. Anomalies flagged: 122 orders with a line over 40 units (87,100 units), 165 orders over their channel's 99.9th percentile, 11 duplicate references, 2 with 10+ free units.
