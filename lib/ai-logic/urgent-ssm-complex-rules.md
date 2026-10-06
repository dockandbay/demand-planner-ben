---
topic: urgent-ssm-complex-rules
title: Urgent buys, expedite, SSM safety stock and Complex Rules
covers: How Buy 3PL Urgent (Air / Sea) fires and is sized, SUPPLY expedite recommendations, the SSM service-level cover model, A-tier extra, and Complex Rules (months, range, launch_ramp) including new-launch cover.
sources:
  - artifact_v16.7.html :: project
  - artifact_v16.7.html :: getBuyQtys
  - artifact_v16.7.html :: urgentLeadText
  - artifact_v16.7.html :: discCutoffMo
  - artifact_v16.7.html :: ssmParamsFor
  - artifact_v16.7.html :: ssmEnabled
  - artifact_v16.7.html :: ssmServiceLevel
  - artifact_v16.7.html :: ssmZ
  - artifact_v16.7.html :: ssmCoverWeeks
  - artifact_v16.7.html :: ssmSeasonEndWeeks
  - artifact_v16.7.html :: ssmSafetyUnits
  - artifact_v16.7.html :: crMatch
  - artifact_v16.7.html :: crCoverWeeks
  - artifact_v16.7.html :: crWinRule
  - artifact_v16.7.html :: renderBuyPlanView
  - server.mjs :: buildPROD_CONST
  - server.mjs :: buildBRANCH_FREIGHT
  - server.mjs :: expediteActions
fingerprints:
  artifact_v16.7.html::project: 63cc8f0cfc13
  artifact_v16.7.html::getBuyQtys: 9ec1b000ecae
  artifact_v16.7.html::urgentLeadText: b441c9da65b3
  artifact_v16.7.html::discCutoffMo: 5e942f8dd917
  artifact_v16.7.html::ssmParamsFor: 757995abb45b
  artifact_v16.7.html::ssmEnabled: 9751a3702e64
  artifact_v16.7.html::ssmServiceLevel: 45efb7e8a5ff
  artifact_v16.7.html::ssmZ: 0b0158b65185
  artifact_v16.7.html::ssmCoverWeeks: 29a4ae6c62ea
  artifact_v16.7.html::ssmSeasonEndWeeks: d4eba3d46614
  artifact_v16.7.html::ssmSafetyUnits: 09b600e668d7
  artifact_v16.7.html::crMatch: fe0ba7b5a7b2
  artifact_v16.7.html::crCoverWeeks: be8157079b03
  artifact_v16.7.html::crWinRule: 114ed1126e5b
  artifact_v16.7.html::renderBuyPlanView: 8f008ff73715
  server.mjs::buildPROD_CONST: b8b131b6ad8b
  server.mjs::buildBRANCH_FREIGHT: d4506891f8e0
  server.mjs::expediteActions: 2357d115088a
verified_version: v28.164
---
## Buy 3PL Urgent: when it fires
- Urgent is a separate scan after the normal Buy 3PL pass. It covers 3PL only (not FBA). See topic buy-plan for normal Buy 3PL. (source: project)
- A normal Buy 3PL needs the full China lead; a need sooner than that cannot be a Buy 3PL and is left for Urgent. (source: project)
- The scan projects 3PL stock over the next 4 forward months (next month plus the following three), starting from today's 3PL on-hand. Each month: add confirmed 3PL inbound plus engine-planned Buy 3PL arrivals, subtract DTC + B2B demand and any FBA demand that FBA stock cannot cover. The rest of the current month's demand is not deducted in this scan. (source: project urgent scan)
- **Trigger**: the first month where closing 3PL stock / weekly DTC + B2B demand (monthly / 4.33) is under **2 weeks** (URGENT_THRESHOLD_WKS = 2). Months with no DTC + B2B demand never trigger. (source: project)
- Demand from the discontinue cutoff onward is zero (a disc date after the 15th rounds to the 1st of the next month; on or before the 15th it is that month). (source: discCutoffMo)

## Urgent sizing
- A rush cannot land instantly: earliest rush arrival = the month containing today + 5 weeks (RUSH_LEAD_WKS = 5), or the danger month if that is later. Shortfalls before that month are treated as unavoidable lost sales and are NOT bought. (source: project)
- From the rush-arrival month forward, it adds up each month's negative stock (confirmed inbound minus DTC + B2B demand), and stops at the first later month where an engine-planned Buy 3PL lands. No safety cushion is added: it restores only the unmet demand until the next resupply. (source: project)
- **Discontinue-month rule**: shortfalls in the SKU's discontinue calendar month or later never drive urgent. Stock still runs to 0; only the urgent order is withheld. Non-disc SKUs are unaffected. (source: project, discMonthKey)
- Total urgent = shortfall rounded UP to whole cartons. No per-country MOQ floor (MOQ is handled at production level). (source: project)
- Urgent always shows in the current order window (current month column), so it is an "order now" figure. (source: project, getBuyQtys)

