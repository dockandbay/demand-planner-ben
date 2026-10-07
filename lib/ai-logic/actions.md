---
topic: actions
title: Actions and Exceptions
covers: Action lists and exception reports in HORIZON: DEMAND Exceptions (9 sub-tabs), DEMAND Actions (server rules, client detectors, Trend Gaps), SUPPLY BI & REPORTS Actions, PO action items, Recommendations, ERP Compare, DTC Mismatch, Urgent Buy, Reallocate, Container Fill, Consolidate, BUY & MOVE Actions
sources:
  - artifact_v16.7.html :: renderExceptionsView
  - artifact_v16.7.html :: skuMonthlyMap
  - artifact_v16.7.html :: renderDemandActionsView
  - artifact_v16.7.html :: daClientDetectors
  - artifact_v16.7.html :: daForecastTrend
  - artifact_v16.7.html :: daAnomalies
  - artifact_v16.7.html :: daAplayer
  - artifact_v16.7.html :: daAlerts
  - artifact_v16.7.html :: daBis
  - artifact_v16.7.html :: daTrendGaps
  - artifact_v16.7.html :: daSkuInsights
  - artifact_v16.7.html :: scanBIPatterns
  - artifact_v16.7.html :: scanAnomalyAlerts
  - artifact_v16.7.html :: renderBuyMoveActions
  - supply/inject.html :: PO_ACTCOND
  - supply/inject.html :: cfUnpaidActions
  - supply/inject.html :: renderRecsTab
  - server.mjs :: buildTierRecommendations
  - server.mjs :: /api/demand-actions
  - server.mjs :: /api/demand-actions/state
  - server.mjs :: buildActionsRows (/api/supply/:section case actions)
  - server.mjs :: expediteActions
  - server.mjs :: polybagActions
  - server.mjs :: submissionActions
  - server.mjs :: manufacturingActions
  - server.mjs :: fulfilCompareRows (/api/supply/bi/fulfil-compare)
  - server.mjs :: _dtcMismatchCompute (/api/supply/dtc/mismatch)
  - server.mjs :: _biProjectionCompute (/api/supply/bi/projection)
  - server.mjs :: biReallocations
  - server.mjs :: biContainerFill
  - server.mjs :: biConsolidations
fingerprints:
  artifact_v16.7.html::renderExceptionsView: c5c8aa1bfeec
  artifact_v16.7.html::skuMonthlyMap: ae7c95a355f4
  artifact_v16.7.html::renderDemandActionsView: 1de6fa6286fd
  artifact_v16.7.html::daClientDetectors: 57025c59e925
  artifact_v16.7.html::daForecastTrend: f4be6d3e7fb3
  artifact_v16.7.html::daAnomalies: 74acb0249bec
  artifact_v16.7.html::daAplayer: d21ea1d37c44
  artifact_v16.7.html::daAlerts: ff1c27648b66
  artifact_v16.7.html::daBis: 6506ce9d342a
  artifact_v16.7.html::daTrendGaps: c2512fc69b6a
  artifact_v16.7.html::daSkuInsights: fb55471971c2
  artifact_v16.7.html::scanBIPatterns: d2ea6bd0080c
  artifact_v16.7.html::scanAnomalyAlerts: 371e8b968fc6
  artifact_v16.7.html::renderBuyMoveActions: a772167cf2ee
  supply/inject.html::PO_ACTCOND: 9a5ea992d251
  supply/inject.html::cfUnpaidActions: fe40096c76b7
  supply/inject.html::renderRecsTab: cb6e7811b196
  server.mjs::buildTierRecommendations: 8fdd4a3bbb0b
  server.mjs::/api/demand-actions: e3aa609539b5
  server.mjs::/api/demand-actions/state: 97d6e71ada2a
  server.mjs::buildActionsRows: cc552c111189
  server.mjs::expediteActions: 2357d115088a
  server.mjs::polybagActions: 055d78eb6800
  server.mjs::submissionActions: 645a4102e9a0
  server.mjs::manufacturingActions: 66b6a0a35499
  server.mjs::fulfilCompareRows: 9afcbaf79bb7
  server.mjs::_dtcMismatchCompute: 5bd69a64946a
  server.mjs::_biProjectionCompute: a87946e44a55
  server.mjs::biReallocations: f0f5e04b882e
  server.mjs::biContainerFill: 029cb0d37134
  server.mjs::biConsolidations: 4575240948b1
