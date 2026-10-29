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
  server.mjs::/api/scenario/b2b: 8e896d52de7c
  supply/inject.html::b2bRender: 1752faebe4e1
  server.mjs::b2bReqAnalyse: c7b2941b3310
  server.mjs::b2bReqList: 0ef35c999672
  server.mjs::b2bReqWhatsApp: 6c52cacd67ef
  server.mjs::b2bReqEmailHtml: 39ab078e8850
  server.mjs::/api/scenario/b2b/requests: a87c5a4dc02b
  server.mjs::/api/scenario/b2b/requests/:ref/:act: c79f1e771981
  server.mjs::/api/scenario/b2b/request-settings: 207686102f90
  supply/inject.html::b2bReqSubmitBox: 083887167eb5
  supply/inject.html::b2bReqDrawer: 1f66d7c129ed
  migrations/402_b2b_requests.sql::file: 5807986fcf10
verified_version: v28.590
---

## What it is
- B2B Allocation answers "should we take this wholesale order?" for one market: per SKU, what can be given on the required-by date without starving our own channels, how much is short, and what rushing the shortfall by air would cost against the wholesale margin (b2bRender, data from b2bScenarioRows via /api/scenario/b2b).
- B2B allocation REQUESTS (v28.585, Ben 29-Oct-26) turn an analysis into a decision: the requester submits it, the approvers approve or reject it, and every analysis run against it is kept.

## The analysis (per SKU, b2bRender; the same rule server side in b2bReqAnalyse)
- On hand = available units in the market's warehouses (`<market>_*` in v_product_inventory), plus AWD for the US.
- Own-channel sales until the required-by date = 3-month sales velocity (units in the last 3 months of sales_actuals / 90 per day) x days until the date.
- Inbound by date = open inbound shipments to the market landing on or before the required-by date (excluding the standard excluded references).
- Stock on the date = max(0, on hand - own-channel sales until then + inbound by date - units held by approved B2B requests). The page shows held units in a "Held B2B" column, with open requests as "pending" (not deducted).
- Reserve = keep-cover weeks (default 9) x weekly velocity; giveable from stock = stock on the date - reserve (not below 0).
- In-production POs count only when the PO's branch is in the same market AND it can land by the required-by date if expedited (today + supplier expedited-production weeks + market air lead, "exped_land"); Direct-to-Client, JLEW and NEXT POs are excluded. The page's "Fulfil from" toggle chooses on-hand + inbound, in-production, or both (requests always use both).
- Can allocate = from stock (up to giveable) + from production (up to the feasible in-production qty); short = requested - can allocate. Verdict on a request: Yes (nothing short), Partial (some), Short (none), Unknown SKU (not in products).
- Cover after = (stock on the date - units given from stock) / weekly velocity, in weeks (blank when there are no recent sales).
- Requests also show Forecast to date: the demand plan (latest SKU forecast run, planner.forecasts level 'sku') for this market from today to the required-by date, prorated by day within each month. It is shown for context; the allocation itself uses the 3-month velocity, exactly like the page.

## Requests (v28.585)
- Submit: from the page after Analyse order, "Submit for approval" sends the SAME client, market, required-by date and SKU lines as the analysis, plus optional notes. A required-by date is required. Duplicate SKUs are summed; up to 200 lines.
- On submit the server re-runs the analysis, stores the request (ref B2B-0001 ...) and a "submitted" snapshot, emails ONE message with the full analysis (totals, per-SKU on hand, inbound by date with the next arrival, forecast to date, can allocate, cover after, verdict, notes and an Open in HORIZON button) to the notify list, and returns a WhatsApp summary plus the direct link (#/demand/scenario/b2b/<ref>).
- Notify list: app_settings b2b_request_notify (default kathryn@, sarah@, ben@). Approvers: app_settings b2b_request_approvers (default kathryn@, sarah@, abi@) plus every admin. Both are edited in the Requests drawer > Settings tab (admins only).
- Decide (v28.590, migration 404, Kathryn's improvements 1, 4, 5, 9): approvers and admins decide each LINE in a decision panel: approve in full, reduce (approved qty between 1 and the requested qty) or reject (0). The panel starts on the recommendation (approved qty = can allocate) with bulk buttons (Accept all recommended, Approve all in full, Reject all). Any line approved below its requested qty needs a reason code (No stock, Timing, Margin, Customer declined, Substitute offered, Other) unless a note is given; a request-level default reason fills lines without one. The per-line result is stored in b2b_requests.decisions ([{sku, qty, approved_qty, reason}]) plus reason and decision_note.
- Status after a decision: any approved units = approved (shown "part approved" when any line is below its requested qty); nothing approved = rejected. The older whole-request approve / reject actions still work (every line in full, or every line at 0). Cancel: the person who created it (or an admin). Only open requests can be decided; the first decision wins.
- HELD stock (b2bHeld): approved units of approved requests in the same market are held until hold_until = required-by date + 14 days (B2B_HOLD_DAYS), or until an approver / admin presses Release hold (hold_until cleared, a "released" snapshot stored). Every later analysis (the page and requests) takes held units off stock on the date first; held units beyond that stock come off the feasible in-production qty, so the same production cannot be promised twice. A request never holds against itself. Open (undecided) requests are shown as "pending" against the SKU but NOT deducted.
- Seasonality flag (b2bReqAnalyse): a line is flagged "(!)" when forecast to date is at least 1.5x the own-channel sales estimate (3-month velocity x days) and at least 20 units more (B2B_SEASON_RATIO, B2B_SEASON_MIN), meaning the 9-week reserve, based on recent sales, may be too low. It is a warning only; the allocation still uses velocity.
- Each decision re-runs the analysis and stores a snapshot named after the decision, then emails the requester plus the notify list with the analysis, the approved qty and reason per line, who decided it, when and why, and the hold-until date.
- Re-analyse (open requests) stores a "reanalysed" snapshot so the history shows how the numbers moved (e.g. a PO slipping).
- Request cards (v28.586-v28.589) list the SKU lines with quantity, can allocate and verdict; a request with more than 3 lines shows the first 3 and a "Show N more lines" expander. The market shows as a coloured badge, and an open request whose latest verdict allows it shows the recommendation above Approve.
- The Requests drawer has Open and Closed tabs (Closed = approved, rejected, cancelled), each card showing who created it and when, who decided it and when, the decision note, the request notes, the latest totals, actions and the Analysis history (every snapshot, newest first).

## Common questions
- "Why does the email say Partial when there is plenty on hand?" The reserve: 9 weeks of own-channel cover is kept back first, and own-channel sales until the date are taken off before anything is given.
- "Why is Forecast different from what the allocation used?" The allocation uses the 3-month sales rate (same as the page); Forecast to date is the demand plan, shown alongside for judgement.
- "Why can I give less than last week when nothing sold?" Another request was approved for the same SKU and market: its units are held until its required-by date + 14 days. The Held B2B column (page) or "held" under On hand (request history) names the request.
- "Why does a line show (!)?" Forecast to the required-by date is well above recent sales (seasonal ramp), so keeping 9 weeks of recent-rate cover may not protect the coming season.
- "Who gets the emails?" The notify list in Settings; on a decision the requester is added.
