---
topic: buy-plan
title: Buy plan (BUY 3PL, Urgent, FBA, future buys, end-of-life cap)
covers: How the BUY grid sizes Buy 3PL / Buy 3PL Urgent / Buy FBA / future buys per SKU x market, and what each buy_plan_latest column means.
sources:
  - artifact_v16.7.html :: project
  - artifact_v16.7.html :: getBuyQtys
  - artifact_v16.7.html :: discCutoffMo
  - artifact_v16.7.html :: fwdDemand
  - artifact_v16.7.html :: crMatch
  - artifact_v16.7.html :: crCoverWeeks
  - artifact_v16.7.html :: ssmCoverWeeks
  - artifact_v16.7.html :: buildLiveBpOverlay
  - artifact_v16.7.html :: buildLiveDemand
  - artifact_v16.7.html :: _hzBuildDemandCore
  - artifact_v16.7.html :: _hzDemandGen
  - artifact_v16.7.html :: bpBuildFeedAsync
  - server.mjs :: buildPROD_CONST
  - server.mjs :: buildSKURAW
verified_version: v28.246
fingerprints:
  artifact_v16.7.html::project: cee6e7ab0a38
  artifact_v16.7.html::getBuyQtys: 9ec1b000ecae
  artifact_v16.7.html::discCutoffMo: 5e942f8dd917
  artifact_v16.7.html::fwdDemand: 508dc05213e1
  artifact_v16.7.html::crMatch: fe0ba7b5a7b2
  artifact_v16.7.html::crCoverWeeks: be8157079b03
  artifact_v16.7.html::ssmCoverWeeks: 29a4ae6c62ea
  artifact_v16.7.html::buildLiveBpOverlay: 01bf2c87eb2c
  artifact_v16.7.html::buildLiveDemand: fcbc97070915
  artifact_v16.7.html::_hzBuildDemandCore: de531209af79
  artifact_v16.7.html::_hzDemandGen: e2a62173559a
  artifact_v16.7.html::bpBuildFeedAsync: 92861a0bf15d
  server.mjs::buildPROD_CONST: b8b131b6ad8b
  server.mjs::buildSKURAW: 3fa61dca6e8a
---

# Buy plan rules

## Horizon and timing
- The engine projects each SKU x market month by month over 18 calendar months: the current month (actuals to date, then the "Remaining" part of this month) plus the next 17 months. [project]
- Current month "Remaining" demand = this month's forecast minus actuals to date, floored at 0, per channel. It is drawn from stock on hand; it is never bought for by Buy 3PL. [project]
- Each buy is sized for an ARRIVAL month and placed (ordered) back by the lead time: placement month = arrival month minus round(lead weeks / 4.33) months. [project]
- Lead weeks = products.china_to_<mkt>_lead_time_weeks, which is the TOTAL lead (production + shipping; e.g. 12 production + 9 shipping = 21). A plan-lead extra from BUY settings can be added. [buildPROD_CONST, project]
- If a buy's ideal placement month is already in the past, it is NOT a Buy 3PL: that need is left to the Urgent scan. So the earliest month a Buy 3PL placed now can land = current month + round(lead weeks / 4.33). [project]