verified_version: v28.207
---
## DEMAND Exceptions: shared rules
- Nine sub-tabs: Forecast < Actual, Forecast > Run-rate, Selling no forecast, Forecast anomalies, No availability, Available no cover, Discontinued active, Recommendations, Data & config. (source: artifact_v16.7.html :: renderExceptionsView)
- Filters:
  - Country UK/US/EU/AU and Channel DTC/FBA/B2B, both defaulting to all. The channel filter is hidden on No availability, Discontinued, Recommendations and Data & config.
  - View: SKUs, or Categories (parent category).
  - Risk: All, Red or Amber.
  - Min units: hides rows with |delta| below the value entered.
- Sets (SKU type SET) are skipped on every sub-tab except Data & config.
- SKU forecast = the subcategory forecast split by the SKU's share (buildSkuShares), with any manual SKU override applied on top. Actual = SKU sales for CUR_MONTH. A SKU is checked only for channels it is available in. (source: skuMonthlyMap)
- Run-rate = month-to-date actual / days elapsed x days in month. If CUR_MONTH is before the calendar month (month boundary), the month counts as fully elapsed.

## Exceptions: Forecast < Actual
- RED = forecast > 0 and actual >= forecast. The buy plan then assumes 0 further demand this month.
- AMBER = actual < forecast but run-rate > forecast.
- Delta = actual minus forecast.
- The inline override changes the current-month SKU forecast and persists on Save Forecasts.

## Exceptions: Forecast > Run-rate
- Fires only if forecast > 0, actual > 0, and at least 34% of the month has elapsed.
- RED = run-rate < 50% of forecast. AMBER = run-rate < 75% of forecast.
- Delta = forecast minus run-rate.

## Exceptions: Selling, no forecast
- Recent = sum of the 3 months before CUR_MONTH.
- Fires if recent >= 10 and the forward forecast (next 4 months including current) <= 10% of recent.
- RED if recent >= 60 at SKU grain, or >= 200 at category grain. Otherwise AMBER.

## Exceptions: Forecast anomalies
- Looks at the forward 6 months and keeps the worst month per SKU.
- Baseline = the same calendar month in the prior 3 years (needs at least 2 years).
- Statistics:
  - M = median; sd = MAD, or 0.3 x M if MAD is 0.
  - Range = M +/- 2 sd, floored at 0.
  - Robust z = 0.6745 x (forecast minus M) / MAD.
- Spike = above range and (|z| > 3.5 or forecast > 3M).
- Dip = below range, M >= 5, and (|z| > 3.5 or forecast < 0.25M).
- Share test = SKU share of the subcategory forecast > max(3x usual share, usual + 15 points).
- RED = spike or share test. AMBER = dip.

## Exceptions: No availability, Available no cover, Discontinued active
- No availability: stock sits in a pool the SKU is not available for. The 3PL pool includes non-GRS; the US FBA pool includes AWD.
  - RED = no availability at all in that country.
  - AMBER = sellable elsewhere, but not from this pool.
- Available no cover: fires when this month's forecast > 0 and available < forecast, where available = on hand + inbound + on order at that warehouse.
  - RED = available <= 0.
  - AMBER = some stock but below forecast.
  - Delta = forecast minus available.
- Discontinued active: fires when the per-country discontinue month <= CUR_MONTH but the next 4 months still have forecast > 0.
  - RED = discontinued in a past month.
  - AMBER = discontinues this month.

## Exceptions: Recommendations (ABC re-tier)
- Server-computed and advisory only. (source: server.mjs :: buildTierRecommendations)
- Window: 12 months up to the latest sales month.
- Metric: Core SKUs use summed revenue; Seasonal SKUs use peak-month revenue.
- Tiers by cumulative share: A = top 80%, B = to 95%, C = the rest.
- A row shows only if the earned tier differs from the assigned tier, the metric is >= 8,000 (Core) or >= 3,000 (Seasonal), and the gap is clear: promote needs >= 1.3x the threshold, demote needs <= 0.7x.
- RED = promote. AMBER = demote.
- Unverified: whether revenue is GBP-normalised.

## Exceptions: Data & config
- RED:
  - A SET with no SET_BOM.
  - Cost not > 0.
- AMBER:
  - A PP- SKU missing from PREPACK_MAP.
  - A prepack mapped to a set with no BOM.
  - Carton qty missing.
- Product data comes from /api/supply/products-all.

## DEMAND Actions: server rules (category x market, UK/US/EU/AU)
- Sell-through target actions no longer fire: targets were decommissioned on 17-Aug-26, so the target map is empty.
- Trading behind last year:
  - Compares the last complete month's units with the same month LY. Skipped if both are < 20.
  - Change <= minus 30% = amber.
  - Impact = max(0, LY minus TY) x category average PO cost.
