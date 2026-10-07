---
topic: demand-engine
title: Demand forecast engine
covers: Planning scope, actuals and the current month, subcategory forecast (calc), SKU shares and the chained last-year rule, saved SKU overrides, smoothing and auto-smooth, sets explosion, discontinued run-off, Preorder/KA/TikTok/Zalando folds, the 18-month window, fiscal years, trends, ASP, display basis and roll-ups
sources:
  - migrations/248_planning_scope_status_gate.sql :: set_in_planning_scope
  - server.mjs :: buildDATA
  - server.mjs :: buildSKURAW
  - server.mjs :: buildFC_CURRENT
  - server.mjs :: buildFC_OUTPUTS
  - server.mjs :: computeAutoForecastFromFeed
  - artifact_v16.7.html :: hzInitCurMonth
  - artifact_v16.7.html :: hzLyMonths
  - artifact_v16.7.html :: hzFyName
  - artifact_v16.7.html :: fyMonths
  - artifact_v16.7.html :: fyLabel
  - artifact_v16.7.html :: hzTrendSums
  - artifact_v16.7.html :: isActualMonth
  - artifact_v16.7.html :: augmentSKUM
  - artifact_v16.7.html :: zalInit
  - artifact_v16.7.html :: tikInit
  - artifact_v16.7.html :: buildLiveBpOverlay
  - artifact_v16.7.html :: _pkaIngest
  - artifact_v16.7.html :: parseStored
  - artifact_v16.7.html :: parseInput
  - artifact_v16.7.html :: calc
  - artifact_v16.7.html :: curMonthForecast
  - artifact_v16.7.html :: skuSales
  - artifact_v16.7.html :: skuHasLY
  - artifact_v16.7.html :: skuOvSet
  - artifact_v16.7.html :: skuCommitOv
  - artifact_v16.7.html :: buildSkuShares
  - artifact_v16.7.html :: contribResolve
  - artifact_v16.7.html :: tierMix
  - artifact_v16.7.html :: skuHasAnyActivity
  - artifact_v16.7.html :: filteredSkus
  - artifact_v16.7.html :: insertInlineSkuRows
  - artifact_v16.7.html :: subcatSkuEffTotals
  - artifact_v16.7.html :: skuMonthlyMap
  - artifact_v16.7.html :: renderSkuView
  - artifact_v16.7.html :: buildPlanDownload
  - artifact_v16.7.html :: runoffAlloc
  - artifact_v16.7.html :: runoffPoolSkus
  - artifact_v16.7.html :: runoffChannels
  - artifact_v16.7.html :: setDemandRaw
  - artifact_v16.7.html :: setBuildCap
  - artifact_v16.7.html :: _setSize
  - artifact_v16.7.html :: discCutoffMo
  - artifact_v16.7.html :: buildLiveDemand
  - artifact_v16.7.html :: _hzBuildDemandCore
  - artifact_v16.7.html :: _hzDemandGen
  - artifact_v16.7.html :: hzDemandBuildAsync
  - artifact_v16.7.html :: _hzDbRun
  - artifact_v16.7.html :: hzDemandScope
  - artifact_v16.7.html :: computeSmoothAlloc
  - artifact_v16.7.html :: applySmoothAlloc
  - artifact_v16.7.html :: runAutoSmooth
  - artifact_v16.7.html :: smoothCatsToPct
  - artifact_v16.7.html :: afBuildBuyFeed
  - artifact_v16.7.html :: expAct
  - artifact_v16.7.html :: expFc
  - artifact_v16.7.html :: subcatLySplit
  - artifact_v16.7.html :: periodTotX
  - artifact_v16.7.html :: getASPraw
  - artifact_v16.7.html :: getASP
  - artifact_v16.7.html :: priceUpliftFactor
  - artifact_v16.7.html :: aspAdjFactor
  - artifact_v16.7.html :: buildBody
  - artifact_v16.7.html :: _makeCatTotRow
  - artifact_v16.7.html :: renderKeyAccountsView, kafPkaRefresh, loadPreorderKA
  - server.mjs :: /api/supply/ka-forecast-cells, /api/supply/ka-forecast-cell, kaCellQty
