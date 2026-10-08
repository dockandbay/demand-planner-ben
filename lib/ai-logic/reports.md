---
topic: reports
title: Reports
covers: Read-only reports in HORIZON: REPORTS menu (Exec Summary, Performance metrics, Slow Moving, Key Arrivals, Markdown & EOS, Open-to-Buy, Stock Availability), DEMAND analysis views (Trends, Accuracy, Forecast trend anomalies, Safety stock, Stock cover, Ship bags, AI Insights), Inventory Status Report, SUPPLY Pipeline, What's next, Supplier delays, Production summary, Payments Due, PRODUCT Reports
sources:
  - artifact_v16.7.html :: renderReportView
  - artifact_v16.7.html :: renderExecView
  - artifact_v16.7.html :: buildExecData
  - artifact_v16.7.html :: getASP
  - artifact_v16.7.html :: hzInitCurMonth
  - artifact_v16.7.html :: renderPerformanceReport
  - artifact_v16.7.html :: renderKpisView
  - artifact_v16.7.html :: renderInventoryMetrics
  - artifact_v16.7.html :: renderSlowMovingReport
  - artifact_v16.7.html :: renderMarkdownEosReport
  - artifact_v16.7.html :: renderOtbReport
  - artifact_v16.7.html :: renderStockAvailability
  - artifact_v16.7.html :: renderInvStatus
  - artifact_v16.7.html :: statusMetrics
  - artifact_v16.7.html :: renderTrendsView
  - artifact_v16.7.html :: renderAccuracyView
  - artifact_v16.7.html :: renderForecastAnomaliesView
  - artifact_v16.7.html :: renderSafetyStockView
  - artifact_v16.7.html :: renderStockCoverView
  - artifact_v16.7.html :: renderShipBagView
  - artifact_v16.7.html :: hzInsightsPeriods
  - artifact_v16.7.html :: buildInsightsData
  - artifact_v16.7.html :: getInsights
  - supply/inject.html :: renderBIMetrics
  - supply/inject.html :: buildPaymentsDue
  - supply/inject.html :: renderProductReports
  - supply/inject.html :: renderProductCatalogue
  - supply/inject.html :: renderPimWaitingRoom
  - server.mjs :: _kpiBaseCompute (/api/kpi/*)
  - server.mjs :: computeOpenActions (/api/supply/action-metrics/data)
  - server.mjs :: /api/supply/:section (case bi, pipeline, upcoming, supplier-timing)
  - server.mjs :: /api/scenario/slow-moving
  - server.mjs :: /api/scenario/markdown-eos
  - server.mjs :: /api/scenario/otb
  - server.mjs :: /api/scenario/key-arrivals
  - server.mjs :: /api/scenario/prime-day
  - server.mjs :: poDeliveryDelays (/api/supply/po-delays)
  - server.mjs :: /api/demand/trends/plan-sanity, /multi-year, /channel-mix, /type-mix
  - server.mjs :: buildLockedFc
  - server.mjs :: /api/demand/forecast-anomalies
  - server.mjs :: /api/demand/stock-cover
  - server.mjs :: /api/product/reports/sampling, /api/product/reports/catalogue, /api/product/pim-waiting-room
fingerprints:
  artifact_v16.7.html::renderReportView: 806be94bdf32
  artifact_v16.7.html::renderExecView: 255e38a51f5e
  artifact_v16.7.html::buildExecData: 279a59ce1aeb
  artifact_v16.7.html::getASP: c70881d04bde
  artifact_v16.7.html::hzInitCurMonth: 7be42fa3ee51
  artifact_v16.7.html::renderPerformanceReport: 4445780110cf
  artifact_v16.7.html::renderKpisView: 903f2ad5b278
  artifact_v16.7.html::renderInventoryMetrics: cd8c35e5ce61
  artifact_v16.7.html::renderSlowMovingReport: 44d0a2dbe4dd
  artifact_v16.7.html::renderMarkdownEosReport: 4b5928c38f67
  artifact_v16.7.html::renderOtbReport: 3d410f502fdd
  artifact_v16.7.html::renderStockAvailability: 72547dd888db
  artifact_v16.7.html::renderInvStatus: ba1fccbb71eb
  artifact_v16.7.html::statusMetrics: aad255d3ba05
  artifact_v16.7.html::renderTrendsView: ba92239c7585
  artifact_v16.7.html::renderAccuracyView: ed20d484765e
  artifact_v16.7.html::renderForecastAnomaliesView: 1dbfc6251b6c
  artifact_v16.7.html::renderSafetyStockView: d8fc8c03ded7
  artifact_v16.7.html::renderStockCoverView: 866adba1d06a
  artifact_v16.7.html::renderShipBagView: fa1c0cbbf031
  artifact_v16.7.html::hzInsightsPeriods: 57162f07aad3
  artifact_v16.7.html::buildInsightsData: 92660fc8f972
  artifact_v16.7.html::getInsights: e9c5f0485a0e
  supply/inject.html::renderBIMetrics: 53246c47c4c2
  supply/inject.html::buildPaymentsDue: b6260329df5f
  supply/inject.html::renderProductReports: 4aa694e16e7f
  supply/inject.html::renderProductCatalogue: e590a8dc271a
  supply/inject.html::renderPimWaitingRoom: d6c089a9c8e7
  server.mjs::_kpiBaseCompute: 8e09912ef657
  server.mjs::computeOpenActions: 378be156b1bc
  server.mjs::/api/supply/:section: 6338a43b5269
  server.mjs::/api/scenario/slow-moving: fb22071cbe1a
  server.mjs::/api/scenario/markdown-eos: bb925e0e2b9b
  server.mjs::/api/scenario/otb: 2e30af6efc34
  server.mjs::/api/scenario/key-arrivals: 944c5a8c92c7
  server.mjs::/api/scenario/prime-day: a97ff1a33a71
  server.mjs::poDeliveryDelays: 6f0ecd0f731a
  server.mjs::/api/demand/trends/plan-sanity: 9af35110c4cf
  server.mjs::/api/demand/trends/multi-year: ce0a578fb83c
  server.mjs::/api/demand/trends/channel-mix: b3197fd0dacd
  server.mjs::/api/demand/trends/type-mix: ab9ec139e345
  server.mjs::buildLockedFc: 9fb263e883dd
  server.mjs::/api/demand/forecast-anomalies: 14458fa9342b
  server.mjs::/api/demand/stock-cover: c8139e100995
  server.mjs::/api/product/reports/sampling: 509061cede41
  server.mjs::/api/product/reports/catalogue: d5ebe5a0f0b8
  server.mjs::/api/product/pim-waiting-room: 4a622b24224b
verified_version: v28.224
---
## Shared definitions
- CUR_MONTH is the latest YYYY_MM in DATA that has units, capped at the calendar month. CUR_YTD_END is the month before it. (source: artifact_v16.7.html :: hzInitCurMonth)
- The financial year runs March to February and is named after the year it ends: FY27 = Mar-26 to Feb-27. H1 = Mar to Aug; H2 = Sep to Feb. (source: artifact_v16.7.html :: hzFyName, hzFyRange)
- Many server reports value stock as units x PO-line cost_price or products.cost with no FX conversion. The UI usually labels this "£" (some supply views use "$"). Unverified: whether stored costs are all in one currency, so treat these values as indicative rather than exact GBP. (source: server.mjs :: /api/scenario/*, case bi)

## Exec Summary (REPORTS > Exec Summary)
- What it shows:
  - Units and revenue by channel (DTC, FBA, B2B; TikTok is folded into DTC) by month.
  - Covers the current FY plus the next full FY.
  - Rows come from DATA (subcategory x country x channel). Clicking a channel expands it by country.
  (source: artifact_v16.7.html :: buildExecData)
- How each month is filled:
  - Months before CUR_MONTH use actual units and revenue.
  - The current partial month uses the FULL-month forecast (curMonthForecast), not month-to-date.
  - Future months use the plan forecast calc().fu with no AI overlay.
  - Forecast revenue = units x getASP.
  (source: buildExecData)
- How getASP picks a price:
  - An actual month uses its real ASP.
  - A projected month uses the ASP of the same month last year (walking back to 2024), else the latest actual month, else the retail-list ASP.
  - It then applies price-change uplifts, capped at 1.2x the retail-list ASP.
  - Finally it applies the DEMAND Config ASP reduction % and the discontinued discount %.
  (source: getASPraw, getASP, aspAdjFactor)
- LY for each month = the actual for the same month a year earlier. If that LY month is the current month, its full-month forecast is used. For next-FY months, LY = this FY's forecast. (source: buildExecData)
- Cards (source: renderExecView):
  - Prior FY total, with growth vs the FY before (shown only if those actuals exist).
  - Current FY = actual + forecast.
  - YoY % = round((current minus LY) / LY x 100). Badges cap at +999%.
- Toggles: H1/H2 subtotals, and Hide last year (hides the vs-LY badges).
- Revenue is shown in £ and the app does no FX conversion. Unverified: whether non-UK sales revenue is converted to GBP upstream by the ETL.

## Performance > Demand Metrics (In Stock, Slow moving, Inventory cover, Stockout risk, Discontinued)
- Filters:
  - Split: All / Core / Seasonal / Non-Core (products.core_seasonal).
  - "As of" month: stock comes from the nearest inventory_snapshots row on or before that date. Blank means live v_product_inventory.available.
  (source: artifact_v16.7.html :: renderKpisView; server.mjs :: kpiOnhand)
- Shared rules:
  - Active = products.in_planning_scope.
  - Discontinued = discontinue date strictly before today. AU uses discontinue_date_au_final (falling back to global), CA uses discontinue_date_ca (falling back to global), and other markets use discontinue_date_final.
  - Pools: US/UK/EU/AU 3PL (serves DTC + B2B) and US/UK/EU/AU/CA FBA, plus Total 3PL and Total FBA rows.
  - Value = on hand x cogs_<co>_3pl_final. Unverified: currency of that cost.
  (source: server.mjs :: _kpiBaseCompute, kpiDisc)
- In Stock:
  - Counts active, non-discontinued SKUs that are available in that market and channel (for 3PL, available for DTC or B2B).
  - In stock = available units > threshold (default 5 for both 3PL and FBA, editable).
  - % = round(in stock / SKUs x 100). Also shows A-tier counts and %.
  (source: /api/kpi/in-stock)
- Slow moving:
  - Applies to SKUs with on hand > 0.
  - Cover months = on hand x 12 / next 12 months of forecast_outputs, starting from the current month.
  - Slow = cover > N months (default 6). Zero demand counts as infinite cover, so the SKU is slow.
  (source: /api/kpi/slow-moving)
- Inventory cover: monthly demand = 12-month forecast / 12. Months cover = units / monthly demand, rounded to 0.1. (source: /api/kpi/inventory-cover)
- Stockout risk:
  - At risk = forecast for the next N months (default 3, max 12) > on hand. Inbound POs are NOT counted.
  - % = at risk / SKUs with demand. Units short = sum of (need minus on hand).
  (source: /api/kpi/stockout-risk)
- Discontinued: SKUs past their discontinue date that still hold on hand > 0, with units and value. This tab has no as-of. (source: /api/kpi/discontinued-stock)
- Results are cached for 5 minutes and refreshed on forecast save or ETL.

## Performance > Supply metrics
- Pipeline tiles (source: supply/inject.html :: renderBIMetrics; server.mjs :: case bi):
  - Open POs = status not like complete, split into future, production and shipping.
  - In production and in transit units = PO line qty. Value = qty x cost_price, not FX-converted, labelled "$".
  - 40ft equivalents = sum(qty / pallet_qty) / 20 pallets.
  - Awaiting supplier confirmation.
  - Deposits outstanding = deposits drawn on by at least one non-complete PO.
- Open-actions scoreboard: a weekly snapshot every Thursday (GMT week ending) into planner.action_metrics_snapshot. The trend shows the last 52 weeks. Live values are cached for 5 minutes. (source: server.mjs :: computeOpenActions, snapshotOpenActions)
- Scoreboard metrics. "Open PO" means not complete or cancelled, not a child PO, with lines qty > 0.
  - po_actions: no supplier, or landing override before today while not shipping or delivered, or (v28.187) crossdock likely required (the PO action items rule in actions).
  - po_actions also counts (v28.207) client POs with no manual Fulfil link ("Link Fulfil PO", same rule as the PO grid).
  - order_plan: POs whose planner line qty differs from the ERP line qty.
  - shipments: no shipment_ref, status production or ready to ship, and production end (else today) within 21 days.
  - manufacturing: count of manufacturing mismatch actions.
  - samples: open sample requests that are supplier-shipped or have tracking, are past the required date, have a pending charge, or have an unread supplier note.
  - payments_overdue: unpaid final-PO Completion or Balance, plus unpaid unclosed deposits, with due date on or after 01-Jan-26 and before today. This mirrors Payments Due.
  - dtc_mismatch: unaccepted DTC sales-order issues plus unmapped DTC-branch POs.
- total_our = po_actions + order_plan + shipments + manufacturing + samples + payments_overdue + dtc_mismatch.
- Kept separate and NOT in total_our: supplier_pos (awaiting supplier confirmation), supplier_dtc (DTC POs not accepted), and open reallocation recs.

## Performance > Inventory metrics
- 3PL discrepancy (UK, US, AU, EU): matched SKUs whose on hand OR available differs from the ERP by more than 10%. If the ERP shows 0, any gap counts.
- FBA discrepancy (US, UK, EU, AU, CA): same > 10% rule.
- FBA aged:
  - Money = the aged-cost total, in the currency of the imported report.
  - Units older than 270 days = buckets 271-365, 366-455 and 456+.
- A tile reads "no report imported" when the source report is missing.
(source: artifact_v16.7.html :: renderInventoryMetrics)

## Slow Moving (REPORTS > Slow Moving)
- Scope: every in-scope SKU x warehouse with on hand > 0. US FBA includes AWD.
- Velocity:
  - Trailing velocity = units sold in the last 3 months up to the latest sales month / 13 weeks.
  - Forecast velocity = next 3 months of forecast_outputs / 13.
- Cover weeks = on hand / velocity. No demand gives null, which is treated as slowest.
- Days since sale = today minus the last month with sales.
- Value = on hand x average PO-line cost_price, shown as "£ tied up". Not FX-converted.
- Defaults: UK, 3PL, trailing basis, cover >= 26 weeks, units >= 50. The screen shows the top 400 rows; the CSV has all of them.
(source: server.mjs :: /api/scenario/slow-moving; artifact_v16.7.html :: renderSlowMovingReport)

## Prime Day (DEMAND > Scenario > Prime Day)
- Per SKU, available stock in the selected market (All, UK, US, EU, AU, CA): FBA, AWD (US only, n/a for other markets), 3PL and Total.
- Inbound FBA (v28.214) = SHIPPED stock only, with a reference and an ETA: open (unreceived) inbound shipments to {country}_fba (excluded references dropped), plus in-flight FBA transfers (fba_pending_transfers) once dispatched and not yet on an inbound shipment. A shipment of an FBA-branch PO counts as that country's FBA even when it lands at a 3PL first (routed via crossdock). Unshipped POs and AWD inbound are NOT counted (Ben 07-Oct-26).
- Optional "FBA inbound arriving by" date: only ETAs on or before it. Blank = all shipped inbound.
- One Inbound FBA column per country when the market is All (plus a total); just that country's column when a market is picked. The Inbound FBA KPI is the total for the columns shown.
- SKUs with no stock but with FBA inbound in the shown markets are listed too.
- CSV downloads the grid as shown (same market, category and SKU list).
(source: server.mjs :: /api/scenario/prime-day; supply/inject.html :: renderPrimeDay)

## Markdown & EOS (REPORTS > Markdown & EOS)
- Season end defaults to the next 31 Aug.
- Basis:
  - fc (default) = forecast from the current month to season end.
  - trail = last 3 months of sales / 13 x weeks to end of season.
- Residual = on hand minus min(on hand, projection). Ratio = residual / on hand.
- Status:
  - Clear if ratio <= 0.05.
  - Otherwise Markdown if any of: the SKU is not live; it is dead (no velocity, no forecast and no trailing 12-month sales); or residual > 1.5x trailing 12-month sales.
  - Otherwise Carryover.
- Markdown depth by ratio:
  - 15% if ratio < 0.3.
  - 25% if < 0.6.
  - 35% if < 0.85.
  - 50% otherwise.
  - Dead or not-live stock gets at least 35%.
- Money:
  - Residual cost = residual x average PO cost.
  - Give-away = residual x net retail x depth. Net retail = market retail price, divided by 1.2 for UK and EU.
(source: server.mjs :: /api/scenario/markdown-eos; renderMarkdownEosReport)

## Open-to-Buy (REPORTS > Open-to-Buy)
- Grain: category x market. Horizon N defaults to 6 months (range 1 to 12).
- Inputs:
  - Demand = forecast_outputs from the current month for N months.
  - On order = qty on non-complete POs landing in [today, today + N months). Landing = shipment arrival > delivery > landing > PO override.
  - On hand = available stock, plus AWD for the US.
- Formulas:
  - Projected close = on hand + on order minus demand.
  - Target close = 8 weeks x weekly demand, where weekly demand = demand / (N x 4.345). The 8 weeks is fixed because sell-through targets were decommissioned.
  - OTB units = target close minus projected close.
  - OTB cost = OTB units x category average PO cost.
- Status: buy if OTB > max(50, 5% of demand); over if OTB < minus that; otherwise ok.
(source: server.mjs :: /api/scenario/otb)

## Key Arrivals (REPORTS > Key Arrivals)
- Scope: non-complete POs arriving today or later.
- Velocity = next 3 months of forecast / 13 at the destination market (US adds AWD).
- Days to stockout = on hand / velocity x 7. Gap = days to stockout minus days to arrival.
- Status: critical if gap < 0; tight if 0 to 14 days; otherwise ok; none if there is no demand.
- Grouped by shipment, or by PO if the PO is not on a shipment.
- Defaults: within 4 weeks, all markets, critical only.
(source: server.mjs :: /api/scenario/key-arrivals)

## Stock Availability and 3PL & Invoicing
- Stock Availability is built client-side from SKUM, plus out-of-scope SKUs that still hold stock.
  - Columns: SOH 3PL, FBA, AWD (US only), and the next 2 inbounds.
  - Status: DISC if the discontinue date is on or before today, else CLOSED, else FUTURE if launch is after today, else ACTIVE.
  (source: artifact_v16.7.html :: renderStockAvailability, saRows)
- 3PL & Invoicing: 3PL invoice mapping with missing-file and cross-month duplicate-charge warnings. Unverified: detailed rules not studied.

## Inventory Status Report (BUY & MOVE > INVENTORY > Status Report)
- Market pills US/UK/EU/AU/CA (default US). Data comes from BP.statusMetrics(mkt), a read-only view of the buy-plan data.
- Pools: 3PL if DTC, B2B or TikTok is available; FBA if FBA is available.
- Weekly demand = next 3 full forecast months / 13, skipping the current month.
- Cover weeks = (on hand + on order) / weekly demand.
- Targets: 3PL = products 3PL cover (default 12 weeks). FBA = the buy engine's FBA cover (v28.168): SSM FBA cover when SSM FBA is opted in for the market, else the Buy Plan Settings "FBA target" box (default 8). (source: artifact_v16.7.html :: statusMetrics)
- Scope: not FUTURE, already launched, and not discontinued, unless "Show discontinued" is on.
- Each location is classified once, in priority order:
  1. Backorder: on hand < 0.
  2. Out of stock: on hand = 0 and demand > 0.
  3. Low stock: on hand > 0 and cover < target.
  4. Overstock: cover > 2x target.
- Lost sales for out-of-stock rows = weekly demand x weeks until the next inbound ETA x ASP. "No restock" means nothing is inbound. Unverified: ASP currency (labelled £).
- Delivery runway (ACTIVE SKUs):
  - Covers 6 full forecast months.
  - Starts from 3PL + FBA on hand.
  - Each month adds inbound by ETA month (past or undated inbound lands in month 1) and subtracts the DTC + B2B + FBA + ZAL forecast.
  - The first negative month is the projected stock-out.
- PO inbound delays (/api/supply/po-delays):
  - Landing date = shipment arrival > delivery > landing > PO override, else production end (or start + production days) + 7 days + sea lead time.
  - Open POs are snapshotted into po_delivery_history at most once every 10 minutes.
  - Slipped = latest recorded date is later than the first recorded date. Slips before the first snapshot are invisible.
  - A line is impacted if on hand <= 0, or the stock-out date (today + on hand / weekly forecast x 7) falls before landing.
  - Value at risk = qty x average PO cost, not FX-converted.
  (source: server.mjs :: poDeliveryDelays)
- New-season launches: FUTURE SKUs by release window. Imminent = within 120 days. Red if on order + inbound <= 0.

## Trends (DEMAND > Trends)
- Common rules:
  - Cutoff = the month before the latest sales month, so the partial month is excluded.
  - History starts Jan-2024, and years 2024/2025/2026 are hard-coded.
  - Plan year = latest actuals year + 1, from forecast_outputs.
  - Server cache is 10 minutes; Refresh clears it. Units only.
  (source: server.mjs :: _trendsMeta, _trendsWin)
- Plan sanity (category x market, Jan to cutoff like for like):
  - R1: plan > 1.5x the best year.
  - R2: plan < 0.7x 2026.
  - R3: plan / 2026 outside 0.5 to 2.0.
  - R4: plan > 0 but no live available SKUs.
  - R5: plan identical to the prior plan.
  - R6: no plan or zero plan while 2026 has actuals.
  - Status: Blocked if R3, R4 or R5. "No plan" if there are no plan rows. Review if any other rule fires. Otherwise OK.
- Multi-year trend:
  - Gap to peak = 2026 / peak minus 1.
  - Suspect month = 2026 units < 40% of the trailing 3-month average AND > 30% of usually active SKUs sold zero. Suspect months are excluded from growth.
  - Classes: Collapsed (< 25% of peak), New high, Two-season fall, Declining, Recovering.
- Channel mix:
  - Rolling 12 months, B2B excluded.
  - Benchmark b = market FBA / (DTC + FBA). Headroom = max(0, DTC x b / (1 minus b) minus FBA).
  - Below benchmark: Stocking gap if > 25% of SKU-months had DTC sales but no FBA sales; Demand gap if < 15%; else Investigate.
  - At or above benchmark: Over-indexed.
- Type mix: SET share = SET / (SET + MASTER) for DTC and FBA, rolling 12 months.

## Accuracy (DEMAND > Analysis > Accuracy)
- Compares actuals with the LOCKED forecast: the SKU forecast from the latest forecast_runs snapshot taken strictly before each month began. There is no lag selector. (source: server.mjs :: buildLockedFc; artifact_v16.7.html :: renderAccuracyView)
- Window: last 3, 6 or 12 completed months (default 6). Grain: category, subcategory or SKU.
- Exclusions: sets, and SKU-months where forecast and actual are both <= 0.
- Formulas:
  - WMAPE = sum |forecast minus actual| / sum actual.
  - Bias = sum (forecast minus actual) / sum actual. Positive = over-forecast.
  - Hit rate = share of SKU-months (actual > 0) with |error| / actual <= 30%.
- Colours: WMAPE green < 20%, amber < 50%, red above. Bias is neutral if |bias| < 10%. Units only.

## Forecast trend anomalies (DEMAND > Forecast trend anomalies)
- Compares sales_actuals with the CURRENT forecast_outputs (not locked snapshots), per SKU x country x channel.
- Window: last 3 complete months. If the newest month's total is < 60% of the average of the other two, the window shifts back one month (treated as an incomplete load).
- Defaults: divergence >= 25%, gap >= 15 units a month, sustained >= 2 consecutive months in the same direction.
- Hot = actuals above forecast; Cold = below.
- Not flagged if the forecast has caught up: forward average (current + next 2 months) >= 85% of recent actual (Hot), or <= 115% (Cold).
- Impact = sum of |gap| units x product cost. Zero-impact rows are dropped. Not FX-converted though labelled GBP.
(source: server.mjs :: /api/demand/forecast-anomalies)

## Safety stock (DEMAND > Analysis, recommendation only)
- Service level 90 / 95 / 97.5 / 99% gives Z = 1.28 / 1.64 / 1.96 / 2.33 (default 95%).
- d = mean of the forward 6 months of buy-plan demand.
- Sigma, first available of:
  - RMS of locked-forecast error over the trailing 18 months (needs >= 3 points).
  - Stdev of actuals (needs >= 4 points).
  - 0.5 x d.
- Lead time defaults: 12 weeks for 3PL, 8 weeks for FBA. Lead CV default 0.25.
- SS = Z x sqrt(L x sigma^2 + d^2 x sigmaL^2).
- Suggested on hand = SS + a 4-week cycle allowance, compared with the current cover target.
(source: artifact_v16.7.html :: renderSafetyStockView)

## Stock cover (DEMAND > Analysis)
- SOH value per warehouse per month = latest inventory snapshot in the month x products.cost. Demand value = units sold x cost.
- Weekly demand = trailing 3 months (including the snapshot month) / 3 / 4.33.
  - FBA and AWD pools use FBA sales.
  - Other pools use DTC + B2B + ZAL + TikTok.
- Weeks cover = SOH value / weekly demand value. Target defaults to 12 weeks (editable).
- Shading vs target:
  - <= 50% dark red.
  - < 80% red.
  - <= 120% green.
  - Above that, amber.
- Excess capital = (cover minus target) x weekly demand.
- Shows the last 18 months. CA is excluded. Unverified: cost currency (labelled GBP).
(source: server.mjs :: /api/demand/stock-cover; renderStockCoverView)

## Ship bags (DEMAND > Analysis)
- Recommended bags per month = 0.449 x forecast DTC units, excluding SHIPBAG SKUs and Non Core.
- Size split (normalised): Medium 33.5 / Large 57.2 / XL 9.2, for SHIPBAG-MED, SHIPBAG-LAR and SHIPBAG-XLG.
- Based on a 12-month regression on UK actuals (R squared 0.95).
- Covers 11 months from CUR_MONTH, per US/UK/AU/EU.
- Overrides and "Apply recommendations" write into the demand plan.
(source: renderShipBagView)

## AI Insights (DEMAND > Actions, AI Insights button)
- Periods are relative to the current month (since v28.158):
  - last_year = the full calendar year before the current one.
  - ytd = completed months this year (Jan to CUR_YTD_END) vs the same months last year.
  - forecast = 19 months from CUR_MONTH.
  - recent6 = the 6 complete months ending CUR_YTD_END.
  (source: artifact_v16.7.html :: hzInsightsPeriods)
- Data sent, current country only:
  - Per subcategory x channel: monthly actual units, forecast units (calc().fu) and the growth input.
  - New SKUs launched in the last 12 months with > 50 units in the 3PL warehouse over recent6.
  (source: buildInsightsData)
- The app only assembles the data. Claude (claude-sonnet-4-6 via the server /api/ai proxy) writes 4 to 10 JSON recommendations with severity, confidence and suggested values. Applying one writes those values into the forecast. (source: getInsights)

## SUPPLY Pipeline and What's next (BI & REPORTS)
- Data: open POs.
- Dates:
  - Production end = override, else start + supplier production days.
  - Ship = shipment departure > Flexport departure > supplier ship date > production end + 7.
  - Arrival = known dates, else ship + sea lead time.
- Stages:
  - Checked in: arrival <= today.
  - In transit: ship <= today ("Arriving" if arrival is within 14 days).
  - Production complete: production end <= today.
  - In production: start <= today.
  - Otherwise Awaiting production.
- Next-milestone health: late if < 0 days, soon if <= 7, else ok.
- Overdue:
  - Completing: production end passed and not done.
  - Shipping: planned ship passed and not departed.
  - Arriving: ETA passed and not arrived.
- What's next window: 2 / 4 / 8 weeks or all (default 4). Overdue items ignore the window. Pipeline can hide items checked in more than 4 weeks ago.
- Values are in supplier currency with no conversion (cards show the market symbol, totals show £).
(source: server.mjs :: /api/supply/:section case pipeline, upcoming)

## Supplier delays and Production summary (BI & REPORTS)
- Supplier delays:
  - Slip days = latest minus first supplier-submitted completion date, aggregated per supplier.
  - "Our issue" excludes a PO from the supplier's stats.
  - Filters: PROD# and started within 3 / 6 / 12 months.
  (source: server.mjs :: case supplier-timing)
- Production summary: sum of line qty by category and SKU for a production number and/or batch, optionally per supplier.

## Payments Due (SUPPLY > PAYMENTS)
- What is listed:
  - PO Completion and Balance milestones, only for final POs (is_final) with a due date and amount > 0.01.
  - Deposits and Other payments, unless closed.
  - Child POs are excluded. Rows due before 01-Jan-26 are hidden.
- Paid: a PO milestone is paid once an amount is assigned; a deposit is paid once it has a paid date.
- Overdue = unpaid and due before today. "+4wk" = due within 28 days, or no date.
- Amounts are in supplier currency.
(source: supply/inject.html :: buildPaymentsDue)

## PRODUCT Reports
- Sampling:
  - Built from product development requests and items. "In progress" = item status in_development.
  - Tiles: products and samples in progress vs total, plus total requests.
  - Pivots:
    - Type x Season.
    - Supplier x Season, with average samples per request, to approve (status approved) and to reject (status dropped).
  (source: server.mjs :: /api/product/reports/sampling; supply/inject.html :: renderProductReports)
- Approved products: a staging list of working SKUs with status waiting / in_pim / dropped (waiting first). Marking "in PIM" does not write to Airtable. (source: server.mjs :: /api/product/pim-waiting-room; renderPimWaitingRoom)
- Catalogue: one row per product size.
  - Fallbacks:
    - Season: from the item, else the ref.
    - SKU: the mapped SKU, else the working SKU (marked "wip").
    - Barcode: the size barcode, else the products EAN (marked "pim").
  - Filters: season, category, search, hide no-barcode.
  - PDF export maximum is 5,000 rows.
  (source: server.mjs :: /api/product/reports/catalogue; renderProductCatalogue)

## Common questions
**Q:** Why does Exec Summary show a full month for the current month when the month is not over? **A:** The current partial month uses the full-month forecast, not month-to-date actuals. Past months are actuals; future months are plan forecast x ASP.
**Q:** Why does Slow moving in Demand Metrics differ from the Slow Moving report? **A:** They are different calculations. Demand Metrics uses months of cover from the 12-month forecast with a > 6 month threshold. The Slow Moving report uses weeks of cover from trailing 3-month (or forecast) velocity, with >= 26 weeks and >= 50 units by default.
**Q:** Does Stockout risk include stock on the water? **A:** No. It compares the next N months of forecast with on hand only. Inbound is counted in the Inventory Status runway and in Open-to-Buy.
**Q:** Is the £ value on these reports exact GBP? **A:** Treat it as indicative. Most server reports multiply units by PO cost_price or product cost without FX conversion.
**Q:** What forecast does Accuracy compare against? **A:** The locked forecast: the latest saved snapshot taken before each month started. Forecast trend anomalies uses today's forecast instead.

## Stock Availability description column (v28.222, SUG-0043)
- REPORTS ▸ Stock Availability and the SA drawer show a Description column (the product name) next to the SKU, and on phone cards under the SKU. The filter box accepts SKU codes (any word containing a hyphen keeps the old "any of these SKUs" match) or plain words, which must all appear in the SKU or the description ("whitsunday large"). Display only. (source: saRows, saTableHTML, saRowMatch)

## Intake deadlines (DEMAND ▸ Analysis ▸ Intake deadlines, v28.224, SUG-0045)
- Every master SKU x market (UK, US, EU, AU) that is available there and not discontinued has an intake deadline: the explicit date set in this view (planner.intake_deadlines), else the market launch date minus N days (app_settings.intake_lead_days, default 14). Deadlines more than 90 days past are ignored. (source: intakeRows)
- Status by the deadline: In stock (any stock in the market's 3PL + FBA, plus AWD for the US); On track (an inbound ETA on or before the deadline); No ETA (inbound without a date); Late (earliest inbound after the deadline, by N days); Missing (no stock, nothing inbound). Missing, Late and No ETA are alerts. (source: intakeRows, _ikInbound)
- Snooze hides an alert until a date (planner.alert_snoozes, key intake|SKU|market), with an optional reason; bulk set deadline and bulk snooze on selected rows. (source: renderIntakeView; server.mjs :: /api/demand/intake)
- The red counter on DEMAND ▸ Analysis and on the Intake deadlines tab = alerts not snoozed whose deadline is overdue or within 60 days. (source: intakeAlertCount, intakeBadgeSync)
