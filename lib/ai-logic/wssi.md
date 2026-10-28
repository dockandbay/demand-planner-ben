---
topic: wssi
title: WSSI (weekly sales, stock and intake with open to buy)
covers: DEMAND > WSSI, the monthly sales, stock, intake, target and open-to-buy grid for one financial year against last year, laid out like Ben's WSSI OTB template. Where each row comes from, how stock movement is split into intake, transfers and write-offs, the forecast roll-forward, targets, open to buy, cover, filters and totals. Replaced REPORTS > Open-to-Buy in v28.485.
sources:
  - lib/wssi.mjs :: wssiLoad, wssiBuild, CATEGORY_GROUP, COGS_COL
  - server.mjs :: /api/demand/wssi
  - artifact_v16.7.html :: renderWssiView, wssiCompute, wssiDerive, wssiPeriod
  - artifact_v16.7.html :: renderOtbInputView
  - server.mjs :: /api/demand/wssi-otb, /api/demand/wssi-otb/upload
  - migrations/388_wssi_otb.sql :: planner.wssi_otb
verified_version: v28.546
fingerprints:
  lib/wssi.mjs::wssiLoad: 1b15ca802aaa
  lib/wssi.mjs::wssiBuild: f531c8688d97
  lib/wssi.mjs::CATEGORY_GROUP: 79d466031a2e
  lib/wssi.mjs::COGS_COL: 7adac962c272
  server.mjs::/api/demand/wssi: ad274546ff25
  artifact_v16.7.html::renderWssiView: ebd40ca676e0
  artifact_v16.7.html::wssiCompute: 3776d2116f1e
  artifact_v16.7.html::wssiDerive: 14c5ea25b702
  artifact_v16.7.html::wssiPeriod: 0b109896c92c
  artifact_v16.7.html::renderOtbInputView: 1a57dc9a3eb4
  server.mjs::/api/demand/wssi-otb: 0e498c81c438
  server.mjs::/api/demand/wssi-otb/upload: 099ea374341f
  migrations/388_wssi_otb.sql::planner.wssi_otb: 44eb8321b554
---

# WSSI (DEMAND > WSSI)

Where: DEMAND, second item after Cross Market view (#/demand/wssi). Read only (v28.485). A worksheet version with editable OTB and target inputs may follow.

## Layout
- Columns: the 12 months of the financial year (Mar to Feb), then H1 (Mar to Aug), H2 (Sep to Feb), YTD (actual months), YTG (forecast months) and FY.
- Rows follow Ben's "WSSI OTB Format" sheet in four sections: This year: sales; This year: stock and OTB; Last year; Variance (this year vs last year). Sections collapse.
- Weeks in period = days in month / 7.
- "Actuals to" = the last completed month whose closing stock snapshot (1st of the next month) exists. Later months are forecast.
- Filters (multi-select, none ticked = all): Market, Channel, Category group (v28.546), Seasonality (products.core_seasonal, blank = Unassigned), Product status (products.status). Year: last, current or next FY. Show: £ retail, £ cost, Units, Source column. Numbers: Full or Summary (v28.486: £ and units to 3 significant figures in k / m, e.g. 93.1k, 537k, 1.25m; prices, %, weeks unchanged; the .xlsx keeps full numbers; remembered per browser).
(source: artifact_v16.7.html :: renderWssiView)

## Grain and filters
- Category group (v28.546, Kathryn's WSSI template sheet 2): Beach Towels = Towel - Beach; Beauty = Hair Wrap, Gift Box, Eye Mask, Makeup Remover; Ponchos = Poncho - Adults / Kids; Picnic & Outdoor = Picnic Blanket, Beach Pillow, Bag - Cooling; Bags = Bag - Foldable, Dry XS, Dry MD, Beach, Toiletry; Home = Tea Towel, Towel - Home, Towel - Dog, Kids Towel - Home, Gift Box Home, Bath Robe; everything else (Cooling, Lanyard, MIXNMATCH, Bundle Mixed, closed categories such as Shorts, Sunglasses, Water Bottle) = Other. Non Core (point of sale, boxes, gift cards) is left out of the WSSI completely (sales, forecast, stock and POs).
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
- Product cost (v28.546) = landed cost from the COGS feed (planner.cogs_values: Fulfil landed cost, else supplier cost / set BOM) for the warehouse of the market and pool (UK ILG / UK FBA, US Geneva / US FBA, EU iFulfillment / EU FBA, AU Coghlans / AU FBA), converted to GBP with the FY rate. Sales use the pool of the channel (FBA = FBA, others = 3PL). Without a COGS value (e.g. CA): products.cost (USD, FOB) / the FY USD rate, else the category's average PO line cost.
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
- Open to buy remaining (forecast months) = target - projected closing, in £ retail, £ cost and units (v28.546: retail and units rows added). Positive = room to buy, negative = over-bought.
- OTB planned (v28.487) comes from DEMAND ▸ Inputs ▸ Open to buy (planner.wssi_otb): £ at cost per month × market × channel, entered by planners (demand edit rights), past months locked. WSSI sums the inputs for the markets and channels picked (category, seasonality and status filters do not split them; a note says so).
  - OTB planned £ cost = the inputs; units = £ / that month's cost per unit sold (cost of sales / units, else closing cost / closing units); £ retail = units x current selling price.
  - The input page is a spreadsheet grid (v28.488): select / drag / Shift / Ctrl, arrows, Tab, Enter / F2 / digit edits, Delete clears, copy / paste blocks, fill, undo, status bar Sum / Count / Avg. Each change saves at once and is reverted if the save fails. Past months are locked.
  - .xlsx template: Download = the grid with current figures; Upload = the server reads it (read only), the page previews the changes, Apply saves them as one undoable action. Past months and total rows are ignored; non-numbers and unknown market / channel rows are listed, never guessed.
  - OTB adds to projected stock cumulatively: each forecast month's opening and closing include all OTB planned up to then, so closing vs target and OTB remaining move with it. Actual months ignore OTB.
(source: artifact_v16.7.html :: wssiCompute, renderOtbInputView; server.mjs :: /api/demand/wssi-otb)
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
**Q:** Where do I enter open to buy? **A:** DEMAND > Inputs > Open to buy, or the "Enter open to buy" button on WSSI. Amounts are £ at cost by month, market and channel.
**Q:** Why are the margins so high? **A:** Since v28.546 cost is landed cost from the COGS feed where it has one; SKUs it does not cover still use FOB cost.