- Trading ahead of last year: change >= +40%, info severity, impact 0.
- Event approaching (trading calendar events within the next 42 days):
  - run = last full month's units.
  - Cover weeks = on hand / (run x (1 + uplift%) / 4.345). US FBA includes AWD.
  - high if cover < weeks to the event, otherwise info.
  - Impact = run x uplift% x average cost.
- Sorted by severity (high, amber, info), then impact.
- Unverified: impact currency (PO cost not FX-converted).
(source: server.mjs :: /api/demand-actions)

## DEMAND Actions: client detectors
- Forecast vs trend (Insights): (source: daForecastTrend)
  - Per parent category. Needs prior FY and last FY >= 1,000 units each.
  - Actual YoY = last FY / prior FY minus 1. Forecast YoY = current FY (actual + forecast) / last FY minus 1.
  - Flags if |divergence| > 15 points.
  - Impact = min(|divergence|, 100%) x last FY revenue. high >= 80,000; amber >= 20,000.
- Anomaly to review: (source: daAnomalies, scanBIPatterns)
  - Last 12 months, B2B excluded. The subcategory needs >= 8 active months and >= 300 units.
  - Spike = > 2x both neighbours, >= 200 units, and LY same month not > 50% of it. Info severity.
  - Dip = < 40% of both neighbours, with neighbours >= 200. Amber.
- A-player stock-out: (source: daAplayer)
  - Tier A, DTC-available, 3PL on hand > 0.
  - 3PL weeks remaining < 20.
  - DTC+B2B average of the last 3 complete months >= 20 a month.
  - Annualised run-rate > 1.10x the forward 12-month buy-plan forecast.
  - Impact = min(annual run-rate minus fc12, fc12) x subcategory DTC ASP. high >= 50,000; amber >= 10,000.
  - Unverified: ASP currency.
- Data alerts: (source: daAlerts, scanAnomalyAlerts)
  - The subcategory needs >= 6 months and >= 300 units.
  - high:
    - Negative units.
    - A zero month between neighbours >= 200.
    - The same value >= 100 repeated for 3+ months.
  - amber:
    - A spike > 5x both neighbours and >= 500.
    - The latest month < 30% or > 300% of the prior 3-month average (the < 30% rule needs that average > 200).
- Back-in-stock demand: Klaviyo subscribers >= 10. Uplift = subscribers x take rate (default 35%). (source: daBis)
- Insights tab = Trading behind/ahead of LY and Forecast vs trend. Everything else is in Actions.

## DEMAND Actions: Trend Gaps and lifecycle
- Trend Gaps (subcategory x country x channel): (source: daTrendGaps, daSkuInsights)
  - 3-month window, starting at CUR_MONTH before the 15th, otherwise next month.
  - Flags if LY window >= 100 units, recommended YoY >= +10%, and recommended YoY minus plan YoY >= 15 points.
  - Volume: HIGH > 1,500 a month, MED > 400.
  - Apply writes subcategory overrides.
  - SKU view flags:
    - A forecast below 0.25x seasonal expected (dip) or above 3x (spike).
    - Allocation gaps >= 40 units in subcategories with LY >= 400 a month.
- Done / Snooze / Dismiss: saved in planner.demand_action_state by stable action key. Snooze defaults to 7 days or can be indefinite. Expired snoozes reopen. (source: server.mjs :: /api/demand-actions/state)
- Caching (v28.181, speed only, rows unchanged): (source: server.mjs :: /api/demand-actions, renderDemandActionsView)
  - Server rows (before status) are cached up to 90 seconds. A PO / PO line edit or a trading-calendar edit refreshes them on the next open.
  - Done / Snooze / Dismiss status is read live on every load, so it shows straight away.
  - The page shows the last loaded list at once on a repeat open, then refreshes behind it and repaints only if something changed.
  - Client detectors are recomputed from the live forecast on every paint.

## SUPPLY Actions (BI & REPORTS > ACTIONS)
- How the feed works: (source: server.mjs :: buildActionsRows)
  - Server-built and cached 10 minutes.
  - Child POs raise no actions.
  - State is in supply_action_state. A snooze is active while snooze_until >= today, or indefinitely if blank.
- Date and shipment:
  - Date conflict (high): landing override before today while not shipping, delivered or complete.
  - Unassigned shipment (low): no shipment on a non-complete PO.
  - Shipment ETA passed (amber): arrival/delivery/landing before today and not marked arrived.
  - Awaiting ERP receipt (amber): DELIVERED and arrival + 7 days before today.
  - Ship check-in: ready to ship and the ship date (departure, else production end + 7) within 7 days. high if the date has passed, else amber.
  - Over 20 pallets (amber): sum(qty / pallet_qty) > 20 before shipping, not DIRECT.
  - Shipped to master (amber): a rider PO marked shipped whose master has not departed.