## Air vs Sea split (additive)
- Sea arrival date = today + supplier expedited production weeks + branch sea lead days. Air arrival = today + expedited production weeks + branch air lead days. (source: project)
- Expedited production weeks = `suppliers.expedited_production_weeks` for the SKU's main supplier, default **6**. Branch air / sea days = the minimum across that country's branches, default 7 (air) and 42 (sea) if blank. (source: buildPROD_CONST, buildBRANCH_FREIGHT)
- Each shortfall month is tested on its 15th: on or after the sea arrival date it goes to **Sea** (the bulk); earlier it goes to **Air** (the bridge). (source: project)
- Air = air-month shortfall rounded UP to whole cartons, capped at the total; Sea = total minus Air. Air + Sea always equals the urgent total. A small need can be all Air (one carton over-covers it), or all Sea when sea lands in time. (source: project)
- Pills on the BUY view: Urgent, Urg Sea, Urg Air. Columns: Urgent Sea, Urgent Air. (source: render)

## Urgent lead text and tooltip
- Lead text reads "Xwk rush production + Ywk sea shipping", or "+ Ywk air freight" when the order is air only. When the order has any Sea it uses the sea freight weeks (also for an Air + Sea split). Weeks are rounded. (source: urgentLeadText, project)
- The Urgent cell tooltip names the stockout month (first danger month), the lead text, and "earliest rush lands" (the rush-arrival month). (source: getBuyQtys)
- The SKU popup card "Buy 3PL URGENT" shows the rounded lead weeks (sea weeks if any Sea, else air weeks). (source: rpc)

