---
topic: data-health
title: Data health (daily Fulfil data check)
covers: CONFIG > Admin > Data health and its daily email: the checks of Fulfil-fed data in HORIZON (stock on hand, inbound POs and shipments, sales orders, DTC mismatch 2.0), how findings become new / open / dismissed / fixed, who is emailed and when.
sources:
  - server.mjs :: DH_CHECKS
  - server.mjs :: DH_CHECKS_LIVE
  - server.mjs :: dhRun
  - server.mjs :: dhEmail
  - server.mjs :: dhRecipients
  - server.mjs :: /api/cron/data-health
  - server.mjs :: /api/admin/data-health
  - server.mjs :: /api/admin/data-health/:id/dismiss
  - migrations/382_data_health.sql :: file
fingerprints:
  server.mjs::DH_CHECKS: 6dbc8cfc09e8
  server.mjs::DH_CHECKS_LIVE: cf5be1ee4925
  server.mjs::dhRun: ac59999fefa8
  server.mjs::dhEmail: a160971867f8
  server.mjs::dhRecipients: a8bdf3cc29eb
  server.mjs::/api/cron/data-health: f6c595aa643d
  server.mjs::/api/admin/data-health: c06a3216d9fd
  server.mjs::/api/admin/data-health/:id/dismiss: ad86d568cc48
  migrations/382_data_health.sql::file: f021cb94b5e1