- Supplier and approval:
  - PO missing supplier (high).
  - Awaiting supplier confirmation (low).
  - Supplier risk needs approval (amber): the line's supplier is not on the product's supplier list.
  - Discontinued arrival needs approval (amber): arrival after the per-country discontinue date.
  - Client deadline at risk (high): best arrival + 7 days later than the client deadline.
  - Crossdock likely required (high, v28.187): see the crossdock rule under PO action items. Same SQL rule (XDOCK_3PL_SQL) as the PO grid, so counts agree. A snooze on the PO grid item also snoozes this card, and the other way round.
  - Shipment escalated (high).
  - Supplier created new shipment (amber).
  - Partial cartons (low).
  - Required field missing (amber): PRODUCTION status with no Batch, Production #, Supplier or Branch.
- ERP:
  - PO not in ERP (high): no lines are mirrored.
  - Order-plan change pending ERP push (amber): line qty differs from the ERP mirror.
  - ERP POs not in planner (amber): one row when ERP Compare has non-ignored rows.
  - Manufacturing POs are excluded from the first two.
- Money:
  - Deposit not paid (amber).
  - Deposit FX missing (amber).
  - Deposit over-assigned (high).
  - Deposit remaining, with or without an open PO (amber, > 0.01 left).
  - Payment invalid (high): an amount set with no date.
  - "Unpaid, last month" (amber summary) and Aged payment (high, due before last month), both from the cash flow, shown with "$".
- Recommendations within the feed:
  - Consider air freight / Expedite production: (source: expediteActions)
    - Stock-out = 3PL available / (next 3 months forecast / 13).
    - Suggests air if air lands within stock-out + 3 days, otherwise expedite if production is still ahead.
    - high if value >= 5000 or gap >= 21 days.
    - Value = qty x average cost_price. Unverified: currency, though labelled £.
  - Add polybags (high): ships within 14 days, > 10,000 eligible units, no POLYBAG lines. (source: polybagActions)
  - Supplier completion date / invoice submissions (amber, with Apply). (source: submissionActions)
    - v28.187: a submitted completion date equal to the PO's current production end is already in effect, so it raises no card, no "set to" button on the PO grid END cell, and no DATES pending line. The submission row itself is not changed.
  - Manufacturing mismatch: high if a component is short, else amber. (source: manufacturingActions)
- Groups: PRIORITY, PAYMENTS, DATES, RECOMMENDATIONS, OTHER. The tab badge counts open high rows.

## PO action items (PO grid flags)
- payment_overdue (dates from 01-Jan-26 onward):
  - Start deposit: unassigned 7 days after start.
  - Completion: unassigned after production end, once the supplier invoice is set.
  - Balance: owing > 0.01 after its due date.
- late: delivery + 7 days before today.
- unassigned_shipment: no shipment, non-FOB market, and production end within 21 days.
- erp_date: drift >= max(5% of days out, 3 days).
- preship: documents due from production end minus 7 days.
- Also: not approved, missing production dates, missing master, payment invalid, shipped to master.
- crossdock_needed, "Crossdock likely required" (v28.187, red, Client/FBA tab):
  - The PO ships past the 3PL: branch country DIRECT, or a Direct to Client / UK B2B JLEW / UK B2B NEXT branch, or (v28.202) an Amazon FBA or AWD branch (UK/US/AU/CA FBA, US AWD), or a key account PO whose own branch is not a 3PL.
  - Its shipment lands at a 3PL. A 3PL branch has a market country (UK, US, EU, AU, CA) and a Fulfil id, and is not AWD (v28.202): UK ILG, US Geneva, EU iFulfillment, AU Coghlans. US AWD is an Amazon destination, not a 3PL.
  - Destination = the shipment's branch when set (only a 3PL counts). When the shipment branch is blank, any other PO on the same shipment with a 3PL branch.
  - Not for a Manufacturing (FOB) PO or a FOB-mode shipment.
  - Fires only when crossdock SKUs are empty and the PO is not complete or cancelled. Child POs raise nothing.
  - Clears by itself once crossdock SKUs are set, the shipment changes, or the PO completes.
  - Also counted in the open-actions metric po_actions.