fingerprints:
  migrations/248_planning_scope_status_gate.sql::set_in_planning_scope: b1b7fa248f49
  server.mjs::buildDATA: b1b365e09434
  server.mjs::buildSKURAW: bcbc97d69507
  server.mjs::buildFC_CURRENT: 9396b5f52559
  server.mjs::buildFC_OUTPUTS: 8fd6e8cafb46
  server.mjs::computeAutoForecastFromFeed: 81f1aadccc9e
  artifact_v16.7.html::hzInitCurMonth: 7be42fa3ee51
  artifact_v16.7.html::hzLyMonths: 8e2cd5528491
  artifact_v16.7.html::hzFyName: c03621f9b00d
  artifact_v16.7.html::fyMonths: 965845a3b418
  artifact_v16.7.html::fyLabel: a8b1f4e28fa4
  artifact_v16.7.html::hzTrendSums: 6185baeb7180
  artifact_v16.7.html::isActualMonth: 5006af6eeace
  artifact_v16.7.html::augmentSKUM: 6a3368bc5138
  artifact_v16.7.html::zalInit: ac5eab8f1024
  artifact_v16.7.html::tikInit: e030a71e53dc
  artifact_v16.7.html::buildLiveBpOverlay: 01bf2c87eb2c
  artifact_v16.7.html::_pkaIngest: 2aee2f643995
  artifact_v16.7.html::parseStored: e11224289247
  artifact_v16.7.html::parseInput: 0cf591df7502
  artifact_v16.7.html::calc: 39918cbe26ac
  artifact_v16.7.html::curMonthForecast: 675d0c6eb302
  artifact_v16.7.html::skuSales: 76fe21bc3add
  artifact_v16.7.html::skuHasLY: 256651173359
  artifact_v16.7.html::skuOvSet: 9f3bd3d13567
  artifact_v16.7.html::skuCommitOv: 6e045bf21538
  artifact_v16.7.html::buildSkuShares: e66b486c61e2
  artifact_v16.7.html::contribResolve: 482025c09b56
  artifact_v16.7.html::tierMix: c2167e52701b
  artifact_v16.7.html::skuHasAnyActivity: e319e553da16
  artifact_v16.7.html::filteredSkus: 77e32b0b2afc
  artifact_v16.7.html::insertInlineSkuRows: ea778ffcfec8
  artifact_v16.7.html::subcatSkuEffTotals: 86ce56a71691
  artifact_v16.7.html::skuMonthlyMap: ae7c95a355f4
  artifact_v16.7.html::renderSkuView: caf284ab5888
  artifact_v16.7.html::buildPlanDownload: 82eb84ca27c4
  artifact_v16.7.html::runoffAlloc: 968439298ea7
  artifact_v16.7.html::runoffPoolSkus: 7400d4db134d
  artifact_v16.7.html::runoffChannels: eae41f431df5
  artifact_v16.7.html::setDemandRaw: fe1e321b3a68
  artifact_v16.7.html::setBuildCap: a900b8ffed6a
  artifact_v16.7.html::_setSize: 7fd09e01e64c
  artifact_v16.7.html::discCutoffMo: 5e942f8dd917
  artifact_v16.7.html::buildLiveDemand: fcbc97070915
  artifact_v16.7.html::_hzBuildDemandCore: de531209af79
  artifact_v16.7.html::_hzDemandGen: 625a066042de
  artifact_v16.7.html::hzDemandBuildAsync: ae8d121bb869
  artifact_v16.7.html::_hzDbRun: 757b1925b060
  artifact_v16.7.html::hzDemandScope: 910b3f7073b6
  artifact_v16.7.html::computeSmoothAlloc: c256121c798f
  artifact_v16.7.html::applySmoothAlloc: 69c70cde748f
  artifact_v16.7.html::runAutoSmooth: 2cb92b470471
  artifact_v16.7.html::smoothCatsToPct: b41c603e6869
  artifact_v16.7.html::afBuildBuyFeed: c50b84a11dfd
  artifact_v16.7.html::expAct: 3b1b0b1094fb
  artifact_v16.7.html::expFc: 205f57f423ee
  artifact_v16.7.html::subcatLySplit: 22be9ef7c913
  artifact_v16.7.html::periodTotX: 44a506e6fd9a
  artifact_v16.7.html::getASPraw: e5bb6bcda062
  artifact_v16.7.html::getASP: c70881d04bde
  artifact_v16.7.html::priceUpliftFactor: f95d1b427cac
  artifact_v16.7.html::aspAdjFactor: 719869ba1e05
  artifact_v16.7.html::buildBody: 15c2678ac13e
  artifact_v16.7.html::_makeCatTotRow: 5d3d82f1593e
  artifact_v16.7.html::renderKeyAccountsView: 436578739eeb
  artifact_v16.7.html::kafPkaRefresh: 49573b9de89e
  artifact_v16.7.html::loadPreorderKA: 8ba07ccbbabc
  server.mjs::/api/supply/ka-forecast-cells: 18e14684afe2
  server.mjs::/api/supply/ka-forecast-cell: 0207a9f0b2a5
  server.mjs::kaCellQty: 1946ebc733a7