## Demand the buy uses
- The demand overlay the buy reads may be built in a Web Worker or in chunks (v28.178); it is published only when complete and is identical to a synchronous build, so buy quantities do not depend on where it ran. The buy engine itself (project, getBuyQtys) still runs on the main thread. [buildLiveDemand, _hzDemandGen]
- Channels: DTC (TikTok folded into DTC), B2B, FBA; EU also Zalando when a Zalando stock file is uploaded. 3PL demand = DTC + B2B (+ Zalando); FBA demand is supplied from the 3PL by transfers, so the 3PL buy also funds the FBA top-up. [buildLiveDemand, project]
- Per SKU month: a saved SKU forecast (planner.forecast_outputs) wins; otherwise a continuing SKU uses last year's same-month actual (chained); otherwise a new SKU gets subcategory forecast x SKU share. [buildLiveDemand]
- Pre-launch months are zero (month start before the market launch date). [buildLiveDemand]
- Key-Account forecasts (planner.key_account_forecasts) are ADDED to B2B, for months inside the live forecast window only (past months are ignored). [buildLiveDemand]
- Preorders (planner.preorders) are added to B2B per SKU x market x month ONLY when the month's preorder quantity is at least 50% of that month's B2B forecast (the B2B demand before any preorder or key account is added; a B2B forecast of 0 means any preorder adds). A smaller preorder is taken to be inside the B2B forecast already and adds nothing. Window months only. The buy popup Preorder row shows every preorder amount (struck through and grey when not added); click or hover it for the orders and clients behind it and whether it is included in demand, with the B2B forecast it was compared to. (Ben 09-Oct-26, v28.243) [buildLiveDemand md.pre_used, buildTable Preorder row, _pkaIngest det]
- DEMAND > Inputs > Preorders > Demand impact (v28.244): one row per preorder SKU x market x month with preorder, B2B forecast, % of forecast and status: Added (counts in buy demand), Not added (under 50%), Outside window (month outside the forecast window), Not in buy plan (SKU or market not in the buy plan). Read from the built demand overlay (md.pre_used), so it matches the buy exactly; totals per market, status filter, CSV. [renderPreordersView impRows, drawImpact]
- Preorders come from Fulfil (v28.241): open sales order lines (order confirmed or processing) with a FUTURE shipping date, fulfilment Ship from stock, with quantity left to ship (quantity less shipped less cancelled) that is NOT yet assigned. Assigned is read from the customer shipment's pick (inventory) moves, whose origin is the line's outgoing move: their assigned or done quantity is stock already allocated and is taken off the line (v28.246; the line's own outgoing move stays draft until shipped, so it never shows the assignment). A fully assigned line is left out as 'Assigned in Fulfil'; a part-assigned line counts only the unassigned remainder (move state shows 'assigned n of m'). The Fulfil warehouse maps to the 3PL: UKILG = uk_3pl, USGENEVA_STD = us_3pl, EUIFUL = eu_3pl, AUCOGHLANS = au_3pl. Left out: drop ship and backorder lines (not fetched), China Port (China stock), any other warehouse, assigned lines, and every KEY ACCOUNT customer (any client in planner.key_account_forecasts, e.g. John Lewis, NEXT, whatever the month or 3PL: their key account forecast carries them). Included lines are summed per SKU x 3PL x ship date into planner.preorders (source 'fulfil'); the line detail is planner.preorder_lines, shown in DEMAND > Inputs > Preorders. Once a Fulfil sync has run (app_settings preorders_source = 'fulfil') the buy plan reads only the Fulfil rows; older Airtable rows stay in the table but are ignored. Sync: the page's Sync from Fulfil button (needs DEMAND edit rights; read-only users cannot run it), or the n8n cron: POST /api/cron/preorders-sync with header x-webhook-secret = N8N_WEBHOOK_SECRET, body {} (or {"dry_run": true} to preview without writing); 200 synced, 401 bad secret, 500 failed. Schedule daily 06:00 London; the local server also runs it daily. Every real run is logged to planner.etl_runs job preorders_fulfil. Each order on the page links to the order in Fulfil (same instance the sync reads); all table cells are left-aligned. Reads LIVE Fulfil (read only) when configured. A preorder SKU that is not in the buy plan (e.g. discontinued) adds nothing. [preordersBuild, preordersSync, preordersFilter, /api/preorders-ka, renderPreordersView]
- Sets never buy. A set's DTC + FBA forecast explodes onto its components' 3PL DTC demand (set forecast x component qty). [buildLiveDemand, buildLiveBpOverlay]

## Discontinue cutoff (end of life)
- Discontinue date per market: UK/US/EU = products.discontinue_date_final; AU = discontinue_date_au_final; CA = discontinue_date_ca. Launch: UK = launch_date_uk_final else launch_date_uk; US = launch_date_us; EU = launch_date_eu; AU = launch_date_au_final else launch_date_au; CA = launch_date_ca_retail. [buildSKURAW]
- Cutoff month: a discontinue date on or before the 15th cuts THAT month; after the 15th the disc month is still a full selling month and the cutoff is the NEXT month. Example: disc 2027-09-01 means September 2027 is cut, last sellable month is August 2027. [discCutoffMo]
- All buy-side demand at or after the cutoff month is treated as zero: no buy is ever sized for it, and no Buy 3PL may land at or after the cutoff. Forecast in those months is ignored by the buy (it is run-off of existing stock only). [project]
- End-of-life cap: for a SKU with a cutoff inside the horizon, each Buy 3PL is capped at (remaining sellable demand after the arrival month, 3PL + FBA + Zalando, cut at the cutoff) minus projected closing 3PL stock, rounded DOWN to whole cartons. Perpetual SKUs (no disc date in the horizon) are not capped. [project]

## Buy 3PL sizing (per arrival month)
- Target = forward demand over the target cover weeks, starting WITH the arrival month (3PL demand, cut at the cutoff), plus the FBA top-up need (FBA forward target minus FBA closing), plus 2 months of Zalando cover (EU). [project, fwdDemand]
- Available = projected closing 3PL stock + the part of the arrival month's demand the cover window spans (opening-balance basis), plus confirmed inbound landing later inside the cover window. Gap = target minus available. [project]
- A buy is raised only when the gap is at least one carton (or a genuine stockout with no inbound), there is demand next month, and the month is before the cutoff. [project]
- Quantity = gap rounded UP to whole cartons (ceil(gap / carton) x carton), then the end-of-life cap (rounded DOWN to cartons) if the SKU discontinues. Every buy is therefore a whole number of cartons. [project]
- Carton = products.case_pack_size, else products.carton_qty (1 if both blank). [buildPROD_CONST]
- So carton rounding changes a single buy by less than one carton. A difference between buy and forecast larger than that is not rounding; look at stock, inbound, cover target and the discontinue cutoff. [project]
- MOQ is NOT applied per market. It is a per-production minimum checked across markets when building production. [project]
- A planned buy is carried forward as stock, so later months do not re-buy the same gap. [project]

## Target cover weeks
- Base = products.target_cover_weeks_<mkt>_3pl (first number in the cell; server default 4). A-tier SKUs get the BUY setting "3PL A-tier extra" added (cover-weeks mode only). [buildPROD_CONST, project]
- SSM (safety stock model): when SSM is switched on for that market x pool (app_settings ssm_enabled, e.g. "UK|3PL"), the safety-stock-derived cover (service level, demand and lead-time variability; seasonal SKUs pre-buy the remaining season) REPLACES the products cover and the A-tier extra is not added. [project, ssmCoverWeeks]
- Complex Rules (BUY > Complex Rules, planner.buy_complex_rules): scoped by market list, SKU list, category, tier, season (release window), all optional and AND'd. Raise-only: highest cover wins, never lowers the base. [crMatch, crCoverWeeks]
  - cover_months: cover = months x 4.33 weeks inside the rule window.
  - range without a window: cover to the end of range_to, active from range_from.
  - range WITH a window: one up-front block buy placed in the first orderable month inside the window, sized to all DTC+B2B+FBA demand from range_from to range_to (or the SSM season end if later), plus SSM safety, minus on hand + inbound by then, rounded UP to cartons. [project]
  - launch_ramp: for ramp_months after launch, cover floor = SSM cover at an elevated service level (ramp_sl) decaying to normal. [project]
- FBA cover weeks (v28.168) = SSM FBA cover when SSM is opted in for that market's FBA pool and computes a positive cover (capped at 8 by default), else the Buy Plan Settings "FBA target" box (default 8; last value off the BUY page). products.target_cover_weeks_<mkt>_fba is no longer used by the engine. The same value sizes the FBA buy target inside Buy 3PL and the 3PL to FBA transfers. [project, fbaCoverWks]

## Inbound and stock
- Stock on hand = v_product_inventory.available for <mkt>_3pl and <mkt>_fba (can be negative). [buildSKURAW]
- On-order = open inbound shipments (quantity minus received) plus open POs not yet in the inbound feed (not complete, not child POs). All of it is treated as arriving: "on-order = shipped". [buildSKURAW, buildLiveBpOverlay]
- Arrival month = shipment ETA if in the future; else the PO-grid landing date if in the future; else this month. Unshipped POs land at the calculated landing (production end + 7 days + branch sea transit). [project]
- An open line with no ETA and no landing date is NOT counted in the projection (it still shows in on_order), so it does not reduce the buy. [project]

## Buy 3PL Urgent
- Scans only the next 3 forward months. Fires when projected 3PL closing cover drops below 2 weeks. [project]
- A rush lands no sooner than today + 5 weeks; shortfalls before that are lost sales and not bought for. It sums monthly shortfalls from the rush arrival until a scheduled Buy 3PL lands. [project]
- Never rush-buys the discontinue month or later (calendar month of the disc date). [project]
- Total rounded UP to whole cartons, split into an AIR bridge (until a rush sea shipment could land) and SEA bulk; air + sea = the urgent total. Rush lead = supplier expedited production weeks (default 6) + branch air/sea transit. [project]

## BUY grid columns and planner.buy_plan_latest
The browser computes the plan and posts it (planner.buy_plan_snapshot, hourly while a BUY tab is open); buy_plan_latest is the newest snapshot, one row per SKU x market with any non-zero value. computed_at / app_version say when and by which version. [bpBuildFeedAsync]
- buy_3pl: Buy 3PL to ORDER NOW = buys whose placement month is the current month (plus next month when today is on/after the 20th). [getBuyQtys]
- buy_3pl_urgent: the Urgent total (air + sea). [getBuyQtys]
- future_qty: buys the engine has already SCHEDULED for LATER placement months. NOT inbound, NOT on order, NOT ordered yet. The grid flags them as "+Nf" next to Buy 3PL, where N is the NUMBER of later buys (the units are in its tooltip). [getBuyQtys]
- Total planned buy for the horizon = buy_3pl + buy_3pl_urgent + future_qty. [getBuyQtys]
- buy_fba: the FBA top-up SLICE of the Buy 3PL in the order-now window, shown for visibility; it is NOT an extra buy (do not add it to the total). Rounded up to cartons when over 1 carton, else 0 (taken as a transfer instead). [getBuyQtys, project]
- transfer: recommended 3PL to FBA transfer now (units). [getBuyQtys]
- soh_3pl / soh_fba: stock on hand now. [bpBuildFeedAsync]
- on_order: open inbound shipments + open POs not yet shipped, 3PL + FBA for that market. [bpBuildFeedAsync, buildSKURAW]
- inbound: always 0 in the current version (the feed reads a list as a number). Use on_order, or explain_buy's open inbound list, instead. [bpBuildFeedAsync]

## Common questions
Q: PICNIC-DES-LG-BRNCLB UK has 850u forecast but the buy shows 800u. Is it rounding down for cartons?
A: No. buy_3pl 672 + urgent 32 + future_qty 128 = 832 total. Disc date 2027-09-01 (on/before the 15th) cuts September 2027, so September's 50 is never bought. Buyable demand Feb to Aug = 25+100+150+200+150+100+100 = 825, rounded UP to 52 cartons of 16 = 832. "800" is 672 + 128 (urgent excluded). Carton rounding went up, not down; the gap is the end-of-life cutoff. No rule change needed unless the disc date is wrong.

Q: What is future_qty?
A: Buys the engine has scheduled for later placement months. They are planned, not ordered and not inbound.

Q: Why is the buy lower than the forecast?
A: Usually one or more of: stock on hand and on-order cover part of it; current month and months before the earliest standard arrival are served by stock (or Urgent); demand at/after the discontinue cutoff is never bought; the end-of-life cap. Show the arithmetic from explain_buy.

## Size split feeds buy demand (v28.221)
- The SKU master now carries the product size type (`sz`, products.size_short). When a Contribution model size split is set for a sub-category, the SKU shares that build each SKU's forecast (and therefore the buy plan's SKU demand) follow that size mix; with no split set, buy demand is unchanged. (source: server.mjs :: buildSKURAW, applySizeSplit)