- fulfil_link, "Link Fulfil PO" (v28.207, red, Master data tab):
  - A client PO (branch country DIRECT, a Direct to Client / UK B2B JLEW / UK B2B NEXT branch, or a key account PO; the same set as the v28.199 Fulfil push guard) that has no manual Fulfil link (po_links system fulfil, found_by manual, numeric Fulfil id).
  - Fulfil generates these POs from the sales order, so the guard refuses to push them until someone links the Fulfil PO (Master data > Linked records > Link Fulfil PO).
  - Not on complete or cancelled POs; child POs raise nothing. Clears by itself once linked.
  - Same SQL rule (FULFIL_LINK_NEEDED_SQL) in the PO grid, SUPPLY > Actions (type "Link Fulfil PO", priority, Client group) and the open-actions metric po_actions.
(source: supply/inject.html :: PO_ACTCOND)

## ERP Compare (Fulfil only)
- Lists Fulfil purchase orders that are not cancelled or done, are not matched to a planner PO (po, erp_po or Fulfil link), and whose supplier is a planner supplier.
- Totals are in the Fulfil PO currency.
- Cache: 2 minutes fresh, stale up to 10 minutes. The Fulfil data only: the planner side (POs, suppliers, ignored list, Fulfil links) is read live on every open, in one query (v28.179).
- The menu badge reads the cached copy only and refreshes it in the background once it is older than 2 minutes (v28.179; was 10), so opening ERP Compare rarely waits on Fulfil.
- Rows can be ignored, or imported via po-import-fulfil.
(source: server.mjs :: fulfilCompareRows)

## DTC Mismatch
- Open sales order = not void and not dispatched.
- POs are mapped by sales order reference or the app mapping.
- Issues:
  - no_po: no linked PO.
  - qty_mismatch: per-SKU SO qty differs from PO qty.
- Also lists unmapped open DTC-branch POs.
- Accepted issues drop out of the count.
(source: server.mjs :: _dtcMismatchCompute)

## Urgent Buy and projection
- Scope: the 3PL pool only. Excludes sets, discontinued, pre-launch, and SKUs with no DTC/B2B/ZAL/TikTok availability.
- Inputs:
  - avgM = 12-month forecast / 12.
  - Inbound = all non-complete PO qty (not time-phased).
  - Target months = (product override, else category cover, default 12 weeks) / 4.345.
- Status by cover including inbound: critical < 1 month; soon < target; surplus > 2x target.
- need_qty = max(0, avgM x target months minus (on hand + inbound)).
- too_late = today + lead time falls after the discontinue date.
- Shows critical and soon rows only. Cached 5 minutes.
(source: server.mjs :: _biProjectionCompute)

## Reallocate, Container Fill, Consolidate
- Reallocate: moves qty between countries within the same FUTURE or PRODUCTION production and supplier (zero-sum). (source: biReallocations)
  - Donor spare = (on hand + inbound) minus target x avgM, capped at the line qty.
  - Recipients are critical or soon countries, in whole cartons.
- Container Fill: (source: biContainerFill)
  - Spare = floor(20 minus pallets).
  - Departure = shipment date, else production end + 4 days.
  - Adds critical or soon SKUs from suppliers already on the shipment.
  - rush = days to departure < supplier production days.
- Consolidate: same-country shipments with under 20 pallets and departures within 14 days are packed into bins of up to 20 pallets, merging into the largest. (source: biConsolidations)
- All three are applied by a human only (Apply / Snooze / Dismiss).

## BUY & MOVE Actions
- KPI strip: To buy / Urgent / To move.
- Action x country matrix that expands to SKU lists, from the buy plan. Display only.
(source: artifact_v16.7.html :: renderBuyMoveActions)

## Common questions
**Q:** Why is a SKU RED on Forecast < Actual? **A:** Month-to-date actuals have already reached this month's SKU forecast, so the buy plan assumes no further demand this month. Raise the forecast with the inline override and save if more sales are expected.
**Q:** Why does Forecast > Run-rate show nothing early in the month? **A:** It only fires once at least 34% of the month has elapsed and the SKU has sold something this month.
**Q:** Why did a sell-through action disappear? **A:** Sell-through targets were decommissioned on 17-Aug-26, so those server actions no longer fire. Trading vs LY and event actions still do.
**Q:** Is the £ impact on an action exact? **A:** No. Impacts use average PO cost or ASP without FX conversion, so treat them as a ranking signal.
**Q:** Why does Urgent Buy differ from the buy plan? **A:** Urgent Buy counts all open PO qty as inbound regardless of timing and uses a flat 12-month average demand. The buy plan phases supply and demand by month.
**Q:** What counts as "ERP POs not in planner"? **A:** Open Fulfil POs for planner suppliers that are not matched to any planner PO and not ignored, as listed on ERP Compare.
