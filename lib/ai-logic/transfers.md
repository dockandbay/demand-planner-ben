---
topic: transfers
title: Transfers (3PL to FBA, 3PL to 3PL, Zalando)
covers: How HORIZON sizes 3PL to FBA transfers, how they interact with Buy 3PL / Buy FBA, the TRANSFER tab (3PL to 3PL Rebalance / Urgent), and Zalando sends.
sources:
  - artifact_v16.7.html :: fbaTransferRec
  - artifact_v16.7.html :: fbaTransferSized
  - artifact_v16.7.html :: fbaTransferNonGrs
  - artifact_v16.7.html :: fbaTransferEff
  - artifact_v16.7.html :: fbaResolveQty
  - artifact_v16.7.html :: fbaFwdDemand
  - artifact_v16.7.html :: webFwdDemand
  - artifact_v16.7.html :: nearTerm3plInbound
  - artifact_v16.7.html :: daysToNext3plReplen
  - artifact_v16.7.html :: awdOf
  - artifact_v16.7.html :: nonGrsOf
  - artifact_v16.7.html :: _fbaPendingOf
  - artifact_v16.7.html :: fbaTrfLoad
  - artifact_v16.7.html :: fbaInbSplit
  - artifact_v16.7.html :: project
  - artifact_v16.7.html :: getBuyQtys
  - artifact_v16.7.html :: trfLane
  - artifact_v16.7.html :: donorSpare
  - artifact_v16.7.html :: _zalRender
  - server.mjs :: buildPROD_CONST
  - server.mjs :: buildTRANSFER_LEADS
  - server.mjs :: buildZalStock
  - server.mjs :: /api/supply/fba-transfers/refresh
  - artifact_v16.7.html :: fbaCoverWks
  - artifact_v16.7.html :: fbaBoxWks
  - artifact_v16.7.html :: fbaSsmWks
  - artifact_v16.7.html :: fbaTrfBoot
  - artifact_v16.7.html :: bpExtraStockBoot
  - server.mjs :: refreshFbaInflight
  - server.mjs :: runFbaInflightCron
  - server.mjs :: fbaInflightExcludedCodes
  - server.mjs :: /api/supply/fba-transfers/list
  - server.mjs :: /api/cron/fba-inflight-refresh
fingerprints:
  artifact_v16.7.html::fbaTransferRec: e193d4279ab4
  artifact_v16.7.html::fbaTransferSized: d58f25df052b
  artifact_v16.7.html::fbaTransferNonGrs: ea083446f165
  artifact_v16.7.html::fbaTransferEff: 20e956620966
  artifact_v16.7.html::fbaResolveQty: 14ecb84bd2c9
  artifact_v16.7.html::fbaFwdDemand: 02d6a090e262
  artifact_v16.7.html::webFwdDemand: 69d14da89558
  artifact_v16.7.html::nearTerm3plInbound: eb6548acfb3d
  artifact_v16.7.html::daysToNext3plReplen: 0b5f8e87cd8f
  artifact_v16.7.html::awdOf: f072dda28079
  artifact_v16.7.html::nonGrsOf: 7a1b63f8cf8b
  artifact_v16.7.html::_fbaPendingOf: c7934ba681fa
  artifact_v16.7.html::fbaTrfLoad: 848d3b68a720
  artifact_v16.7.html::fbaInbSplit: 398d47e8849a
  artifact_v16.7.html::project: cee6e7ab0a38
  artifact_v16.7.html::getBuyQtys: 9ec1b000ecae
  artifact_v16.7.html::trfLane: 7e575818cea3
  artifact_v16.7.html::donorSpare: e2a4749a3379
  artifact_v16.7.html::_zalRender: 0a7669cdab6e
  server.mjs::buildPROD_CONST: b8b131b6ad8b
  server.mjs::buildTRANSFER_LEADS: 2c23341bb9a2
  server.mjs::buildZalStock: c704a06358cc
  server.mjs::/api/supply/fba-transfers/refresh: 5d5383070888
  artifact_v16.7.html::fbaCoverWks: 956940d76303
  artifact_v16.7.html::fbaBoxWks: 22746e12a8aa
  artifact_v16.7.html::fbaSsmWks: fd6b1e925671
  artifact_v16.7.html::fbaTrfBoot: 071baeea24ca
  artifact_v16.7.html::bpExtraStockBoot: 5cc1e43fd049
  server.mjs::refreshFbaInflight: d83cb659fda1
  server.mjs::runFbaInflightCron: d630dda7575f
  server.mjs::fbaInflightExcludedCodes: 7089bef268c5
  server.mjs::/api/supply/fba-transfers/list: d968d218b3ca
  server.mjs::/api/cron/fba-inflight-refresh: 7732e28433a0