verified_version: v28.220
---
## Planning scope (which SKUs are planned)
- A SKU is in the plan when `planner.products.in_planning_scope` is true. The database sets it: variant type is MASTER or SET, AND status is ACTIVE, LAST SEASON or PHASE OUT, AND at least one `available_<market>_<channel>` flag is true. CLOSED products are out. Launch and discontinue dates are NOT part of the scope test. (source: set_in_planning_scope)
- Per market and channel, a SKU is planned only where its availability string has that channel: d = DTC, f = FBA, b = B2B, t = TikTok, z = Zalando. The server builds this from `available_no_disc`, which ignores the discontinue date, so discontinued SKUs with stock stay in the plan to run off. (source: buildSKURAW, buildDATA)
- If a SKU arrives with no availability at all, a fallback grants UK/US/EU = DTC+FBA+B2B and AU = DTC+FBA for countries not already discontinued; CA is never auto-granted. Last-year-only SKUs never get this fallback. (source: augmentSKUM)
- TikTok availability is added automatically wherever DTC is available in a TikTok market (UK and US today). Zalando availability (EU) is added for SKUs in the Zalando scope (stock upload plus SKUs with a Zalando forecast). (source: tikInit, zalInit)
- Launch and discontinue dates come from `planner.products` per country: UK `launch_date_uk_final` else `launch_date_uk`, disc `discontinue_date_final`; US `launch_date_us`, disc `discontinue_date_final`; EU `launch_date_eu`, disc `discontinue_date_final`; AU `launch_date_au_final` else `launch_date_au`, disc `discontinue_date_au_final`; CA `launch_date_ca_retail`, disc `discontinue_date_ca`. (source: buildSKURAW)
- Pre-launch zeroing: a month is forecast 0 when the 1st of that month is before the launch date. So the launch month itself is 0 unless the launch date is the 1st (launch 10-Nov-26 means Nov-26 is 0 and Dec-26 is the first forecast month). (source: buildLiveDemand, insertInlineSkuRows)
- CLOSED / out-of-scope SKUs that sold in the last 36 months are loaded as "last-year-only" (lyo) rows: they show in their subcategory for history context only (when they sold in a displayed month), always forecast 0, never enter the buy plan, smoothing or run-off pools. (source: buildSKURAW, filteredSkus, buildLiveBpOverlay, insertInlineSkuRows)
- A discontinued SKU with no stock, no inbound and no positive saved forecast in that country is hidden from the plan permanently (it can never sell). (source: skuHasAnyActivity, filteredSkus)
- SET SKUs are planned in DEMAND but never get their own buy line; their demand explodes into components. (source: buildLiveBpOverlay)

## Actuals and the current month
- Subcategory actuals come from `planner.category_sales_summary` (a view over `planner.sales_actuals`); SKU actuals come from `planner.sales_actuals` keyed SKU, country, channel. Sales arrive daily via n8n but lag (manual Cin7 load). (source: buildDATA, buildSKURAW)
- CUR_MONTH = the latest YYYY_MM that has non-zero units in the subcategory data, capped at today's calendar month. It is driven by data, not the clock, so if sales lag it can be behind the calendar. (source: hzInitCurMonth)
- CUR_YTD_END = the month before CUR_MONTH = the last COMPLETE month. CUR_MONTH itself is treated as partial. (source: hzInitCurMonth)
- Any month up to and including CUR_MONTH is an "actual" month: the subcategory row shows the recorded units (for CUR_MONTH that is month-to-date). Later months are forecast. (source: calc, isActualMonth)
- For totals (FY, half, quarter, category, grand total) the current month uses its FULL-month forecast, not the month-to-date actual. The full-month forecast = last year same month actual x (1 + growth), or a typed absolute. (source: curMonthForecast, periodTotX)
- SKU history: a SKU with a replacement SKU set (`replacement_sku`) inherits its predecessor's sales; its own sales win month by month. (source: skuSales)

