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
  - migrations/396_wssi_otb_buy.sql :: planner.wssi_otb_buy
  - artifact_v16.7.html :: wssiPx
  - artifact_v16.7.html :: wssiWsBind, wssiWsCombo, wssiWsGet, wssiWsPut
  - artifact_v16.7.html :: wssiNotePop, wssiNoteVis, wssiNoteRefresh
  - server.mjs :: /api/demand/wssi-notes
  - migrations/400_wssi_notes.sql :: planner.wssi_notes
verified_version: v28.559
fingerprints:
  lib/wssi.mjs::wssiLoad: 1b15ca802aaa
  lib/wssi.mjs::wssiBuild: 49dc2f86d9c0
  lib/wssi.mjs::CATEGORY_GROUP: 79d466031a2e
  lib/wssi.mjs::COGS_COL: 7adac962c272
  server.mjs::/api/demand/wssi: 5f8825a8e6cb
  artifact_v16.7.html::renderWssiView: 8572e750a5fb
  artifact_v16.7.html::wssiCompute: 1aa040d9e745
  artifact_v16.7.html::wssiDerive: db209ab5e2b2
  artifact_v16.7.html::wssiPeriod: a36ce8d838b8
  artifact_v16.7.html::renderOtbInputView: 6cc3ee000029
  server.mjs::/api/demand/wssi-otb: e188dc52da51
  server.mjs::/api/demand/wssi-otb/upload: 0386384c225c
  migrations/396_wssi_otb_buy.sql::planner.wssi_otb_buy: a1fe75d1c479
  artifact_v16.7.html::wssiPx: 4ff354639245
  artifact_v16.7.html::wssiWsBind: c0335bcb7aa8
  artifact_v16.7.html::wssiWsCombo: 843e7bc631ca
  artifact_v16.7.html::wssiWsGet: 6f3766d93d44
  artifact_v16.7.html::wssiWsPut: 24040f9ef50e
  artifact_v16.7.html::wssiNotePop: c105ead1824c
  artifact_v16.7.html::wssiNoteVis: 7edc5224a1ae
  artifact_v16.7.html::wssiNoteRefresh: f2ea429b2c13
  server.mjs::/api/demand/wssi-notes: 85ce6d73d7f0
  migrations/400_wssi_notes.sql::planner.wssi_notes: a38013199504
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
  - Transfer £ cost (v28.558, Katherine: transfers must net to zero at all markets and channels): both sides are valued at the sending pool's landed cost per unit, so the 3PL out and the FBA in cancel. Each pool's opening and closing stock £ cost stay at that pool's own landed cost; £ retail uses the market's selling price on both sides.
  - Write-offs / other are not read from Fulfil stock adjustments or n8n: they are the negative part of the movement left after sales, intake and 3PL / FBA transfers. That covers damages, samples, stock counts (incl. ILG rebaselines), moves to branches HORIZON does not manage and moves between markets (one market's write-off is the other's intake). A write-off and an intake in the same pool and month offset each other; only the net shows.
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
- Proposed / open to buy (v28.547, Ben 28-Oct-26, WSSI phase 2 from Kathryn's template; replaced the v28.487 £-at-cost inputs) comes from DEMAND ▸ Inputs ▸ Open to buy (planner.wssi_otb_buy, migration 396): buys planned but not yet placed as a PO, by arrival month × market × channel × category group, entered as units OR £ retail (planners with demand edit rights; past months locked).
  - Conversion: selling price and cost per unit for that month × market × channel × category group from the WSSI facts (closing stock £ retail / units and £ cost / units of the channel's pool, else that month's sales, else the FY average for market × pool × group, else the market's FY average). £ retail entries become units = £ ÷ selling price.
  - Drop-out (Ben: shrink by PO value): each buy is reduced by the units of matching POs that reached Production after the buy was first entered (created_at): same market, channel, category group and arrival month (WSSI's expected-arrival rule). PO channel = FBA for FBA / AWD branches, B2B for B2B / Direct to Client branches, else DTC; ZAL / TIK buys are never matched (they share the 3PL stock). The time the PO reached Production = its first "Status … → PRODUCTION" change, else the PO's creation. FUTURE and cancelled POs never count.
  - WSSI rows: Proposed units = what is left (entered units − on PO, not below zero), £ retail = units × selling price, £ cost = units × cost per unit. Market, channel and category group filters split it; seasonality and product status do not (a note says so).
  - The input page: rows Market · channel ▸ category group (collapsible, remembered per browser), Enter as Units / £ retail (remembered); under each cell "↳ n on PO · n left". Spreadsheet behaviour as v28.488; the .xlsx template has Market, Channel, Category group, Enter as and month columns; upload previews then applies as one undoable change.
  - Proposed adds to projected stock cumulatively: each forecast month's opening and closing include all proposed units up to then, so closing vs target and OTB remaining move with it. Actual months ignore it.
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

## Plan, forecast snapshot and overrides (v28.548)
- DEMAND ▸ Inputs ▸ WSSI plan holds the signed-off plan at market × channel × category group × month: sales £ (ex VAT), sales units, closing stock units. It is edited as a draft and locked by an admin as version n; versions are kept and WSSI uses the latest locked one. A locked version is read only; the next edit copies it into a new draft.
- Planned ASP = planned sales £ ÷ units. Planned closing £ retail / £ cost = planned closing units × that month's selling price / landed cost for the market, channel and group. Planned intake units = planned closing − planned opening (last month's planned closing; the first month opens on actual stock) + planned sales units.
- Forecast rows: closed months = the forecast snapshot taken by WSSI builds while that month was open (from Oct-26); open months = the live forecast.
- Forecast override (sales units, open months, market × channel × group) replaces the system forecast: sales £ moves at that cell's ASP, cost of sales at landed cost, and the unit difference runs through projected closing stock of the channel's pool from that month on. Target closing override (units, per pool: DTC row = 3PL, FBA row = FBA) replaces the calculated target. Overrides are not versioned, and are not applied while a seasonality or product status filter is on.
- Variances: this year vs forecast (closed months with a snapshot), this year (actual / forecast) vs plan (incl. intake + proposed vs planned intake; closing stock vs plan, red = above), forecast vs plan. Period totals only count months that have a plan value.
(source: artifact_v16.7.html :: wssiCompute, wssiDerive, wssiPeriod, renderWssiPlanView; server.mjs :: /api/demand/wssi-plan, wssiSnapshotCurrent)

## Worksheet mode (v28.557)
- Ben 28-Oct-26: open to buy and the plan are edited on the WSSI itself, not on separate pages. The ✎ Worksheet toggle (remembered per browser) works only with exactly one market, one channel and one category group picked, and seasonality and product status on All, because every input is stored at market × channel × category group × month. At any higher level the toggle is greyed out and the WSSI stays read only.
- Editable cells (bordered): Sales units in open months = Forecast override (blank clears it, 0 is a real override); Target closing stock units in open months = Target closing override, only for DTC (the 3PL pool) or FBA; Proposed units and Proposed £ retail in open months = open to buy, saved as units or £ retail by the row typed in; Planned sales £, Planned sales units and Planned closing stock units in any month = the plan draft. Open month = not yet actual and not before the current month.
- In worksheet mode the plan rows and the variances against plan use the draft being edited (else the latest locked version, as outside the worksheet). The first plan edit creates the draft from the latest locked version (server); an admin locks it from the worksheet bar as the next version.
- Proposed rows show what is left after matching POs; the cell tooltip gives what was entered and the units on POs. Editing starts from the entered amount.
- Saving: each change shows at once and the whole WSSI recalculates; it saves through the same endpoints as before (/api/demand/wssi-otb, /wssi-overrides, /wssi-plan/cells, demand edit rights) and is reverted with a message if the save fails. Enter moves down to the next editable row, Tab across months; a pasted block fills months across and the rows below as shown (read-only cells skipped); Undo / Ctrl+Z undoes the last 50 changes.
- DEMAND ▸ Inputs ▸ Open to buy and WSSI plan are no longer in the menu; their links open the WSSI worksheet. The all-markets grids (for .xlsx upload or pasting many rows) are reached from "Bulk grid" on the worksheet bar.
(source: artifact_v16.7.html :: renderWssiView, wssiWsBind, wssiWsCombo, wssiWsGet, wssiWsPut)

## Cell notes (v28.559)
- Ben 28-Oct-26: anyone viewing the WSSI reads notes; users with demand edit rights add them; the author or an admin deletes one. Each note shows who (ben@) and when (dd-mmm-yy).
- A note sits on a row and a column (a month, a period H1 / H2 / YTD / YTG / FY, or the whole row) in the filter view it was written in (market, channel, category group, seasonality, product status; planner.wssi_notes, migration 400).
- It shows in that view and in every view above it: for each filter either All is picked, or the picked values include all of the note's. A note from a narrower view carries a tag naming that view; a note written at a higher level does not show in the narrower views below it, and a note from another market never shows.
- On the grid: a bar left of each row name shows the row's note count (amber; a faint + on hover to add); a cell with notes has an amber corner marker (hover shows them, click opens them); right-click any cell to add a note to that cell.
(source: artifact_v16.7.html :: wssiNotePop, wssiNoteVis, wssiNoteRefresh; server.mjs :: /api/demand/wssi-notes)

## Data and speed
- GET /api/demand/wssi?fy=<start year> builds one year in about 6 s on live and caches it for 10 minutes. Refresh rebuilds (?fresh=1). Reads only.
(source: server.mjs :: /api/demand/wssi)

## Q&A
**Q:** Why is intake in a past month different from the POs received? **A:** Past intake is measured from stock movement (closing - opening + units sold), because PO receipt history is incomplete before Dec-25. It also catches stock arriving by other routes.
**Q:** Why does DTC alone show the same stock as DTC + B2B? **A:** Stock is held by pool, not channel. DTC, B2B, Zalando and TikTok share the 3PL pool.
**Q:** Where do I enter open to buy? **A:** DEMAND > Inputs > Open to buy, or the "Enter open to buy" button on WSSI: units or £ retail by arrival month, market, channel and category group. It shrinks as matching POs reach Production.
**Q:** Why are the margins so high? **A:** Since v28.546 cost is landed cost from the COGS feed where it has one; SKUs it does not cover still use FOB cost.
