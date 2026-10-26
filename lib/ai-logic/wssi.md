---
topic: wssi
title: WSSI (weekly sales, stock and intake with open to buy)
covers: DEMAND > WSSI, the monthly sales, stock, intake, target and open-to-buy grid for one financial year against last year, laid out like Ben's WSSI OTB template. Where each row comes from, how stock movement is split into intake, transfers and write-offs, the forecast roll-forward, targets, open to buy, cover, filters and totals. Replaced REPORTS > Open-to-Buy in v28.485.
sources:
  - lib/wssi.mjs :: wssiLoad, wssiBuild
  - server.mjs :: /api/demand/wssi
  - artifact_v16.7.html :: renderWssiView, wssiCompute, wssiDerive, wssiPeriod
verified_version: v28.485
fingerprints:
  lib/wssi.mjs::wssiLoad: f97960cbcdd8
  lib/wssi.mjs::wssiBuild: f0a6fe67d056
  server.mjs::/api/demand/wssi: ad274546ff25
  artifact_v16.7.html::renderWssiView: 08da72606ad8
  artifact_v16.7.html::wssiCompute: c14cb7daf348
  artifact_v16.7.html::wssiDerive: c0b64d1f5b46
  artifact_v16.7.html::wssiPeriod: 01ee3313d860
---

# WSSI (DEMAND > WSSI)