## Subcategory forecast (calc)
- Inputs are stored per subcategory x country x channel x month in `planner.forecast_inputs` (value_raw). Typed value meaning: a number >= 4 is absolute units; a number < 4 is growth (0.25 = +25%); "25%" is growth; an apostrophe prefix ('2) forces absolute units. Small absolute values are saved with a .0001 marker so they reload as absolutes. (source: parseInput, parseStored, buildFC_CURRENT)
- A row-level growth % applies to every forecast month that has no own entry. Priority per month: month entry, then row growth, then flat (base x 1). Results round to whole units and floor at 0. (source: calc)
- Base by year, relative to CUR_MONTH's calendar year (call it CY):
  - Months in CY after CUR_MONTH: base = last year's actual for the same month.
  - Months in CY+1: base = CY's value for that month (its actual if complete, its forecast if future; if it is CUR_MONTH, the full-month forecast).
  - Months in CY+2 and later: base = the prior year's forecast for that month (forecast on forecast). (source: calc)
- Zalando (ZAL) forecast months are absolute manual entries only (no last-year base, no growth). (source: calc)
- calc covers FM_CALC: Jan-2026 to Feb-2029 (Jan/Feb 2029 are calculation-only so FY28/29 is complete). It extends itself month by month to the next February if the 18-month buy window runs past it. (source: hzInitCurMonth)

## SKU forecast (the cascade)
- Each SKU x month forecast follows this precedence (DEMAND plan inline rows and the buy feed agree):
  1. Saved SKU override (FC_OUTPUTS, stored in `planner.forecast_outputs`) wins.
  2. Continuing SKU (any sales in the trailing 12 complete months): the CHAINED last-year rule. Same month last year: if that month is complete (<= CUR_YTD_END) use its ACTUAL; otherwise use that month's FORECAST computed earlier in the same pass.
  3. New SKU (no such history): subcategory forecast x the SKU's share. (source: insertInlineSkuRows, buildLiveDemand, skuHasLY)
- Then: pre-launch months are 0; post-discontinue months come from the run-off allocator (see below). (source: insertInlineSkuRows, buildLiveDemand)
- Consequence: a continuing SKU without an override does NOT move when you edit its subcategory forecast. Only new SKUs (subcat x share) and run-off/set effects move. (source: insertInlineSkuRows, buildLiveDemand)
- Typing in a SKU cell saves an absolute override. "+X%" or "X%" is converted to units against the cell's last-year figure at entry. Clearing it falls back to the cascade. (source: skuCommitOv, skuOvSet)
- If data lags the calendar (CUR_MONTH earlier than the window start), the gap months are computed only to feed the chain (so next year's same month is not 0); they are not written to demand and draw no run-off stock. (source: buildLiveDemand)

- Rebuild timing (implementation only, numbers identical): the demand overlay is fully rebuilt on load, data refresh and any config change (contribution model, tier weights, months, scope); a forecast edit (subcategory cell, row growth, SKU override, smoothing, Zalando/TikTok cell, Preorder/KA change, undo) rebuilds only the edited SKUs x country plus every SKU linked to them through a set BOM, and reuses the rest. Any doubt falls back to a full rebuild. (source: buildLiveDemand, hzDemandScope, _hzBuildDemandCore)
- Where builds run (implementation only, numbers identical, v28.178): a FULL rebuild at load, SKU-data landing, data refresh, prewarm and cold DEMAND / BUY & MOVE / REPORTS / Auto Forecast entry runs off the main thread in a Web Worker (same engine code, copied inputs), or chunked on the main thread when the worker is unavailable or fails (a health event is logged). The result is published in one step only when complete; if any input changed during the build, then either only the changed slices are rebuilt on top of it (v28.181, when the change is one an edit build can scope, e.g. the Preorder / Key-Account map landing mid-build) or it is discarded and rebuilt. Edit (incremental) builds and other synchronous callers still run on the main thread; a synchronous build cancels an in-flight async one. Async results match the synchronous build exactly (?buildcheck=1 verifies). (source: hzDemandBuildAsync, _hzDbRun, _hzDemandGen, buildLiveDemand)

## SKU shares (buildSkuShares)
- Share pool = every SKU in the subcategory available for that country/channel. The inline plan rows additionally drop discontinued SKUs with no stock, inbound or saved forecast; the buy feed does not. On the inline rows the pool is NOT narrowed by tier/status pills or search. (source: insertInlineSkuRows, buildLiveDemand)
- Weight per SKU = its units over the 12 months of the calendar year before CUR_MONTH's year (hzLyMonths, Jan..Dec 2025 while CUR_MONTH is in 2026). If that is 0, the last 3 calendar months (two previous plus the current partial month) x 4. (source: buildSkuShares, hzLyMonths)
- A master SKU with neither: placeholder = (average annualised weight of SKUs in its tier, else the overall average, else 1) x tier weight / 2. Tier weights default A=3, B=2, C=1. (source: buildSkuShares)
- A brand-new set with no history gets a placeholder only when a Sets % is configured: pool = (Sets% / (1 - Sets%)) x masters' total, split evenly across new sets and divided by the set's size. Sets % default 0 means a new set gets 0. (source: buildSkuShares)
- Share = weight / sum of weights (equal split if all are 0). If Sets % > 0: active sets are rescaled to Sets% of the subcategory and masters to the rest; discontinued sets get 0; with no active set the masters take 100%. (source: buildSkuShares)
- Sets % and tier mix are read from the Contribution model (CONFIG), most specific first: country|channel, *|channel, country|*, *|*. Tier mix default 50/25/25. (source: contribResolve, tierMix)

## Smoothing, Auto-smooth, Smooth-to-%
- Smooth makes the SKU sum for a month equal the subcategory forecast and WRITES the result as saved SKU overrides (source "smoothed"). (source: computeSmoothAlloc, applySmoothAlloc)
- Target = subcategory forecast for the month (full-month forecast for CUR_MONTH). Each SKU starts from its override, else target x share. Pre-launch SKUs are frozen at 0. Discontinued SKUs are capped by what the shared run-off pool can still give that channel; with "Disregard discontinued" on they are left untouched and active SKUs carry the full target. (source: computeSmoothAlloc)
- Do-not-smooth locked cells keep their value and are subtracted from the target. A set is capped at floor(largest A-tier master's units / set size) boxes; excess flows to masters. November: a discontinued SKU with stock is weighted at last November's actuals x 1.5. (source: computeSmoothAlloc)
- Allocation is a capped proportional water-fill; "Leader" mode adds floors = 80% x the SKU's share of its tier's last-3-complete-month sales x the tier target. Rounding remainder goes to the largest uncapped SKU. In subcategories with sets the fill runs in exploded units and sets are rounded to whole boxes without exceeding the target. (source: computeSmoothAlloc)
- If every SKU is discontinued or pre-launch with Disregard on, it falls back to smoothing across run-off SKUs that still have stock. (source: computeSmoothAlloc)
- Auto-smooth runs over ticked subcategories (never inactive, run-off or "Non Core"), forecast months only, and smooths a month when the gap |SKU sum - target| / target is under the threshold (default 20%), or always when the SKU sum is 0. Bigger gaps are listed for manual review. Nothing is committed until you Apply in the review popup. (source: runAutoSmooth)
- Smooth-to-%: converts typed ABSOLUTE subcategory inputs for the current country/channel over the 11 months from CUR_MONTH into growth vs last year's actual (rounded to 0.1%), only where growth <= 200% and a last-year actual exists. (source: smoothCatsToPct)

## Sets (build-on-fly)
- Set size = total component units in the BOM (sum of qty in `planner.set_bom`); 1 if no BOM. (source: _setSize)
- A set's stored forecast (override or cascade) is item-equivalent (exploded). The buy explosion divides by set size to get boxes, then multiplies by each component qty and adds the result to the component's DTC (3PL) demand. Only DTC and FBA set demand explodes. (source: buildLiveDemand)
- Continuing sets use the chained last-year rule on their own sales, which are boxes. (source: buildLiveDemand)
- Current-month netting: the set's month-to-date actuals (DTC+FBA) are subtracted from the current month before exploding. (source: buildLiveDemand)
- Prepack netting: on-hand of mapped prepack (PP-) SKUs in that country covers set demand month by month from the start of the window; only the uncovered remainder explodes onto components. (source: buildLiveDemand)
- If a component is discontinued, set demand competes for that component's run-off pool, and the set can only sell what its run-off components can still build. (source: runoffAlloc, setBuildCap)
- A component not planned in that market cannot receive explosion and is reported as a skip. (source: buildLiveDemand)

## Discontinued run-off
- In the DEMAND engine a month is post-discontinue when the 1st of the month is AFTER the discontinue date. The month containing the discontinue date is a normal forecast month. (source: runoffAlloc, insertInlineSkuRows)
- Post-discontinue months are capped by one shared country stock pool (runoffAlloc): 3PL pool = 3PL on-hand + non-GRS + 3PL inbound, serving DTC, B2B, TikTok, and FBA once FBA's own pool is used; FBA pool = FBA on-hand (+ US AWD) + FBA inbound, FBA only. (source: runoffAlloc, runoffChannels)
- Stock is drawn from CUR_MONTH onward. Months before the discontinue date also draw it down (uncapped). When demand exceeds what is left it is shared pro rata (largest remainders get the leftover units). A leftover tail of 100 units or fewer rolls into the month after the last selling month (3PL tail to DTC, FBA tail to FBA). (source: runoffAlloc)
- Each channel's raw demand inside the allocator uses the same precedence (override, chained last year, subcat x share). The share pool for run-off is data-only (subcategory + availability + activity); screen filters and searches do not change it. (source: runoffAlloc, runoffPoolSkus)
- The BUY engine applies its own cut-off: a disc date after the 15th rounds to the 1st of the next month; on or before the 15th rounds to the 1st of that month. Buy-side demand is zeroed from that cut-off, so run-off SKUs do not buy. (source: discCutoffMo)

## Preorder, Key Account, TikTok, Zalando
- Preorder and Key-Account quantities are folded into B2B demand only for months inside the 18-month window. Past-dated months are past forecasts: ignored, never rolled forward. A record with no date lands in the window's first month. (source: buildLiveDemand, _pkaIngest)
- DEMAND ▸ Key Accounts Forecast grid (v28.182): one cell = client x SKU x warehouse (UK / US / EU 3PL pill) x month. Saving a cell deletes every row for that client / SKU / warehouse inside the month and inserts one row dated the 1st with the new quantity; blank or 0 clears the month. Quantities must be whole numbers of 0 or more (thousands separators are stripped); anything else is rejected and not saved. (source: renderKeyAccountsView, /api/supply/ka-forecast-cell, /api/supply/ka-forecast-cells, kaCellQty)
- The grid works like a spreadsheet: click, drag, Shift+click and Ctrl/Cmd+click select cells (client header rows are skipped, so a block can span clients); the status bar shows Selected, Sum, Count (non-blank) and Avg of the selection. Arrows / Tab move, Enter / F2 / a digit edits, Delete clears the selection, Ctrl/Cmd+C copies it as tab-separated rows, Ctrl/Cmd+V pastes a block from Excel / Sheets starting at the active cell (one value pasted into a multi-cell selection fills it), Ctrl/Cmd+Z undoes the last change (up to 50 steps). Pasted cells that are not numbers, or fall outside the shown rows / months, are skipped and counted in a message. Past (tinted) months stay editable as before. (source: renderKeyAccountsView)
- A typed single cell saves through /api/supply/ka-forecast-cell; a paste, fill, clear or undo saves in ONE request to /api/supply/ka-forecast-cells, which applies the same per-cell rule in batches of 200 cells (one database statement per batch). Each cell is checked on its own: a rejected or failed cell is reported and put back on screen, the others still save. The import panel and the column / SKU clear buttons use the same bulk endpoint. (source: /api/supply/ka-forecast-cells, renderKeyAccountsView)
- After any Key Accounts save the app re-reads the Preorder / KA quantities and marks demand stale, so the buy plan includes the change the next time it is shown (only the changed SKUs are rebuilt). Before v28.182 a Key Accounts edit only reached the buy plan after a reload or BUY ▸ Refresh cache. (source: kafPkaRefresh, loadPreorderKA)
- TikTok is forecast as its own channel (UK, US) then folded into DTC demand (same 3PL pool); a display copy is kept for the buy popup. (source: buildLiveDemand)
- Zalando (EU) adds EU 3PL demand only when a Zalando stock file has been uploaded: override, else subcategory forecast x share; no last-year chain and no launch/discontinue gating. (source: buildLiveDemand)

## Window, years and trends
- LIVE_FC_MONTHS = 18 months starting at today's CALENDAR month (month 0 = this calendar month). The buy feed is written for these months only. (source: buildLiveDemand)
- Fiscal year = March to February. fyLabel shows "FY26/27"; hzFyName names it by the year it ends ("FY27" = Mar-26 to Feb-27). (source: fyMonths, fyLabel, hzFyName)
- "Last year" months for shares = the calendar year before CUR_MONTH's year; rolls automatically in January. (source: hzLyMonths)
- 1-month trend = the last complete month (CUR_YTD_END) vs the same month last year. 3-month trend = the 3 complete months ending there vs the same 3 months a year earlier. (source: hzTrendSums)

## ASP and revenue
- Actual months use their own ASP (revenue / units). Future months use the same calendar month's ASP from the most recent prior year that has sales, x compounded logged price changes, capped at 1.2x the retail-derived ASP. No history at all: last actual month's ASP, then retail list ASP ex-tax (UK/EU /1.2, AU /1.1) x 0.95 (B2B x 0.5). (source: getASPraw, priceUpliftFactor)
- Future months are then reduced by the ASP reduction % and by the discontinued discount % x the share of that month's units from discontinued SKUs (Config ▸ More settings). Revenue only; the buy plan never reads ASP. (source: getASP, aspAdjFactor)
- The discontinued share is memoised per country|channel|sub-category (ASPADJ_MEMO). It is refreshed for the edited sub-category on a cell edit (refreshRow), fully on an ASP settings save and on a data reload, but NOT on every render (v28.215, matches prod v28.150.2). After a bulk forecast change (auto-smooth apply, undo, cell sheet) a sub-category with discontinued SKUs can show the previous discontinued share until the next reload. (source: aspDiscShare, _memoDropSubcat)

## Display basis and totals
- Subcategory, category, grand-total and FY/half/quarter figures show EXPLODED units: masters + set boxes x BOM size. Forecast months scale the most recent same-month actual's set uplift (up to 3 years back) by forecast / that actual. SKU rows are not exploded. (source: expAct, expFc, subcatLySplit, periodTotX)
- Category and grand-total rows sum the SUBCATEGORY forecasts (calc), not SKU rows. SKU pills (tier, status, core/seasonal, search, filter rules, sets show/hide) only hide rows; they never change category or subcategory totals. (source: buildBody, _makeCatTotRow, filteredSkus)
- "Shown SKUs (N of M)" line (v28.165): a read-only line under each subcategory total, and under the category total when category totals are on, shown only while a tier, core/seasonal, status (other than the default Active window), release window, from-replacement or filter-rule filter is active. It sums only the SKUs those filters leave visible: actual months = SKU sales, forecast months = the same per-SKU forecast the SKU subtotal uses, sets in exploded units. M = every SKU the real total covers. It cannot be edited and Smooth, forecast edits and the buy plan never use it. (source: subcatSkuEffTotals, buildBody, insertInlineSkuRows)
- "Search overrides filters" tick box (v28.165), saved per screen. Ticked (default on the DEMAND plan) = search matches across all SKUs and ignores every other filter, including the Category selection. Unticked = search narrows within all filters including the category; an empty result shows "N matches hidden by filters". The same box exists on the PO grid and Shipments (default ticked) and Order plan (default unticked). (source: filteredSkus)
- The SKU subtotal and "gap vs subcat" line covers ALL SKUs in the subcategory regardless of row filters. For non-overridden SKUs it uses subcat x share, not the chained last-year rule, so it can differ from the sum of the visible rows. (source: subcatSkuEffTotals)
- Views that can disagree with the inline plan rows: the separate SKU view computes shares over the FILTERED SKU list and does not apply the chained last-year rule. The old filtered download (buildPlanDownload) is no longer reachable; since v28.217 the download builder uses the whole sub-category share pool like the grid. (source: renderSkuView, buildPlanDownload, skuMonthlyMap, _pdxBuild)
- Filter Rules only filter which SKU rows show; they do not change numbers. Exceptions / Actions, the forecast import and anomaly fixes change numbers only when you apply a value, which becomes a saved SKU override. (source: filteredSkus, skuOvSet)

## Auto Forecast (SUPPLY ▸ Payments)
- Auto Forecast does not write forecasts. It reads the buy plan's per-SKU buys (3PL + FBA, excluding the actuals slot), aggregates them to subcategory x market x arrival month, and the server phases them into cash. Optional "future-SKU gap" = max(0, subcategory forecast - known SKU forecasts). (source: afBuildBuyFeed, computeAutoForecastFromFeed)
- Forward-only: an order whose placement month is already past is skipped and shown as overdue, not phased into near-term cash. (source: computeAutoForecastFromFeed)

## Common questions
**Q:** Why did my category total not change when I filtered by tier?
**A:** Category and grand totals add up the subcategory forecasts, not SKU rows. Tier, status, core/seasonal, search and filter-rule pills only hide SKU rows. The subtotal/gap line under a subcategory also covers all SKUs. To see the total of just the filtered SKUs, read the "Shown SKUs (N of M)" line under the subcategory or category total.

**Q:** Why does my search show SKUs from other categories?
**A:** The "Search overrides filters" box is ticked (the default on the DEMAND plan), so search ignores every other filter including the category. Untick it to search only inside the current filters.

**Q:** Why is this new SKU's forecast zero before launch?
**A:** Any month whose 1st falls before the SKU's launch date for that country is forced to 0, including the launch month unless launch is on the 1st. Its share of the subcategory is still reserved, so the SKU sum sits below the subcategory until you smooth (smoothing freezes pre-launch SKUs at 0 and gives the volume to others). If the launch date is blank, the SKU is treated as already live.

**Q:** Why does a discontinued SKU show demand after its discontinue date?
**A:** Discontinued SKUs with stock stay in the plan to sell down. After the discontinue month, demand is capped by the shared country stock pool (3PL + non-GRS + inbound, plus FBA stock for FBA) and goes to 0 once it runs out; a tail of 100 units or fewer is added to the next month. The month containing the discontinue date is still a full forecast month. The buy plan uses its own 15th-of-month cut-off and does not buy for run-off.

**Q:** Why did forecast X change after I edited subcategory Y?
**A:** Only SKUs without an override and without last-year history (new SKUs) follow subcategory x share, so an edit moves them. It can also move other numbers through: sets in Y exploding onto components in other subcategories; run-off pools shared with sets; and the next year's months, which chain off this year's forecast. Continuing SKUs and overridden cells do not move.

**Q:** Why is the current month's figure different on the subcategory row and in the FY total?
**A:** The row shows month-to-date actuals (the month is partial). Totals use the full-month forecast for the current month.

**Q:** Why does a Sept-27 continuing SKU have a forecast when Sept-26 actuals are not in yet?
**A:** When sales data lags the calendar, the missing month is computed from last year's chain purely to feed next year; it is not added to this year's demand.

**Q:** Why does a set show more units than its sales?
**A:** Set forecasts and roll-ups are in item-equivalents (boxes x pieces per set). Set sales history is recorded in boxes.

**Q:** Why do Preorder or Key Account orders from earlier months not appear?
**A:** Only months inside the 18-month window are folded into B2B. Past-dated months are treated as past forecasts and never roll forward.

## Cross Market view (DEMAND ▸ Cross Market view, v28.216)
- One category (or a SKU search) across every market x channel (UK/US DTC, FBA, B2B, TikTok; EU DTC, FBA, B2B, Zalando; AU DTC, FBA; CA left out) for a FROM-TO month range. Default range = the current fiscal year. (source: renderCrossMarketView, _cmvCompute)
- TY per SKU = own actual units for months up to the current month + the Plan grid's SKU forecast for later months: skuMonthlyMap on the whole sub-category share pool (activity + channel availability, not the screen filters), with SKU overrides on top. Sets show in boxes (forecast / set size). Actual months use the SKU's own sales (no replacement-SKU inheritance) so a replacement and its predecessor are not double counted. (source: _cmvCompute, skuMonthlyMap, _skuSalesRaw)
- LY = actual units for the same months a year earlier, summed over the SKUs in view; a SKU filter therefore shows only those SKUs' LY. (source: _cmvCompute)
- Active vs discontinued: discontinued = last-year-only SKU, no available country, or every available country's discontinue date is in the past. (source: _cmvDisc)
- Sub-category forecast rows = the Plan's sub-category forecast (calc().fu) for forecast months and sub-category actuals for past months, with a gap row (sub-category minus its active SKUs). (source: _cmvCompute, calc)
- Worksheet mode: drafts over SKU and sub-category range totals, never written until applied. "Move sub-category forecast with SKU changes" (default on) adds the SKU draft deltas to the sub-category draft, floored at 0. Applying a SKU line on its own freezes that amount as a pending sub-category draft, applied separately. (source: renderCrossMarketView, applyLines)
- Apply is month by month: each line is pre-filled with the change spread over the forecast months in the current forecast's shape (sub-category curve when the current forecast is 0); actual months are locked. SKU lines save as SKU forecast overrides (skuOvSet, x set size for sets); sub-category lines save as literal sub-category forecasts (IV "'n"); both log to the change record and persist via saveForecasts. (source: applyLines, _cmvSpread, skuOvSet)
- Saved worksheets are shared (planner.demand_worksheets, migration 338): anyone can open them; saving or deleting needs demand edit rights. (source: server.mjs :: /api/demand/worksheets)

## Plan download builder (DEMAND ▸ Plan ▸ Import / Export ▸ Download plan, v28.217)
- Choose markets, channels (only real market x channel combinations), categories, level (SKU or sub-category), FROM-TO months, measures (TY actuals, Forecast, LY actuals, TY combined), optional revenue, xlsx or csv. One row per item x market x channel x measure (x Units / Revenue), months across, optional Total. Not tied to the on-screen filters. (source: openPlanDownload, _pdxBuild)
- TY actuals fill months up to the current month (month to date); Forecast fills the current month onwards; LY actuals = same month a year earlier; TY combined = actuals then forecast, as the Plan. (source: _pdxBuild)
- SKU level uses the same per-SKU forecast as the Plan grid and the Cross Market view (skuMonthlyMap on the whole sub-category share pool + overrides; sets in boxes; own actuals only). Sub-category level = calc().fu and sub-category actuals, exploded by default like the Plan sub-category cells (toggle off for raw). (source: _pdxBuild, expAct, expFc)
- Revenue = units x the sub-category ASP (getASP); sub-category actual months use the actual sub-category revenue. (source: _pdxBuild, getASP)

## Plan grid column sort / filter (v28.218)
- Click any month, current-month, quarter, half or FY header in the Plan grid: Sort high to low, Sort low to high, or Hide rows with 0. Only one column is active; choosing another replaces it. Shown as a removable chip; Reset filters clears it. Display only. (source: openPlanColSortMenu, setPlanColSort)
- Value per column = actuals for past months and the forecast from the current month on (sub-category: calc().fu; SKU: the row's own forecast, skuMonthlyMap on the whole sub-category share pool + overrides). Sub-categories reorder within each category; SKUs reorder within each sub-category (masters still before sets). The SKU-level sort select (A-Z / volume / tier) still applies when no column sort is set. (source: _pcsSubVal, _pcsSkuVal, _pcsApplySubs, _pcsApplySkus)

## Plan grid YTD + To go totals (v28.219)
- Beside the current FY total the Plan grid shows **YTD** (complete months of the current FY, up to the last complete month) and **To go** (current month to the end of the FY). YTD + To go = the FY total. They use the same period-total cell as H1 / H2 / quarters (last-year units, total, growth %, revenue) on sub-category, SKU, category, grand-total and shown-SKU rows, and can be sorted or filtered like any column. On by default; Display settings ▸ "YTD + To go totals" turns them off (saved per browser). (source: buildTimeCols, setShowYtg, periodStackHTML)

## Plan grid Combined topline (v28.220)
- "⊕ Combine" beside the Channel pills turns the Country and Channel pills into multi-select. The grid becomes a read-only topline summed over every selected country x channel (real combinations only): grand total, category and sub-category rows, with the same columns as the Plan (months, quarters, halves, YTD / To go, FY totals). Category filter and run-off hiding still apply. Selection is remembered per browser. (source: setPlanAgg, planAggToggle, renderPlanTopline)
- Units only, exploded like the Plan sub-category cells: past months = actuals, current month on = forecast (current-month cell also shows month-to-date actuals); each cell shows last year, this year and growth %. Revenue is not summed (each market's revenue is in its own currency). Editing, SKU rows and smoothing stay in the normal single-market view. (source: renderPlanTopline, expAct, expFc)
