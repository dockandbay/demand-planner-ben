---
topic: b2b-forecast
title: CLIENT > B2B forecast (direct-to-client wholesale orders, cash / P&L / production phasing)
covers: The B2B forecast that replaced the "B2B - Direct to Client Forecast" Google Sheet: rows and buckets, who can view and edit, GBP value and FX, cash receipts (UK VAT), P&L revenue, production cash out for unconfirmed orders, the checks, the Fulfil link and status moves, matching actual Key Accounts orders and actual vs forecast, the sheet import, the Chief feed and the workbook CSV.
sources:
  - lib/b2b_forecast.mjs :: b2bParseDate, b2bFy, b2bRate, b2bCalc, b2bChecks, b2bSummary, b2bParseSheet, b2bCsv
  - server.mjs :: b2bCanEdit, b2bFx, b2bFulfilRows, b2bFulfilState, b2bLoad, b2bField, b2bSave, b2bFulfilRefresh
  - server.mjs :: /api/client/b2b-forecast, /api/client/b2b-forecast/save, /api/client/b2b-forecast/candidates/:id, /api/client/b2b-forecast/import
  - server.mjs :: /api/feed/chief/b2b-forecast, /api/feed/b2b-forecast.csv, /api/cron/b2b-forecast
  - supply/inject.html :: b2bfRender
  - migrations/407_b2b_forecast.sql :: planner.b2b_forecast_orders, planner.b2b_forecast_payments, planner.b2b_forecast_changes, app_permissions.b2b_forecast_edit
verified_version: v28.603
fingerprints:
  lib/b2b_forecast.mjs::b2bParseDate: e97f2bd97ecb
  lib/b2b_forecast.mjs::b2bFy: 13a76c1bc38f
  lib/b2b_forecast.mjs::b2bRate: b2ef9e0881d6
  lib/b2b_forecast.mjs::b2bCalc: 8fbe979db017
  lib/b2b_forecast.mjs::b2bChecks: 5fdb091b4414
  lib/b2b_forecast.mjs::b2bSummary: d3c10970e398
  lib/b2b_forecast.mjs::b2bParseSheet: 34ec505001b1
  lib/b2b_forecast.mjs::b2bCsv: 08a0fce19607
  server.mjs::b2bCanEdit: 35cce3d6f15d
  server.mjs::b2bFx: d23d5c56cd12
  server.mjs::b2bFulfilRows: 7d1f13c3cada
  server.mjs::b2bFulfilState: c9a1a043ca29
  server.mjs::b2bLoad: cb4f272707a4
  server.mjs::b2bField: 76402bbbedeb
  server.mjs::b2bSave: 7e7e193710af
  server.mjs::b2bFulfilRefresh: 8b7b464352db
  server.mjs::/api/client/b2b-forecast: 00f56359ec2f
  server.mjs::/api/client/b2b-forecast/save: f505505a3866
  server.mjs::/api/client/b2b-forecast/candidates/:id: 72b82fbfa5c5
  server.mjs::/api/client/b2b-forecast/import: e14aeb8a62c3
  server.mjs::/api/feed/chief/b2b-forecast: b22b0fe7fe73
  server.mjs::/api/feed/b2b-forecast.csv: e08987ff231e
  server.mjs::/api/cron/b2b-forecast: 37a95ea24863
  supply/inject.html::b2bfRender: f5f89514ab9b
  migrations/407_b2b_forecast.sql::planner.b2b_forecast_orders: 8a3995392cc9
  migrations/407_b2b_forecast.sql::planner.b2b_forecast_payments: 8a3995392cc9
  migrations/407_b2b_forecast.sql::planner.b2b_forecast_changes: 8a3995392cc9
  migrations/407_b2b_forecast.sql::app_permissions.b2b_forecast_edit: 8a3995392cc9
---

## What it is
- One row per direct-to-client wholesale order, or per forecast bucket (e.g. "UK Jan Key Accounts", "Distro Feb"), with its payment schedule. It replaced the Google Sheet "B2B - Direct to Client Forecast" (tab B2B_DIRECT_FORECAST) that Andy's budget workbook imported (v28.603, Ben 31-Oct-26). (source: migrations/407_b2b_forecast.sql)
- Rule kept from the sheet: do NOT add key accounts ordering from the warehouse (3PL). Those stay in DEMAND > Key Accounts and normal sales.
- Where: CLIENT > B2B forecast, and CLIENT > Clients > (a client) > B2B forecast for that client's rows. (source: b2bfRender)
- Who: anyone with CLIENT can view. Edit = admins or the "B2B forecast" tick in CONFIG > Permissions (seeded for Mikey, Madison, Liam, Hannah). Someone with the edit tick but no CLIENT access sees CLIENT with only the B2B forecast tab. Import is admin only. (source: b2bCanEdit, cpAdminGate)

## GBP value and FX
- value_gbp = order value (net, ex tax, order currency) / rate. Rate = local currency per 1 GBP from CONFIG > Exchange rates (app_settings.fx_rates) for the financial year (FY starts 1 March) of the ship date, else the order date, else today; USD falls back to app_settings.usd_gbp_rate only if fx_rates has no rate. (source: b2bRate, b2bCalc)
- Never a hard-coded rate. No rate = the row shows "no FX rate", is left out of every total and gets a red check. The rate and its source are stored on the row (value_gbp, fx_rate, fx_source) on every save. (source: b2bCalc, b2bSave)
- The old workbook divided USD by 1.883 and EUR by 1.873 (GBP>CAD values by mistake) and sometimes 1.32. The import preview shows the workbook value against the HORIZON value per row. (source: /api/client/b2b-forecast/import)