Where: DEMAND, second item after Cross Market view (#/demand/wssi). Read only (v28.485). A worksheet version with editable OTB and target inputs may follow.

## Layout
- Columns: the 12 months of the financial year (Mar to Feb), then H1 (Mar to Aug), H2 (Sep to Feb), YTD (actual months), YTG (forecast months) and FY.
- Rows follow Ben's "WSSI OTB Format" sheet in four sections: This year: sales; This year: stock and OTB; Last year; Variance (this year vs last year). Sections collapse.
- Weeks in period = days in month / 7.
- "Actuals to" = the last completed month whose closing stock snapshot (1st of the next month) exists. Later months are forecast.
- Filters (multi-select, none ticked = all): Market, Channel, Category, Seasonality (products.core_seasonal, blank = Unassigned), Product status (products.status). Year: last, current or next FY. Show: £ retail, £ cost, Units, Source column.
(source: artifact_v16.7.html :: renderWssiView)

## Grain and filters
- The server returns facts by month x market x category x seasonality x product status, split two ways:
  - sales facts by channel (DTC, B2B, FBA, ZAL, TIK);
  - stock facts by stock pool: 3PL (DTC, B2B, Zalando, TikTok; includes NonGRS) and FBA (includes US AWD).
- A channel filter keeps those channels' sales and the pools they draw on. Stock is not split by channel, so picking DTC or B2B alone still shows the whole 3PL pool; the page shows a note when that happens.
(source: artifact_v16.7.html :: wssiCompute; lib/wssi.mjs :: wssiBuild)

## Sales rows
- Actual months: planner.sales_actuals units and revenue (revenue is GBP, ex VAT).
- Forecast months: planner.forecast_outputs units x forecast ASP. Forecast ASP per SKU x market x channel, in this order:
  1. the SKU's ASP in the same month last year (then two years ago);
  2. the sub-category's ASP in the same month last year (then two years ago);
  3. the SKU's ASP over the last 3 actual months;
  4. full price (wholesale B2B x 0.5, other channels x 0.95).
  Then x price changes in effect (DEMAND > Inputs > Price changes, compounded) x (1 - ASP reduction %) and capped at 1.2 x full price.
  This mirrors DEMAND getASP but at SKU level and without the discontinued-share discount, so totals can differ slightly from DEMAND > Summary.
- Units are as sold (a set counts as one box).
- ASP = sales £ / units. Cost of sales = units x product cost. Achieved margin = 1 - cost of sales / sales £.
(source: lib/wssi.mjs :: wssiBuild)

## Prices and cost
- Full price per SKU and market = <market>_rt (US = us_rt etc.) converted to GBP with CONFIG > Exchange rates for that FY, then ex VAT/GST (UK and EU / 1.2, AU / 1.1). With only B2B selected, full price shows RT / 2 (wholesale).
- Current selling price per SKU and market = the SKU's actual ASP over the 3 months to that month across consumer channels (DTC, FBA, ZAL, TIK), else full price x 0.95, capped at 1.2 x full price. Forecast months hold the last actual month's price.
- Product cost = products.cost (supplier currency, USD) / the FY USD rate, else the category's average PO line cost. This is FOB cost with no freight or duty, so margins read high. Switch to Fulfil landed cost (planner.cogs_values) once the COGS feed runs on production.
- Row "Avg current selling price" = closing stock £ retail / closing units; "Avg full price" = closing stock at full price / closing units; "Avg cost per unit" = cost of sales / units sold.
(source: lib/wssi.mjs :: wssiBuild)

## Stock, intake, transfers, write-offs (per SKU, per market)
- Opening = planner.inventory_snapshots on the 1st of the month. Closing = the snapshot on the 1st of the next month.
- Units sold from a pool = actual or forecast units of the channels that draw on it. A set with a set_bom entry and no stock of its own is built on the fly: its sales count against its components (x BOM quantity) for the stock flow only.
- Actual months: movement = closing - opening + units sold, per pool.
  - If one pool fell while the other rose in the same month, the overlap is a transfer (3PL to FBA or back). Transfers net to zero when both pools are shown.
  - What is left is intake when positive and write-offs / other when negative (damages, samples, count corrections, moves to unmanaged branches).
  - Why not PO receipts: HORIZON's PO history only starts around Dec-25, so POs cannot give last year's intake.
- Forecast months: intake = open POs (status Production, Ready to ship, Shipping; FUTURE is not confirmed and is left out) by expected arrival:
  shipment arrival > delivery > landing date > PO delivery override > PO landing override > production end (override, else start + supplier production days) + 7 days + the branch's sea lead time. Arrivals already overdue land in the first forecast month.
- Forecast closing per SKU and pool = max(0, opening + PO intake - forecast units sold). Forecast beyond stock is treated as lost sales, so closing never goes negative. No transfers or write-offs are planned.
- Stock £ cost = units x product cost; £ retail = units x current selling price.
- Exit margin = 1 - closing £ cost / closing £ retail.
(source: lib/wssi.mjs :: wssiBuild)

## Targets and open to buy
- Target closing units per SKU, market and pool = cover-weeks target x average weekly units of the next 3 months (actual where known, else forecast). Cover-weeks target = products.target_cover_weeks_<market>_<pool>_from_category, default 8 weeks.
- Closing stock vs target £ cost = closing - target. Red when over target.
- Open to buy remaining £ cost (forecast months) = target - projected closing £ cost. Positive = room to buy, negative = over-bought.
- OTB planned rows (£ retail, £ cost, units) are plan inputs. They stay blank while WSSI is read only.
(source: lib/wssi.mjs :: wssiBuild; artifact_v16.7.html :: wssiDerive)

## Cover
- On-hand cover (weeks) = closing units / (units sold from that stock this period / weeks in period).
- Forward cover (weeks) = closing units / (units of the next 3 months / their weeks).
(source: artifact_v16.7.html :: wssiDerive)

## Totals (H1, H2, YTD, YTG, FY)
- Flows (sales, units, cost of sales, intake, transfers, write-offs) are summed.
- Opening = the first month's opening; closing, target and forward cover = the last month's.
- Ratios are worked out again from the totals (ASP, margins, cover, variances).
(source: artifact_v16.7.html :: wssiPeriod, wssiDerive)

## Last year and variance
- Last year rows use the same sources for the year before (all actual). LY closing £ retail uses the selling price at the time.
- Variance = this year (actual or forecast) - last year, and % of last year. Exit margin variance is in % points; cover variance in weeks.
(source: artifact_v16.7.html :: wssiDerive)

## Data and speed
- GET /api/demand/wssi?fy=<start year> builds one year in about 6 s on live and caches it for 10 minutes. Refresh rebuilds (?fresh=1). Reads only.
(source: server.mjs :: /api/demand/wssi)

## Q&A
**Q:** Why is intake in a past month different from the POs received? **A:** Past intake is measured from stock movement (closing - opening + units sold), because PO receipt history is incomplete before Dec-25. It also catches stock arriving by other routes.
**Q:** Why does DTC alone show the same stock as DTC + B2B? **A:** Stock is held by pool, not channel. DTC, B2B, Zalando and TikTok share the 3PL pool.
**Q:** Why are the margins so high? **A:** Cost is FOB product cost without freight or duty until Fulfil landed cost is available on production.
