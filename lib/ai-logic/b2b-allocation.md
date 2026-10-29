---
topic: b2b-allocation
title: B2B Allocation (analysis and requests)
covers: SCENARIO > B2B Allocation (DEMAND > Scenario planner > B2B ALLOCATION): the take / decline analysis of a wholesale order (stock on the required-by date, cover kept, in-production POs, air rush, margin) and B2B allocation REQUESTS (submit for approval, notify email with the analysis, approve / reject / cancel, analysis history, WhatsApp summary, notify and approver lists).
sources:
  - server.mjs :: b2bScenarioRows
  - server.mjs :: /api/scenario/b2b
  - supply/inject.html :: b2bRender
  - server.mjs :: b2bReqAnalyse
  - server.mjs :: b2bReqList
  - server.mjs :: b2bReqWhatsApp
  - server.mjs :: b2bReqEmailHtml
  - server.mjs :: /api/scenario/b2b/requests
  - server.mjs :: /api/scenario/b2b/requests/:ref/:act
  - server.mjs :: /api/scenario/b2b/request-settings
  - supply/inject.html :: b2bReqSubmitBox
  - supply/inject.html :: b2bReqDrawer
  - migrations/402_b2b_requests.sql :: file
fingerprints:
  server.mjs::b2bScenarioRows: a4460ae3a15f
  server.mjs::/api/scenario/b2b: 6f111b8b4ca9
  supply/inject.html::b2bRender: 75c4c944e392
  server.mjs::b2bReqAnalyse: 91c256e5f5c9
  server.mjs::b2bReqList: 0ef35c999672
  server.mjs::b2bReqWhatsApp: 6c52cacd67ef
  server.mjs::b2bReqEmailHtml: af140c00447c
  server.mjs::/api/scenario/b2b/requests: 7830e2cfe8a3
  server.mjs::/api/scenario/b2b/requests/:ref/:act: 9bc9937858f7
  server.mjs::/api/scenario/b2b/request-settings: 207686102f90
  supply/inject.html::b2bReqSubmitBox: 083887167eb5
  supply/inject.html::b2bReqDrawer: 47f046e18566
  migrations/402_b2b_requests.sql::file: 5807986fcf10
verified_version: v28.585
---

## What it is
- B2B Allocation answers "should we take this wholesale order?" for one market: per SKU, what can be given on the required-by date without starving our own channels, how much is short, and what rushing the shortfall by air would cost against the wholesale margin (b2bRender, data from b2bScenarioRows via /api/scenario/b2b).
- B2B allocation REQUESTS (v28.585, Ben 29-Oct-26) turn an analysis into a decision: the requester submits it, the approvers approve or reject it, and every analysis run against it is kept.

## The analysis (per SKU, b2bRender; the same rule server side in b2bReqAnalyse)
- On hand = available units in the market's warehouses (`<market>_*` in v_product_inventory), plus AWD for the US.
- Own-channel sales until the required-by date = 3-month sales velocity (units in the last 3 months of sales_actuals / 90 per day) x days until the date.
- Inbound by date = open inbound shipments to the market landing on or before the required-by date (excluding the standard excluded references).
- Stock on the date = max(0, on hand - own-channel sales until then + inbound by date).
- Reserve = keep-cover weeks (default 9) x weekly velocity; giveable from stock = stock on the date - reserve (not below 0).
- In-production POs count only when the PO's branch is in the same market AND it can land by the required-by date if expedited (today + supplier expedited-production weeks + market air lead, "exped_land"); Direct-to-Client, JLEW and NEXT POs are excluded. The page's "Fulfil from" toggle chooses on-hand + inbound, in-production, or both (requests always use both).
- Can allocate = from stock (up to giveable) + from production (up to the feasible in-production qty); short = requested - can allocate. Verdict on a request: Yes (nothing short), Partial (some), Short (none), Unknown SKU (not in products).
- Cover after = (stock on the date - units given from stock) / weekly velocity, in weeks (blank when there are no recent sales).
- Requests also show Forecast to date: the demand plan (latest SKU forecast run, planner.forecasts level 'sku') for this market from today to the required-by date, prorated by day within each month. It is shown for context; the allocation itself uses the 3-month velocity, exactly like the page.

## Requests (v28.585)
- Submit: from the page after Analyse order, "Submit for approval" sends the SAME client, market, required-by date and SKU lines as the analysis, plus optional notes. A required-by date is required. Duplicate SKUs are summed; up to 200 lines.
- On submit the server re-runs the analysis, stores the request (ref B2B-0001 ...) and a "submitted" snapshot, emails ONE message with the full analysis (totals, per-SKU on hand, inbound by date with the next arrival, forecast to date, can allocate, cover after, verdict, notes and an Open in HORIZON button) to the notify list, and returns a WhatsApp summary plus the direct link (#/demand/scenario/b2b/<ref>).
- Notify list: app_settings b2b_request_notify (default kathryn@, sarah@, ben@). Approvers: app_settings b2b_request_approvers (default kathryn@, sarah@, abi@) plus every admin. Both are edited in the Requests drawer > Settings tab (admins only).
- Approve / Reject: approvers and admins; a reason is required to reject. Cancel: the person who created it (or an admin). Only open requests can be decided; the first decision wins.
- Each decision re-runs the analysis and stores a snapshot named after the decision, then emails the requester plus the notify list with the analysis and who decided it, when and why.
- Re-analyse (open requests) stores a "reanalysed" snapshot so the history shows how the numbers moved (e.g. a PO slipping).
- The Requests drawer has Open and Closed tabs (Closed = approved, rejected, cancelled), each card showing who created it and when, who decided it and when, the decision note, the request notes, the latest totals, actions and the Analysis history (every snapshot, newest first).

## Common questions
- "Why does the email say Partial when there is plenty on hand?" The reserve: 9 weeks of own-channel cover is kept back first, and own-channel sales until the date are taken off before anything is given.
- "Why is Forecast different from what the allocation used?" The allocation uses the 3-month sales rate (same as the page); Forecast to date is the demand plan, shown alongside for judgement.
- "Who gets the emails?" The notify list in Settings; on a decision the requester is added.