## Expedite recommendations (SUPPLY ▸ Actions)
- Built server-side, separate from the buy plan. Looks at open POs that are not complete and whose production status is not "shipped". (source: expediteActions)
- Per PO line: weekly demand = next 3 months of forecast_outputs for that market / 13; stockout date = today + (available stock in that market's warehouses / weekly) weeks. No forward demand = not at risk. (source: expediteActions)
- Ship date = shipment departure, else production end + 7 days, never earlier than today. Sea arrival = known shipment arrival date, else ship date + branch sea lead. Air arrival = ship date + branch air lead (default 7 days). (source: expediteActions)
- If sea lands on or before the stockout: no action. Otherwise, if air lands before sea and no later than stockout + 3 days: **Consider air freight**. Else, if production end is still in the future: **Expedite production**. Else nothing (left to production / ship check-ins). (source: expediteActions)
- One action per PO, citing the SKU with the biggest gap. Severity high if that line's value is at least £5,000 or the gap is at least 21 days; else amber. (source: expediteActions)

## Cover target: products weeks vs SSM
- Default ("Cover weeks"): 3PL target = products `target_cover_weeks_<mkt>_3pl` (blank = 4). FBA target = products `target_cover_weeks_<mkt>_fba` (blank = 4), but the buy plan passes the Buy Plan Settings "FBA target" box (default 8) as an override when that box is on the page. (source: buildPROD_CONST, getBuyQtys, project)
- **SSM opt-in** is per market x pool at DEMAND ▸ Config ▸ Buy plan logic. Rows: UK, US, EU, AU each 3PL and FBA, plus CA FBA. Nothing ticked = all weeks-cover. (source: renderBuyPlanView, ssmEnabled)
- When a pool is ticked, SSM cover weeks REPLACE the products cover for that pool. If SSM cannot compute (no forward demand) the products cover is used. (source: project, ssmCoverWeeks)
- SSM FBA cover is only used when no FBA target override is passed. Unverified: whether the "FBA target" box is absent in any context where the buy plan computes, so in practice FBA SSM may be overridden by that box. (source: project, getBuyQtys)

## SSM maths
- Service level by marketing tier (defaults): **A 99%, B 97%, C 93%, untiered 90%**. Seasonal SKUs (Type = Seasonal) get a floor of **97%**. All editable per market x pool. (source: ssmParamsFor, ssmServiceLevel)
- Z values: 99.5%+ = 2.58, 99% = 2.33, 97% = 1.88, 95% = 1.64, 93% = 1.48, otherwise 1.28. (source: ssmZ)
- d = average monthly demand over 6 months starting this month (3PL pool: DTC + B2B + ZAL; FBA pool: FBA). σd = standard deviation of the last 18 complete months of sales (needs 4+ months, else 0.5 x d). (source: ssmCoverWeeks)
- L = China lead weeks (products, for both pools) / 4.33 months. σL = the supplier's lead-time variability from PO history if 5+ deliveries, else the global figure. (source: ssmCoverWeeks)
- Safety stock (units) = Z x sqrt(L x σd^2 + d^2 x σL^2). Cover weeks = safety stock / weekly demand + review cycle weeks (default 4). (source: ssmCoverWeeks)
- Seasonal 3PL pre-buy: for a Seasonal SKU's 3PL pool, if the current / upcoming season ends within "Season max" weeks (default 30), cover = weeks to season end + safety weeks (no review cycle). Season end = end of the first run of demand months, ended by 2+ consecutive zero months; if demand never stops in 15 months it is treated as year-round (steady formula). (source: ssmSeasonEndWeeks, ssmCoverWeeks)
- Result clamped to at least 1 week; FBA capped at "FBA cap" (default 8 weeks); 3PL capped at 52. (source: ssmCoverWeeks)

## A-tier extra
- Buy Plan Settings "3PL A-tier extra" adds N weeks to the 3PL target of every tier-A SKU (default 0 on page load). It is skipped when SSM is on for that market's 3PL, because SSM already handles tier through service level. (source: project)

## Complex Rules: matching
- Managed from the "Complex Rules (N)" button on the BUY view; stored in planner.buy_complex_rules. They affect the 3PL target only (not FBA). (source: crMatch, project)
- A rule matches a SKU in a market when: enabled; market is in its country list; and every scope field that is set matches (AND): SKU list (comma-separated), Category (exact), Marketing tier (exact), Season (= the SKU's release window). Empty scope = every SKU. (source: crMatch)
- Window: optional window_from / window_to dates. A month is in the window when the 1st of that month is on or after window_from and on or before window_to. So a window starting mid-month skips that month. No window = always on. (source: crCoverWeeks)

## Complex Rules: coverage types
- **months** (cover_months): 3PL target = cover_months x 4.33 weeks in each month inside the window. (source: crCoverWeeks)
- **range, no window**: active for months from range_from to range_to; target = weeks from the 1st of that month to the end of range_to. (source: crCoverWeeks)
- **range WITH a window** (e.g. "buy the season up front"): NOT a cover raise. It places ONE block Buy 3PL in the first actionable month inside the window. The current month counts as actionable up to and including the 20th; after that, next month. If every in-window month is already past but the window ends this month or later, it places in the earliest actionable month. (source: project block buy)
- Block qty = DTC + B2B + FBA demand from range_from to coverage end (zero after discontinue; Zalando excluded) + SSM safety units, minus 3PL on-hand and confirmed 3PL inbound landing by coverage end, rounded UP to whole cartons. Coverage end = range_to, or the SSM season end if later for a Seasonal SKU. It lands after the full 3PL lead, so the monthly pass does not re-buy it. Safety units are added whether or not SSM is ticked. (source: project, ssmSafetyUnits)
- **launch_ramp** (ramp_months, ramp_sl): for months 0 to N-1 after the SKU's launch month, the 3PL target is floored at SSM cover computed at the ramp service level, decaying linearly to the tier service level cover: floor = base + (ramp - base) x (1 - k/N), k = months since launch. Needs a launch date and computable SSM cover; ramp_months defaults to 3 if invalid. Works even when SSM is not ticked. (source: project _lrFloor)

## Complex Rules: precedence
- Raise-only: a rule can only increase the 3PL target above the base (products / SSM + A-tier extra), never lower it. (source: crCoverWeeks)
- Highest coverage wins among matching months / range rules for that month. The launch_ramp floor is applied after, also raise-only. (source: crCoverWeeks, project)
- The plan popup flags a month whose 3PL Target Units is set by a rule (light yellow, hover shows the rule). (source: crWinRule)

## New-launch cover
- The old "First Buy" settings were removed. Extra cover for launches is set with Complex Rules (months or range scoped by SKU / season / category / tier, or launch_ramp). (source: project)

## Common questions
**Q:** Why is there an Urgent buy when an inbound PO is on the way?
**A:** Urgent fires if projected 3PL cover drops under 2 weeks in the next 4 forward months. Only shortfalls from the earliest rush arrival (today + 5 weeks, or the danger month) until the next planned Buy 3PL lands are bought. If the PO arrives after the stockout, the gap before it still counts.

**Q:** Why is the urgent split into Air and Sea?
**A:** Months whose 15th falls before an expedited sea shipment could land (expedited production weeks + sea days) go to Air as a bridge, rounded up to whole cartons; the rest goes to Sea. Air + Sea = the urgent total.

**Q:** Why no urgent for a SKU that is about to stock out?
**A:** Common reasons: the shortfall is in or after the SKU's discontinue month; it falls before the earliest rush could land (lost sales, not bought); cover stays at or above 2 weeks; or it is beyond the 4-month scan.

**Q:** My Complex Rule says 6 months cover but the target did not move. Why?
**A:** Check scope (all set fields must match, Season = release window), the market list, and the window (a month counts only if its 1st is inside the window). Rules only raise: if the base cover is already higher, nothing changes. A range rule with a window does not raise cover at all; it places one up-front block buy.

**Q:** What changes when I tick SSM for UK 3PL?
**A:** Each UK SKU's 3PL target becomes safety stock (from tier service level, demand volatility and lead-time variability) plus a 4-week review cycle, instead of the products cover weeks. A-tier extra stops applying. Complex Rules still raise on top. FBA is unaffected unless UK FBA is also ticked.