verified_version: v28.434
---
## What it is
- A daily check of the Fulfil data HORIZON holds. Phase 1 (v28.432) reads only the HORIZON database. Phase 2 (v28.434) adds live reconciliations that read Shopify, the 3PL stock reports, Fulfil and the commission engine (without Xero). (source: server.mjs :: DH_CHECKS, DH_CHECKS_LIVE)
- It writes nothing to Fulfil or any other live system. It writes only its own two tables (planner.data_health_findings, planner.data_health_runs) and one app_settings key per day for the email claim. (source: server.mjs :: dhRun)
- Page: CONFIG > Admin > Data health (#/config/admin/data-health). Admins see it in the Admin tabs; everyone else signed in gets a "Data health" tab in CONFIG, because the daily email goes to non-admins too.

## Checks (phase 1)
Open PO = status not complete / delivered / cancelled and branch not Manufacturing (Manufacturing is FOB and never in Fulfil). (source: server.mjs :: DH_CHECKS)
- **Inventory on hand** (planner.product_inventory, the Fulfil stock feed):
  - Feed up to date: high when the newest row is more than 36 hours old.
  - Negative stock: one finding per warehouse (count, total units, the 10 most negative SKUs). High.
  - Stock with no cost price: SKU with stock on hand and products.cost blank or 0.
  - Stock on SKUs not in HORIZON products.
  - Large day-on-day change: a warehouse's total on hand moved 15% or more and at least 500 units since the previous run (totals are kept on each run).
- **Inbound**:
  - PO quantities differ from Fulfil: an open PO where Fulfil has some quantity and at least one line's HORIZON qty differs from the Fulfil qty (purchase_order_lines.erp_qty, else the old ERP snapshot). Client PO groups already carry the group total in erp_qty.
  - Open PO not in Fulfil: an open PO (not FUTURE) with lines whose Fulfil qty is all 0 or missing. High.
  - Fulfil PO with no HORIZON PO: a confirmed / processing Fulfil PO not matched by PO number, erp_po, a Fulfil link or a client PO group. Fulfil test POs (TEST in the number or supplier) are ignored.
  - Shipment past its date, not received: a shipment not complete whose delivery (else landing) date is more than 7 days ago, on an open PO. High.
  - Open PO lines with no cost price (POs past FUTURE).
  - Open PO with no supplier.
- **Sales** (planner.order_lines from the Fulfil order sync, migration 377; skipped with one high finding if the table is missing):
  - Feed up to date: high when the last sync is more than 36 hours old.
  - Sold SKUs not in products: last 30 days, live orders, SKU (or the SKU without its UK- / US- / EU- / AU- / CA- prefix) not in products. Service lines (shipping, fees, gift wrap, deposits, samples, CUSTOM-*) are ignored.
  - Orders with no market or channel (last 30 days): those units are missing from actuals.
  - Orders stuck in processing: not key accounts; DTC more than 7 days, wholesale more than 30 days past the demand date. High after 30 days.
  - Old draft / quotation orders: more than 14 days old. Low.
  - DTC mismatch 2.0: every sales order with issues that is not accepted on the DTC mismatch 2.0 page, every client PO group with issues, and a high finding when the DTC 2.0 snapshot is more than 36 hours old. (source: server.mjs :: dtc2Build)
- A check returns at most 300 findings; more is noted as an error on the run.

## Findings lifecycle
- One row per check + record (SKU, PO, SO, warehouse). Each finding carries a fingerprint of its numbers (sig). (source: migrations/382_data_health.sql)
- New: first found this run, or found again after being fixed, or a dismissed finding whose numbers changed. "Since" shows when it was first seen in this spell.
- Open: still found.
- Fixed: an open or dismissed finding that a check which ran OK no longer finds. A check that fails fixes nothing.
- Dismissed: someone with any edit right gave a reason. It stays dismissed while its numbers stay the same, and reopens as new when they change. Undo dismiss returns it to open. (source: server.mjs :: /api/admin/data-health/:id/dismiss)
- The page lists fixed findings for 30 days.

## Email
- The cron run (POST /api/cron/data-health, x-webhook-secret, daily early morning UK) sends one email per London day; the day is claimed in app_settings 'data_health_emailed', so a second run the same day does not send again. (source: server.mjs :: dhEmail)
- Recipients: app_settings 'data_health_email_to' (edited on the page by an admin), else ben@, kathryn@, sarah@, diviyaj@, alexandria@ (taken from the HORIZON permissions list). (source: server.mjs :: dhRecipients)
- Content: new / open / fixed per area, the 10 most serious new findings (high first), any checks that failed, and a link to the page. Sent every day, also when nothing is new.
- Admin buttons: Run now (no email) and Send test (runs, and emails only the signed-in admin; not claimed).

## Checks (phase 2: live reconciliations, v28.434)
Run after the phase 1 checks, all at the same time, each stopped after 120 s. Reads only. (source: server.mjs :: DH_CHECKS_LIVE, dhRun)
- **Shopify orders missing from Fulfil** (sales, high): every Shopify store with credentials (UK, US, EU, AU, UKWS, USWS, EUWS), orders created from 7 days ago to 2 hours ago (sync lag), test orders left out; an order is missing when no Fulfil sale order has its name as reference. One finding per store listing up to 15 order names. An order older than 7 days drops out of the window, so its finding then shows as fixed. Sandbox 21-Oct-26: 1,698 orders checked, none missing.
- **3PL stock report vs Fulfil on hand** (inventory): UK, US and AU 3PL CSV reports and EU via BLADE, the same sources and comparison as Manage 3PL (inv3plCompare: report on hand vs products.inventory_<market>_3pl_onhand, the Fulfil feed). One finding per market: SKUs that differ, report vs Fulfil totals of those SKUs, units apart (high at 500 or more), report SKUs not in HORIZON, the 8 biggest (with a PO due within a week, when there is one). Nothing is saved to the Manage 3PL import. A market whose report cannot be read is a check error: the other markets still report, and no finding is marked fixed that run.
- **Amazon FBA report vs Fulfil** (inventory): the latest FBA report upload per market (US, UK, AU, EU, CA) when it is 7 days old or less, compared as on Manage FBA (invFbaCompare); one finding per market. Markets with no upload in 7 days are listed in one low finding (there is no Amazon API connection; the reports are uploaded).
- **Kits sold with no active BOM in Fulfil** (inventory, high): market-prefixed set SKUs (e.g. UK-TOWLB-CAB-XL-4SETK) on live sale lines of the last 14 days that have no active BOM, so their components are not taken out of stock. PP- prepacks and plain set SKUs are stocked items and are not checked. Sandbox 21-Oct-26: 107 kits sold, all with a BOM.
- **Paid wholesale orders with no agent** (sales): the commission engine for the current month WITHOUT Xero (the Xero daily limit is shared with live): payments with no agent (no Fulfil code, customer on no agent's list) and orders whose Fulfil agent code disagrees with the customer's agent. One finding per order.
- Not built: Fulfil invoices missing from Xero (there is no Fulfil-to-Xero mirror to compare with yet).