## Cash receipts, P&L, production
- Receipt per payment = value_gbp x % in the month of its due date; UK Wholesale x 1.2 (UK VAT gross-up, as the workbook). Rows that are cancelled or paid are left out; payments with no date are left out (red check). Each receipt is tagged confirmed or forecast. (source: b2bCalc)
- AU Distributor rows are the AU entity: their amounts are also given in AUD (amount_local) for the AU budget; GBP is used for group totals. (source: b2bCalc)
- P&L revenue = value_gbp (net, no VAT) in the ship month; not for cancelled rows. (source: b2bCalc)
- Production cash out = unconfirmed, not cancelled rows only: value_gbp x COGS (default 45%, can be set per row) -> 30% in the order month, 70% in the ship month. Confirmed orders are covered by real POs. (source: b2bCalc)
- The strip on the page shows the next 12 months of the chosen measure (Receipts / P&L / Production), confirmed vs forecast, for the rows the filters show, plus anything still open from earlier months. (source: b2bfRender)

## Checks (red / amber, shown per row; the CLIENT tab badge counts rows with a red check)
- Red: no payments; payments do not add up to 100%; a payment has a % but no date; no FX rate; a date that could not be read on import or looks wrong (year before 2024 or after 2028). (source: b2bChecks)
- Amber: unconfirmed but a payment date has passed; Fulfil shows it shipped but the row is unconfirmed (drawer: Mark confirmed); ship date passed and Fulfil shows it not shipped; shipped less than the row value ("Shipped X of Y"); confirmed, no Fulfil link and 14+ days past ship date; terms mention a deposit but there is only one payment; a payment before the order date; type or currency does not match the linked HORIZON client; a bucket or unconfirmed row 30+ days past its ship date with no actual orders matched. Buckets skip the Fulfil-link checks. Cancelled rows have no checks. (source: b2bChecks)

## Fulfil link, actual vs forecast
- A row links to Fulfil sales orders through "Fulfil order refs" (SO number or customer reference; an order-number-looking reference is copied there on import). Read only from fulfil_sales; HORIZON never writes to Fulfil. (source: b2bFulfilRows, b2bFulfilState)
- Match actual orders (row drawer): lists Fulfil orders in the row type's channels (UK / US / EU Key Accounts and Custom/Co-Brand, International Distributor, AU entity), dated 60 days before the order date to 60 days after the ship date, not cancelled; the dockandbay-*-ws warehouse channels and any date are opt-in. An order already matched to another row is shown but cannot be ticked. (source: /api/client/b2b-forecast/candidates/:id)
- Actual (Fulfil) = the net value of the linked, not cancelled orders, converted to the row's currency through GBP at the same rates; "Actual vs forecast" = actual / row value - 1. (source: b2bFulfilState)
- Refresh Fulfil (button, and nightly n8n POST /api/cron/b2b-forecast) moves a row's status forward only: shipped (any linked order sent), invoiced (all posted / paid), paid (all paid), or cancelled (all cancelled). Buckets keep a manual status. Every move is logged. Paid rows drop out of receipts. (source: b2bFulfilRefresh)

## Editing, import, history
- The grid is spreadsheet-like and uses the sheet's column order (Client to Payment 2 %), so rows copied from the sheet paste straight into the last row; Excel keys (select, Enter / F2, Delete, Ctrl/Cmd+C / V / Z). New rows save once Client, Type, Value and Currency are filled. More than 2 payments: the row drawer. (source: b2bfRender)
- Every create, edit and delete is logged in b2b_forecast_changes (shown in the row drawer; Chief uses it for "what moved"). (source: b2bSave)
- Import from sheet (admin): paste B2B_DIRECT_FORECAST C:O or a CSV; skips the example rows and blanks; unmatched client names and flagged dates listed; refused once rows were added or edited in HORIZON. (source: b2bParseSheet, /api/client/b2b-forecast/import)

## Feeds
- Chief: GET /api/feed/chief/b2b-forecast (Bearer CHIEF_FEED_TOKEN; ?from=, ?to=, ?changes_since=): monthly rows (month x type x entity x confirmed x kind receipt / pnl_revenue / production_cost), the order drill-down with actual vs forecast, and the change log. Nothing else (no contacts or prices). Read only, rate limited. (source: /api/feed/chief/b2b-forecast)
- Workbook: GET /api/feed/b2b-forecast.csv?token=B2B_CSV_TOKEN, columns exactly as B2B_DIRECT_FORECAST!C:O, dates YYYY-MM-DD, % as decimals; rows with more than 2 payments are left out (listed in the X-B2B-Skipped header). Andy swaps IMPORTRANGE for IMPORTDATA. (source: b2bCsv, /api/feed/b2b-forecast.csv)

## Q&A
**Q:** Why is a USD order worth more in HORIZON than in the budget workbook? **A:** The workbook divided USD by 1.883 (a GBP>CAD rate) instead of about 1.34; HORIZON uses CONFIG > Exchange rates for the ship date's financial year.
**Q:** Why is a receipt missing from the cash strip? **A:** Its payment has no date, the row has no FX rate, or the row is cancelled or paid. The row's checks say which.
**Q:** Did the "UK Jan Key Accounts" forecast happen? **A:** Open the row, Match actual orders, tick the Fulfil Key Accounts orders it became; the row then shows Actual and Actual vs forecast. With nothing matched 30 days after its ship date it gets an amber check.