verified_version: v28.168
---
## Where transfers live
- BUY & MOVE has three transfer views: **FBA** (3PL to Amazon FBA, per market), **TRANSFER** (3PL to 3PL between markets) and **Zalando** (send stock to Zalando, EU). (source: setView, renderZalando)
- 3PL to FBA transfers DO feed the buy maths (the "transfer now" figure). 3PL to 3PL transfers on the TRANSFER tab are display / report only and never change Buy 3PL, Urgent or Buy FBA. (source: project, trfLane)
- For how Buy 3PL itself is sized, see topic buy-plan.

## Transfer FBA: the recommended quantity now
- One function, `fbaTransferRec`, produces the "Transfer FBA" number on the FBA tab AND the "transfer now" (current month) that the buy plan draws off 3PL. Displayed = used. (source: fbaTransferRec, project)
- **FBA target**: forecast FBA demand over the next N full months, where N = max(1, round(FBA cover weeks / 4.33)). The current month is NOT included; it starts from next month. (source: fbaTransferSized, fbaFwdDemand)
- **FBA cover weeks** (v28.168, one value for the whole engine: transfer sizing, non-GRS transfer, project's FBA buy target and future transfers, the popup, Inventory Status): if SSM is opted in for that market's FBA pool (CONFIG SSM, key "MKT|FBA"), the SSM FBA cover wins for every SKU where SSM computes a positive cover (capped at SSM fbaCapWk, default 8). Otherwise the "FBA target" box in Buy Plan Settings (default 8, presets 4 / 8 / 12). Off the BUY page (box not on screen) the last box value is used (default 8). Products' per-SKU FBA cover (md.tf) is no longer used by the engine. The settings panel shows "SSM drives FBA cover in <mkt>" next to the box when SSM FBA is on. (source: fbaCoverWks, fbaBoxWks, fbaSsmWks, project)
- **FBA cover already held** = FBA on-hand + FBA on-order (open orders into FBA) + AWD on-hand (US only) + in-flight transfers not yet in the inbound feed. (source: fbaTransferSized, awdOf, _fbaPendingOf)
- **Shortfall** = target minus cover held, floored at 0. If 0, no transfer. (source: fbaTransferSized)
- The shortfall is then limited by a **cap** (below) and carton-rounded by the **Cartons pill** (below).

## Website protection cap (the hybrid guard)
- Applies to dual-channel SKUs (sold on DTC as well as FBA in that market). (source: fbaTransferRec)
- 3PL available = 3PL on-hand + 3PL inbound with a firm ETA later THIS month (day after today). (source: nearTerm3plInbound)
- Website reserve = next month's DTC + B2B forecast x reserve weeks / 4.33, rounded. Reserve weeks = 4 (TRF_MIN_3PL_WKS), shortened to the days until the next substantial 3PL inbound / 7 when one is due. "Substantial" = at least half of next month's DTC + B2B demand. (source: daysToNext3plReplen, webFwdDemand)
- Cap = the smaller of 50% of 3PL available (floored) and 3PL available minus the website reserve. Never below 0. (source: fbaTransferRec)
- **Amazon-only SKUs** (FBA available but DTC not available in that market) have no cap: all 3PL stock can transfer. (source: fbaTransferRec)
- A manual Override can exceed the cap. (source: fbaTransferEff)

## Cartons pills (Any / Full / Partial)
- Default is **Full** (FBA_CARTON_MODE = 'FULL'). The pills only show on the FBA tab under the Transfer FBA filters. (source: FBA_CARTON_MODE)
- Whole cartons = min(floor(capped need / carton qty), floor(next-90-day FBA demand / carton qty)). If next-90-day FBA demand is below 70% of one carton, whole cartons = 0. (source: fbaTransferSized)
- **Full**: send the whole-carton amount; sub-carton stragglers are 0.
- **Partial**: send only stragglers (raw shortfall, rounded to units) for SKUs that do NOT fill a whole carton; any SKU with at least one whole carton shows 0 here.
- **Any**: whole-carton amount if there is one, else the raw straggler amount.
- Full + Partial together equal Any exactly (v27.834: the old 20%-of-60-day floor and the empty-FBA seed were removed so the pills partition Any). The in-app "FBA Transfer Logic" help panel still mentions the 20% minimum; that line is out of date. (source: fbaTransferSized)
- Carton qty = products case pack (falls back to 1 if unknown). (source: buildPROD_CONST)
- The pill is a session setting. Because the buy plan calls the same function, switching the pill also changes the buy plan's transfer-now until reload. (source: fbaTransferRec, project)

## Non-GRS transfers (UK and US only)
- "Transfer FBA (non GRS)" pill uses `fbaTransferNonGrs`: same FBA target and cover-held maths, capped at the non-GRS 3PL pool, NO website cap and NO 90-day / 70% gates. Pure carton maths under the same Any / Full / Partial rules. Only SKUs with a non-zero non-GRS transfer are listed. (source: fbaTransferNonGrs)
- In the buy plan, FBA transfers draw the non-GRS pool down FIRST; only the excess reduces GRS "SOH 3PL". This lowers 3PL buying for SKUs holding non-GRS stock. The plan popup shows "SOH 3PL non-GRS (closing)" when the SKU has non-GRS stock. (source: project)
- Non-GRS and AWD quantities come from /api/buy-extra-stock (EXTRA_STOCK), loaded at startup (v28.168; was on the first BUY render, so buy numbers computed elsewhere first missed them). A failed load retries on the next buy render. Non-GRS is 0 outside UK/US; AWD is 0 outside US. (source: nonGrsOf, awdOf, bpExtraStockBoot)

## AWD (US)
- AWD on-hand counts as FBA cover in the transfer calc, so `need = target minus (FBA + FBA on-order + AWD + in-flight)`. AWD has its own "SOH AWD" column on the US FBA view. (source: fbaTransferSized)
- US-only pill "AWD · FBA <3wk" lists SKUs with AWD on-hand AND FBA (on-hand + on-order) under 3 weeks of cover, using average weekly FBA demand over the next 3 months (sum / 13). (source: render filter AWDLOW)

## In-flight transfers
- Source is **Fulfil only** (v28.168; Cin7 is decommissioned and its BranchTransfers pull was removed): every open Fulfil internal shipment (state waiting / assigned / packed / shipped) into an "Amazon FBA - XX" or AWD location, quantities from the incoming leg, de-duplicated by FBA shipment id or normalised reference. Not yet in the inbound feed = counted as FBA cover so it is not re-recommended. AWD-destination rows pool into that market's FBA cover. Any Cin7-sourced rows left in the table are ignored by the list and removed by the next refresh (full rebuild). (source: refreshFbaInflight, /api/supply/fba-transfers/list, _fbaPendingOf)
- **Excluded source warehouses**: a shipment whose SOURCE warehouse code (from_location.warehouse) is in app_settings 'inflight_excluded_warehouses' (JSON array, case-insensitive; default UKILG-OLD, OPTEST, ILGW, COUGH) is NOT FBA cover. AUCOGHLANS is never excluded. Excluded shipments are listed in the in-flight drawer's collapsed "Excluded" section (admins can edit the code list there; applies on the next refresh). Only in-flight 3PL to FBA/AWD transfers are filtered; inbound / PO receipts are not. (source: refreshFbaInflight, fbaInflightExcludedCodes, /api/supply/fba-transfers/list)
- Refresh rebuilds the table and prunes any transfer whose reference has landed in inbound_shipments or that has a received date. It runs daily (POST /api/cron/fba-inflight-refresh from n8n, logged to planner.etl_runs job 'fba_inflight_refresh'; the local server also runs it daily), on the FBA tab's refresh button, and automatically on an FBA tab visit if the last run is over 1 hour old (at most once per hour per page). (source: runFbaInflightCron, /api/supply/fba-transfers/refresh, _fbaTrfMaybeRefresh)
- In-flight data is loaded at STARTUP with the buy data (v28.168), so buy and transfer numbers do not depend on whether the FBA tab was opened. If it lands after a buy was built and changes the per-SKU totals, the buy cache is dropped and a visible buy grid re-renders once. A failed reload keeps the last good data. (source: fbaTrfBoot, fbaTrfLoad)

## Transfer in the buy plan
- **Transfer now (current month)**: `fbaTransferRec` is drawn off 3PL in the current-month "Remaining" step and lands in FBA after the transfer lead. getBuyQtys reports it as `tx`. (source: project, getBuyQtys)
- **Transfer lead**: products `transfer_3pl_to_fba_lead_time_weeks` (default 2). 2 weeks or less lands in the same month; otherwise round(weeks / 4.33) months later. (source: project, buildPROD_CONST)
- **Future months** (simulated, shown in the plan popup "FBA Transfer" row): triggered when FBA closing stock is below the FBA target over `tf` weeks of real FBA demand (continues past discontinue so stock sells down). Amount = the gap, raised to the minimum transfer units (products `fba_transfer_min_units_<mkt>`, default 2). It is then limited to the largest amount that keeps 3PL above 4 weeks of DTC + B2B cover in each of the next 3 months (threshold 100% / 85% / 70% of 4 weeks for months +1 / +2 / +3), plus any non-GRS pool. Below the minimum, 0. (source: project)
- The plan popup's current-month column shows the FBA Transfer row as blank and its SOH 3PL closing does not deduct the transfer-now; the buy maths (PASS 1) does deduct it. (source: project display pass)

## Buy FBA vs transfer split
- Buy FBA is NOT a separate purchase. It is the slice of Buy 3PL that funds future FBA cover which existing 3PL stock cannot transfer-cover; it stays inside Buy 3PL. See topic buy-plan. (source: project)
- Whole cartons: if the Buy FBA need is more than one carton, it is rounded UP to whole cartons. If it fits in a single carton or less, Buy FBA shows 0 and that top-up is left to a 3PL to FBA transfer. (source: getBuyQtys)

## FBA tab columns and actions
- Columns: SKU, Status, Type, Release Window, Launch, Disc, Carton qty, SOH 3PL, SOH NON GRS (UK/US), SOH FBA, SOH AWD (US), Ship tick, Transfer FBA, Override, FBA inbound <=14 days, FBA inbound 15+ days, 3PL Inbound. (source: render header)
- FBA inbound splits by effective ETA: a missing or past ETA is treated as today + 4 days. Includes in-flight transfers. Display only. (source: fbaInbSplit, _fbaEffEta)
- Override accepts shortcuts: `2c` = 2 x carton qty; `50r` = 50 rounded UP to the next full carton; plain numbers pass through. Overrides and ticks are session-only and do not change the buy plan. (source: fbaResolveQty, fbaTransferEff)
- Selected total = units and cartons (sum of qty / carton qty, rounded up) across ticked rows. FBA Transfer Upload and AWD Transfer Upload (US) download ticked rows with qty > 0. (source: fbaSelSummary, downloadFbaTransfer)

## TRANSFER tab (3PL to 3PL)
- Lanes and lead weeks come from `planner.transfer_lead_times` (CONFIG ▸ Branches). A lane with no entry is never recommended. (source: buildTRANSFER_LEADS, trfLane)
- Rates use NEXT month's DTC + B2B forecast / 4.33 per week. Recipient target units = recipient 3PL target weeks x weekly; need = target units minus recipient 3PL on-hand (inbound not counted). No recipient demand = no transfer. (source: trfLane)
- Donor spare = the lowest projected donor 3PL on-hand over ceil((donor target weeks + China lead weeks) / 4.33) forward months, crediting confirmed 3PL inbound against DTC + B2B demand (zero after discontinue), floored at 0. The help panel describes this as "without dropping below its own target"; the code floors at zero stock, not at target. (source: donorSpare)
- Qty = min(need, donor spare), rounded DOWN to whole cartons. (source: trfLane)
- **Urgent** (red) is tested first: recipient cover (on-hand / weekly) under lane weeks + 2, AND lane weeks <= cover (it can land in time). If it cannot land in time, nothing is shown; the gap falls to the buy plan's Urgent Air / Sea. (source: trfLane)
- **Rebalance** (blue): donor on-hand >= 1.30 x donor target units AND recipient on-hand below its target units. (source: trfLane)
- Pills All / Rebalance / Urgent; a SKU can appear under both. Download exports the full grid plus a Class column. (source: trfClassesOf, downloadViewCSV)
- The SKU plan popup also shows "send ~N units" flags when another market's cover is under the "Transfer flag under" weeks (default 6); these ignore lanes. (source: rpc)

## Zalando (EU)
- **Buy plan feed**: Zalando forecast net of the uploaded Zalando stock (stock drawn down against the earliest months) is extra demand on the EU 3PL. It drains 3PL and adds a 2-month forward Zalando cover to the 3PL buy target. EU only, never FBA, nothing after the discontinue cutoff. Gated: only active when a Zalando stock file exists. (source: project, buildZalStock)
- **Send-to-Zalando tab**: suggested send = Zalando forecast over the current month plus the next (cover - 1) months, minus uploaded Zalando stock, rounded, floored at 0, NO minimum and no carton rounding. Cover defaults to 2 months (toggle 1 to 6). Months after the SKU's EU discontinue month are excluded. (source: _zalRender)
- The tab hides the analysis if no stock file is uploaded or the upload is over 7 days old. The buy-plan feed does not apply the 7-day expiry. Download = ticked rows with an EAN, format EAN, Quantity. (source: _zalRender, buildZalStock)
- The tab's header text says the forecast is "hard-coded (baked)"; it is now read from forecast_outputs (channel ZAL). (source: /api/supply/zalando/data)

## Common questions
**Q:** Why is Transfer FBA 0 when FBA is clearly low?
**A:** Check in order: (1) FBA on-hand + on-order + AWD + in-flight already covers the next N months of FBA forecast; (2) the website cap is 0 (3PL is small or the 4-week website reserve uses it all); (3) under Full, the shortfall is less than one carton or next-90-day FBA demand is under 70% of a carton. Switch the pill to Partial or Any to see stragglers.

**Q:** Why does the transfer stop at half my 3PL stock?
**A:** For SKUs sold on both the website and Amazon, the transfer is capped at 50% of 3PL (on-hand plus inbound landing later this month) and also keeps a website reserve of up to 4 weeks of next month's DTC + B2B demand. Amazon-only SKUs are not capped. Use Override to go higher.

**Q:** Why is Buy FBA 0 but there is a transfer?
**A:** Buy FBA is a whole-carton slice of Buy 3PL. When the FBA need fits within one carton it is shown as 0 and handled by a 3PL to FBA transfer instead.

**Q:** Does a TRANSFER tab recommendation (e.g. UK to US) reduce what I buy?
**A:** No. 3PL to 3PL transfers are display and report only. Buy 3PL, Urgent and Buy FBA do not change. Only 3PL to FBA transfers feed the buy maths.

**Q:** I just sent a transfer to FBA; why is it still recommended?
**A:** It is netted only once it shows as in-flight (an open Fulfil internal shipment into FBA / AWD, not from an excluded warehouse) or in the inbound feed. In-flight refreshes daily; press the refresh button in the FBA toolbar's in-flight box to pull it now; the count and units should update.

**Q:** Does SSM change the FBA cover?
**A:** Yes when SSM is opted in for that market's FBA pool: the SSM FBA cover (capped at 8 weeks by default) replaces the "FBA target" box for every SKU SSM can compute. The box is the fallback for SKUs or markets without SSM FBA.
