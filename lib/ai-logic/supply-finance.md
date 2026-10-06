---
topic: supply-finance
title: Supply chain and finance
covers: PO lifecycle and date chain, shipments, on-order vs inbound, order plan, PO payments and deposits, cash flow, Payments Report and Xero posting, 3PL invoices, Fulfil push and drift, supplier and client portals, commissions, sample charges, barcodes
sources:
  - migrations/322_v_po_finance_setbased.sql :: planner.v_po_finance (canonical PO date + payment calc)
  - migrations/213_vpol_carton_from_products.sql :: planner.v_purchase_order_lines (full/partial carton check)
  - server.mjs :: PO_ROWS_SQL (admin PO grid, shipment mastering, due dates, action flags, landed cost)
  - server.mjs :: POS_SQL_PORTAL (supplier portal PO rows)
  - server.mjs :: buildDATA (on-order and inbound feeds for DEMAND)
  - server.mjs :: /api/supply/po/:po/set-shipping, propagateShippingToPOs, shipmentShippingFromMasterPO
  - server.mjs :: case 'shipments' (shipment effective dates), poShipObj, upsertTracking (DHL/FedEx)
  - server.mjs :: case 'deposits', case 'productions', case 'payments-report', PAY_REGION_SPLIT_FROM
  - server.mjs :: cashflowResponse, shipFreightSrv, seaEstSrv
  - server.mjs :: computeXeroRunPlan, /api/supply/payments/xero-post, /api/supply/xero/deposit-credit-note, _poXeroRegion
  - server.mjs :: /api/supply/payments/xero-preflight, _xeroPlanIssues, _xeroErrMsg
  - server.mjs :: xeroContactFor, xeroContactLookup, xeroContactTarget, xeroContactDefault, supplierByXeroContactIndex, sweepSupplierPaymentBills, /api/supply/xero/contact-check, /api/supply/xero/migrate-au-bill, /api/supply/xero/push-queue/:id/push
  - migrations/330_supplier_xero_contacts.sql :: planner.suppliers.xero_contact_uk/au
  - server.mjs :: /api/supply/tpl/data, /api/supply/tpl/goods-in, _tplGridSummary, _tplConsumablesInside (3PL invoices)
  - server.mjs :: fulfilPushLines, FULFIL_MAP, fulfilCompletionMap, /api/supply/fulfil/drift, /api/supply/fulfil/grid-status, fulfilCompareRows, fulfilImportPOs
  - server.mjs :: /api/supply/received-pos/process (processReceivedPos)
  - server.mjs :: /api/portal/submit, /api/portal/line-cost, /api/supply/submission/:id/apply, /api/supply/po-line-accept, /api/supply/po-line-reject
  - server.mjs :: cpTierPrice, /api/cp/prices, /api/cp/order, cpCreateFulfilDraft
  - server.mjs :: /api/client/commission/runs/build, /api/client/commission/runs/:id/xero-bill (client commission)
  - server.mjs :: /api/supply/charge/:id/accept, /api/supply/po-polybags/:po
  - server.mjs :: afLoadCommon (Auto Forecast cash phasing)
  - server.mjs :: buildUpfxStatement, upfxCsv, upfxConfig, runUpfxStatementCron, upfxEmailed, /api/supply/xero/up-fx-statement.csv, /api/cron/up-fx-statement
  - supply/inject.html :: PO_STATUSES, stGroup, prodStatusException, isFOBdest, poErpMisaligned, upfxDownload
fingerprints:
  migrations/322_v_po_finance_setbased.sql::planner.v_po_finance: 92613409dead
  migrations/213_vpol_carton_from_products.sql::planner.v_purchase_order_lines: bdf4fc99b74a
  server.mjs::PO_ROWS_SQL: 98e39c2c85c0
  server.mjs::POS_SQL_PORTAL: 2f8ff75581d4
  server.mjs::buildDATA: b1b365e09434
  server.mjs::/api/supply/po/:po/set-shipping: 52ab3a7e4e1a
  server.mjs::propagateShippingToPOs: f730be62e59b
  server.mjs::shipmentShippingFromMasterPO: 201b3cec2f32
  server.mjs::case 'shipments': 9847bbee0f5b
  server.mjs::poShipObj: bff1ca67664d
  server.mjs::upsertTracking: aaba6026cb4a
  server.mjs::case 'deposits': 491aae204483
  server.mjs::case 'productions': 535e6383bf1d
  server.mjs::case 'payments-report': a377af9242ab
  server.mjs::PAY_REGION_SPLIT_FROM: dc36a85b870b
  server.mjs::cashflowResponse: a33d79c9e949
  server.mjs::shipFreightSrv: e1966d570076
  server.mjs::seaEstSrv: 8dd7c54cd23c
  server.mjs::computeXeroRunPlan: 7ccd8b7a145a
  server.mjs::/api/supply/payments/xero-post: 94d51dc9543e
  server.mjs::/api/supply/xero/deposit-credit-note: 9c4c7b55ed0a
  server.mjs::_poXeroRegion: 844d7ad9c549
  server.mjs::/api/supply/payments/xero-preflight: 0e54d381e8ff
  server.mjs::_xeroPlanIssues: f890b66f2b6e
  server.mjs::_xeroErrMsg: 6b79e9488cf7
  server.mjs::xeroContactFor: 874272a2feb3
  server.mjs::xeroContactLookup: a7f17b379f1d
  server.mjs::xeroContactTarget: c7ec57390326
  server.mjs::xeroContactDefault: 19163f96774d
  server.mjs::supplierByXeroContactIndex: ebc499aa574e
  server.mjs::sweepSupplierPaymentBills: d6dac345b0a0
  server.mjs::/api/supply/xero/contact-check: d27e4561e3b2
  server.mjs::/api/supply/xero/migrate-au-bill: 86e68548273c
  server.mjs::/api/supply/xero/push-queue/:id/push: 058e648ad1e0
  migrations/330_supplier_xero_contacts.sql::planner.suppliers.xero_contact_uk/au: 24539d65c216
  server.mjs::/api/supply/tpl/data: a80126dd517b
  server.mjs::/api/supply/tpl/goods-in: 015c39460dba
  server.mjs::_tplGridSummary: 0e93f4ce0c66
  server.mjs::_tplConsumablesInside: e11316018639
  server.mjs::fulfilPushLines: 7bf2e380a910
  server.mjs::FULFIL_MAP: a6c47c881a14
  server.mjs::fulfilCompletionMap: df8ad2805725
  server.mjs::/api/supply/fulfil/drift: 5d0b453f9536
  server.mjs::/api/supply/fulfil/grid-status: 29e8325d5f40
  server.mjs::fulfilCompareRows: d0f12dbab280
  server.mjs::fulfilImportPOs: 17755776cb38
  server.mjs::/api/supply/received-pos/process: 39c24ef889e6
  server.mjs::/api/portal/submit: 8b510434ae83
  server.mjs::/api/portal/line-cost: 7d91a415da96
  server.mjs::/api/supply/submission/:id/apply: 49638e804b19
  server.mjs::/api/supply/po-line-accept: 073111cc8cb5
  server.mjs::/api/supply/po-line-reject: e6636f5d3d7e
  server.mjs::cpTierPrice: a2b9b629bb4a
  server.mjs::/api/cp/prices: 1445d08c02f9
  server.mjs::/api/cp/order: d604b61b8633
  server.mjs::cpCreateFulfilDraft: 5117a7608ab4
  server.mjs::/api/client/commission/runs/build: 9f79554f891a
  server.mjs::/api/client/commission/runs/:id/xero-bill: fd75919ebdf4
  server.mjs::/api/supply/charge/:id/accept: 2726245218bd
  server.mjs::/api/supply/po-polybags/:po: abcb96e2dee0
  server.mjs::afLoadCommon: c726c90779ce
  server.mjs::buildUpfxStatement: 55fca54cf96a
  server.mjs::upfxCsv: 4f84929a2c4b
  server.mjs::upfxConfig: 9883c0395688
  server.mjs::runUpfxStatementCron: c69c19fb5017
  server.mjs::upfxEmailed: 9f27ac33e9d1
  server.mjs::/api/supply/xero/up-fx-statement.csv: 529bf12ec978
  server.mjs::/api/cron/up-fx-statement: e01616997794
  supply/inject.html::PO_STATUSES: b735ad053af6
  supply/inject.html::stGroup: 0d2f0b12bf7b
  supply/inject.html::prodStatusException: dedfa68a3f75
  supply/inject.html::isFOBdest: 608131abe18e
  supply/inject.html::poErpMisaligned: 15f1c87a5307
  supply/inject.html::upfxDownload: 0924ecaf4755
verified_version: v28.177
---
## Purchase order lifecycle
- PO statuses, in order: FUTURE, PRODUCTION, READY TO SHIP, SHIPPED TO MASTER, SHIPPING, DELIVERED, COMPLETE. Status pills group them: Future; Production (PRODUCTION, READY TO SHIP and anything unknown); Shipping (SHIPPING, DELIVERED); Complete. (source: supply/inject.html :: PO_STATUSES, stGroup)
- Separate from status, the supplier sets a production_status: not_started, in_production, ready_to_ship, shipped. (source: server.mjs :: PROD_STATUSES)
- Status exceptions: past production start but status still FUTURE or blank; past production end but status still FUTURE, PRODUCTION or blank. (source: supply/inject.html :: prodStatusException)
- "Set shipping" moves POs still in PRODUCTION to SHIPPING (whole shipment when the PO has a shipment_ref) and sets production_status=shipped. It never reopens delivered or complete POs. (source: server.mjs :: /api/supply/po/:po/set-shipping)
- When a shipment departs, every PRODUCTION PO on it goes to SHIPPING and a blank production end is set to today. A master PO marked "shipped" by its supplier moves its shipment to Shipping. (source: server.mjs :: propagateShippingToPOs, shipmentShippingFromMasterPO)
- SHIPPED TO MASTER is for a rider PO that the supplier has already sent to the consolidator while the master has not sailed. It still counts as upstream, not in transit. (source: server.mjs :: set-shipped-to-master, PO_SHIPPED_STATUSES)
- A PO becomes COMPLETE automatically when the n8n "recently received POs" feed reports it received. HORIZON then adds a timeline note and emails the supply planner. (source: server.mjs :: processReceivedPos)
- The supplier portal hides FUTURE POs. (source: server.mjs :: POS_SQL_PORTAL)
- Two different "master" ideas exist. PO consolidation uses purchase_orders.master_po: a child PO carries its master's number, the master holds the summed lines, and children are left out of on-order counts. A shipment master is shipments.master_po, the PO whose dates the shipment inherits. (source: server.mjs :: buildDATA, PO_ROWS_SQL)

## PO date chain
- Production end = the production end override if set, else production start + suppliers.production_days. The only date overrides a user edits on a PO are production start and production end. (source: v_po_finance :: eff_prod_end)
- Ship date: the shipment's departure_date, else the Flexport departure, else production end + 7 days. The source badge shows S, FLEX or calc. (source: v_po_finance :: eff_ship, ship_src)
- Delivery (goods land) date: the first one set of shipment delivery_date, arrival_date, landing_date, then Flexport arrival, then Flexport landing, else ship + transit lead. (source: v_po_finance :: eff_delivery)
- Transit lead comes from the PO's branch: branches.air_lead_time_days when the shipment mode is air (or the Flexport mode starts with "air"), else branches.sea_lead_time_days. With no shipment, sea is assumed. (source: v_po_finance :: transit_lead)
- Completion ("check-in", received at the warehouse): the shipment delivery_date if set, else delivery + 7 days. The exception is a DIRECT country PO that is its own shipment group: delivery + 0 days. (source: v_po_finance :: eff_checkin)
- Shipment dates always win over PO dates. On the admin grid a PO on a shipment also inherits the shipment master PO's ship, delivery and completion dates; the badge then shows S. (source: server.mjs :: PO_ROWS_SQL mastered CTE)
- The supplier portal does not apply master inheritance. It shows each PO's own calculated dates. (source: server.mjs :: POS_SQL_PORTAL)
- A PO links to a shipment through shipments.shipment_ref = purchase_orders.shipment_ref, or the PO's own number when shipment_ref is blank. (source: v_po_finance :: base join)
- PO "late" = not complete, shipping or delivered, and the delivery date is in the past. (source: server.mjs :: PO_ROWS_SQL is_late)
- Unassigned-shipment action: the PO is not complete, has no shipment, its branch is not Manufacturing, and its country is one of UK, US, EU, AU or CA. (source: server.mjs :: PO_ROWS_SQL unassigned_shipment)

## DIRECT vs FOB
- DIRECT (country_code DIRECT, branch "Direct to Client") is a real destination. It is not automatically FOB.
- A PO counts as FOB if any of these is true: it is on a fob-mode shipment; it has no shipment and a Manufacturing branch; or it has no shipment and its country does not start with UK, US, EU, AU or CA. FOB means no freight, duty or import tax in landed cost or cash flow; only the goods value flows. (source: supply/inject.html :: isFOBdest; server.mjs :: cashflowResponse)
- Assigning a non-fob shipment cancels FOB: the shipment's destination and mode then apply. (source: supply/inject.html :: isFOBdest)

## Shipments
- A shipment groups one or more POs. Its destination (country, branch) and export port use the shipment's own override if set, else the master PO's values. They are never written back to the POs. (source: server.mjs :: case 'shipments')
- Shipment grid dates: departure, then landing, then arrival, then completion. Each uses the shipment override, else Flexport, else a calculation from the master PO (production end + 7, then + branch transit by mode). Completion = delivery_date override, else arrival + 7 days. (source: server.mjs :: case 'shipments')
- Flexport match: flexport_shipments_effective where flex_id = carrier_ref or shipment_name = shipment_ref. (source: server.mjs :: case 'shipments')
- DHL/FedEx tracking: shipments with carrier DHL or FedEx, a carrier_ref and no arrival date are polled. The delivered date (else the carrier ETA) is written to shipments.tracked_delivery_date with tracked_source dhl or fedex. This field does not feed v_po_finance. (source: server.mjs :: upsertTracking)
- Freight cost per shipment, first available: Flexport invoiced freight (total_freight_cost when it is not 0), else the Flexport quote; then cost_manual; then FOB = 0; then air = weight kg (Σ qty × products.prod_weight_uk) × air_freight_rates.rate_per_kg for the weight band (15 per kg if no band matches); then sea = the cheapest combination of freight_rates containers covering the pallets, for the destination market (UK rates if none resolves). (source: server.mjs :: shipFreightSrv, seaEstSrv)
- Pallets = Σ qty ÷ pallet_qty per line (a per-PO pallets_override wins). More than 20 pallets raises an over-pallets exception. (source: server.mjs :: case 'shipments')
- "Shipment ETA passed" = arrival, delivery or landing date is in the past, the status is not arrived, delivered or complete, and at least one PO on it is open. "Awaiting ERP receipt" = a PO DELIVERED for more than 7 days past arrival. (source: server.mjs :: actions SQL)

## On order vs inbound (DEMAND / BUY feeds)
- On-order units = the inbound_shipments feed (quantity minus received_quantity), plus lines on open POs that are not yet in that feed. A PO is matched to the feed by reference, so nothing is counted twice. (source: server.mjs :: buildDATA)
- A PO counts as on order when: it is not COMPLETE; it is not a consolidated child; its country (PO, else branch) is UK, US, EU, AU or CA; and its line qty is above 0. Warehouse = country + "_fba" if the branch name contains "fba", else "_3pl". (source: server.mjs :: buildDATA)
- "On order = shipped": placed POs land in the stock projection just like shipped inbound. Their ETA is production end + 7 + branch sea transit. (source: server.mjs :: buildDATA, buy plan inbBefore)
- When an inbound row's estimated_delivery_date is in the past, the fallback ETA is: shipment arrival, else delivery, else landing, else the PO landing override, else the calculated landing. (source: server.mjs :: buildDATA po_eta)
- PO-56UKXR2 and PO-56UKXR2A are hard-excluded from inbound and on-order (bad data). (source: server.mjs :: EXCLUDED_INBOUND_REFS)
- inbound_shipments is filled by the n8n job cin7_inbound_direct (the old n8n_sync_inbound is retired). HORIZON never writes that table. (source: server.mjs :: HZ_ETL)

## Order plan (PO lines)
- Carton check per line uses products.carton_qty (sku_labels as fallback). "Full Cartons" when qty divides exactly; "OK Partial" when partial_carton_approved; otherwise "Partial Carton - up to N", where N is qty rounded up to a whole carton. (source: v_purchase_order_lines)
- Polybag suggestion = units of each polybag size × the branch's returns_pct, rounded to a multiple of 50. The remainder rounds up only at 35 or more (84 gives 50, 85 gives 100). Only the shortfall against POLYBAG lines already on the PO is suggested. Air and FOB orders get no polybags. (source: server.mjs :: /api/supply/po-polybags/:po)
- Setting a line qty to 0 deletes the line. (source: server.mjs :: /api/supply/po-line/:po_sku)

## PO value and payment milestones
- Value used = supplier_invoice_total (the final invoice), else the line value, else order_value_estimation. Line value = Σ qty × unit cost, where unit cost = the confirmed portal final_cost, else the line cost_price, else the product cost (cost_lx or cost_xr by supplier code, else products.cost). (source: v_po_finance :: val, rw_lv)
- Costs are in the supplier's currency (suppliers.default_currency, USD by default). The Payments Report's base_ccy uses that currency.
- Start % and completion % come from the supplier, unless the PO overrides them. Under-500 rule: a PO that is not complete with value below 500 has start 0% and completion 0% (everything goes to balance). Balance % = 100 − start − completion. (source: v_po_finance :: sp, cp)
- Start deposit calc = value × start %. Start paid = the assigned amount if set; else the calc, capped at the deposit ref's remaining balance when a deposit_ref is set (deposit draw cap). (source: v_po_finance :: start_calc, start_paid)
- Completion calc (only when completion % > 0) = max(0, min((start% + completion%) × value − start paid, value + credit_amount − start paid − balance 1 − balance 2)). So a start shortfall rolls into completion, and catch_up = start calc − start paid. (source: v_po_finance :: completion_calc, catch_up)
- Balance owing = value + credit_amount − start paid − completion (assigned, else calc). credit_amount is an extra charge settled with the balance. (source: server.mjs :: PO_ROWS_SQL balance_owing)
- Due dates. Start: production start + 7, only if start calc > 0. Completion, only if completion calc > 0: with a final invoice, the ship date (master's, else own, else production end); without one, production end, or today if production end has passed. (source: server.mjs :: PO_ROWS_SQL start_due, completion_due)
- Balance due date: the final-payment-due override if set. Otherwise, for a PO not complete with value below 500: invoice_processed_date, else ship. Otherwise: credit_type on_shipment counts from ship, anything else from delivery, plus suppliers.credit_days. Shown only when balance owing is above 0. (source: v_po_finance :: bal_due_date)
- Payment overdue flag (due dates from 01-Jan-26 on, applies to complete POs too): start overdue with no assignment and no deposit_ref; completion overdue with no assignment, but only once a final invoice amount exists; balance overdue with balance_1 unset and more than 0.01 owing. (source: server.mjs :: PO_ROWS_SQL payment_overdue)
- Plan vs ledger: the app records payments on purchase_orders (pay_start_deposit_*, pay_completion_*, pay_balance_1_*, pay_balance_2_*). Start deposits drawn on a register deposit are allocations, not cash payments.

## Deposits, productions, prod_no
- deposit_ref links a PO to the deposits register (deposits.reference). All deposit money keys off deposit_ref, not prod_no. (source: v_po_finance :: da)
- Deposit available (view) = the pool (Σ register amounts for the ref) − Σ pay_start_deposit_assigned of all POs on that ref. Register "used" = Σ assigned only. (source: v_po_finance :: avail; server.mjs :: case 'deposits')
- Blank deposit estimate: when a real deposit row exists with total amount 0 and the ref is not "NO DEPOSIT", its pool = Σ start calc of the ref's open (non-complete) POs. The register shows "~N est". Cash flow shows it as an estimate. Payments Due ignores it until a real amount is entered. (source: v_po_finance :: da; server.mjs :: case 'deposits', cashflowResponse)
- A production = one supplier within one prod_no. Status is Completed when all its POs are complete, else Active. (source: server.mjs :: case 'productions')
- prod_no drives the supplier-confirmation requirement (prod_numbers.require_supplier_confirmation) and the production Xero account (prod_numbers.xero_account_code, matched ignoring a leading "P"). (source: server.mjs :: PO_ROWS_SQL, payments-report ACCT)
- Batches (planner.batches) are buying batches; they are not payment runs. (source: server.mjs :: case 'batches')

## Cash flow (SUPPLY ▸ Cash Flow)
- Lines are built from the PO grid rows. A line is timed on: the paid date, else the likely date (the deposit's date_likely_pay or a manual payment_likely_dates override), else the due date. Lines of 0 or less are dropped. (source: server.mjs :: cashflowResponse mkLine)
- Per PO: Deposit (only when there is no deposit_ref), Completion, Balance, and Balance 2 if set. An unpaid milestone is dropped once the PO is fully paid (less than 0.02 outstanding). (source: server.mjs :: cashflowResponse)
- Each referenced deposit gives one pool line. Due date = the register's date_due, else the earliest linked PO start due. It counts as paid only when every row on the ref has date_paid. (source: server.mjs :: cashflowResponse)
- Freight, import duty and import tax are estimate lines for non-complete POs, and only while the landing date is today or later. They are sized per shipment (duty and tax = Σ member POs) or per PO. Freight is due at landing + 14 days. Duty and tax are due at landing, or landing + 7 for US. FOB shipments and FOB POs post none. (source: server.mjs :: cashflowResponse)
- PO-level estimates: freight = the Flexport quote split by pallet share, else freight_rates for destination + container size. Duty = Σ qty × cost_price × duty_rates.duty_pct(category, country). Tax = tax % × goods value when the tax base is "goods", else × (goods + duty + freight). (source: v_po_finance; server.mjs :: PO_ROWS_SQL)
- "Other" register rows (is_deposit=false) appear as Other lines. (source: server.mjs :: cashflowResponse)
- Auto Forecast cash phasing (projected buys only): deposit at the order month; completion at order month + round(production_days/30); balance at demand month + round(credit_days/30); duty at the delivery month. Missing supplier terms default to 30/0/70, 60 production days, 0 credit days. (source: server.mjs :: Auto Forecast loop)

## Payments Report
- Lines: PO Completion and Balance 1/2 (amount above 0 and a paid date set), register Deposits (is_deposit, date_paid set, amount not 0, credit notes included), and Other payments. Suppliers with kind other than "supplier" are excluded. PO start deposits are excluded. (source: server.mjs :: case 'payments-report')
- One payment = date + supplier. From 01-Oct-26, AU deposits and AU Other payments are a separate payment (run_key date|supplier|AU). PO completions and balances are always on the UK key. (source: server.mjs :: PAY_REGION_SPLIT_FROM)
- Bank amount and currency come from payment_fx. "Xero done" = a supplier-payment bill recorded in payment_xero_bills, or a payment dated before 21-Sep-26. (source: server.mjs :: case 'payments-report')
- Account code per PO line: 620.00 AU if the PO country (or branch country) is AU, or if its deposit's country is AU; else the deposit's xero_account_code; else the production's prod_numbers.xero_account_code. Register deposits: 620.00 AU when the deposit country is AU, else its own code, else the production code. (source: server.mjs :: payments-report ACCT)

## Xero payment posting
- Only deposit, completion and balance lines post; Other is excluded. The paying org is picked on the run (UK by default). A PO's home org is AU when its own country_code is AU, or when country_code is blank and the branch is Coghlans; otherwise UK. A deposit's home org is AU when it is coded 620.00 AU or the run is AU. (source: server.mjs :: computeXeroRunPlan, _poXeroRegion)
- The bank pays a DRAFT supplier-payment bill (ACCPAY, number SUPPLIER-PAYMENT-<supplier code>-<date>, in the run's base currency) in the paying org. PO bills are never paid straight from the bank. (source: server.mjs :: xero-post)
- Bill line coding. Same-org deposit: P58+ (and all AU) goes to Stock Deposits (602) with Production tracking P<n>; pre-P58 goes to the production account. Same-org completion/balance: P58+ (and AU) goes to Supplier Payments 602.1; pre-P58 to the production account (for example 620.37 P57). Cross-org completion/balance goes to the paying org's 901 intercompany loan. (source: server.mjs :: computeXeroRunPlan)
- Settlement against the linked PO bill comes from the same account the line is coded to (602.1 or the production account), at the supplier-payment bill's currency rate. A pre-P58 deposit uses deposits.xero_fx. A cross-org line settles in the home org from that org's 901 loan, at Xero's own daily rate. (source: server.mjs :: xero-post)
- P58+ deposits post no payment: they draw down by credit note (ACCPAYCREDIT to 602, tagged with the production). Deposits never cross orgs: a cross-org deposit is blocked, and deposits from two orgs in one run are blocked. (source: server.mjs :: computeXeroRunPlan, deposit-credit-note)
- The post is refused if: the supplier's Xero contact is not found in the paying org (v28.177); a payment exceeds the bill's AmountDue; an account is missing, archived or not payments-enabled; or the run already has a non-voided bill (unless re-post is confirmed). Admin and confirm are required. (source: server.mjs :: xero-post)
- Preflight badges (from v28.173): on the Payments Report, each unposted run that shows the XERO button gets a badge from the same plan and checks as the Create in Xero popup, read only (Xero GETs only, nothing written). Red "⚠ N" = N problems that stop the post: the supplier's Xero contact not found in the paying org (from v28.177), a cross-org or mixed-org deposit, a payment above the bill's AmountDue, a settle account that is missing, archived or not payments-enabled, a missing 901 loan account, or a line with no account mapped. Amber "⚠" = warnings only: a P58+ deposit (credit note, no payment), no linked Xero bill (payment skipped), a bill amount due that could not be read, a cross-org line settling via loan 901, or a warn-level check. A faint tick = all clear; "?" = the check could not read Xero; nothing when Xero is not connected or the run has nothing to post. Posted ("done") rows show no badge. Results are cached 10 minutes per run and line set; any post or deposit credit note clears the cache. Xero calls are paced to 30 a minute per org, one batch at a time. (source: server.mjs :: /api/supply/payments/xero-preflight, _xeroPlanIssues)
- A failed Xero call reports Xero's own validation messages (every ValidationErrors entry, including nested ones) rather than the generic "A validation exception occurred". (source: server.mjs :: _xeroErrMsg)
- Supplier Xero contact (from v28.177): every supplier bill and credit note HORIZON posts (supplier-payment bill, deposit credit note, push-queue bill or credit note, AU bill migration) references the supplier's Xero contact by ContactID, never by name, because Xero silently creates a new contact when a posted name does not match. The contact name is suppliers.xero_contact_uk or xero_contact_au for that org (SUPPLY ▸ CONFIG ▸ Suppliers, and the Manage supplier drawer); when blank it is "<name> - <code>" for a kind=supplier row with a code (Fulfil's convention, e.g. "Nice Look - NL"), otherwise the supplier name. It is looked up by exact name among ACTIVE contacts in that org (GET only); found contacts are cached 10 minutes per org, misses 1 minute, and the post itself re-checks fresh. (source: server.mjs :: xeroContactFor, xeroContactLookup, xeroContactTarget, xeroContactDefault)
- If the contact is not found nothing is posted (no bill, payment, credit note or tracking option) and the error says "Xero contact '<name>' not found in <UK|AU>: create or merge it in Xero, or change the supplier's Xero contact in SUPPLY > CONFIG > Suppliers". HORIZON never creates a supplier contact in Xero (the old AU-migration auto-create was removed). The Create in Xero popup shows "Supplier: <name> → Xero: <contact>" and disables the post when it is missing; the preflight badge counts it as a blocking problem. Each contact field has a read-only "check" button. Commission (rep group) and 3PL bills still post by contact name. (source: server.mjs :: computeXeroRunPlan, _xeroPlanIssues, xero-post, deposit-credit-note, /api/supply/xero/contact-check)
- Matching Xero bills back to suppliers by contact name treats "<name>", "<name> - <code>" (or any "<name> - <suffix>"), "<name> (<person>)" and the configured contact names as the same supplier, plus the AU alias Jinmatex (Merry) = Jinma (Merry). (source: server.mjs :: supplierByXeroContactIndex, sweepSupplierPaymentBills)

## Universal Partners FX USD statement (from v28.174)
- Why: Xero's API cannot create bank statement lines, so HORIZON builds a statement file for the Universal Partners FX USD bank account (UK org; account id in app_settings up_fx_bank_account_id) that someone imports in Xero (the account > Manage Account > Import a Statement). Each in/out then has a statement line to reconcile against. Read only: Xero GET calls only. (source: server.mjs :: buildUpfxStatement, upfxConfig)
- Sources. (1) Payments on the account with Status AUTHORISED (DELETED and VOIDED are dropped). ACCPAYPAYMENT, ARCREDITPAYMENT and AR overpayment/prepayment refunds are money OUT (negative); ACCRECPAYMENT, APCREDITPAYMENT and AP overpayment/prepayment refunds are money IN (positive). Amount = BankAmount (the bank account's currency). Payee = the invoice or credit note contact; Reference = the invoice or credit note number. (2) Spend / receive money on the account, AUTHORISED: SPEND* = OUT, RECEIVE* = IN; transfer legs (SPEND-TRANSFER / RECEIVE-TRANSFER) are skipped. Read in 6-month date windows, from 24 months back by default, because Xero refuses an account-only filter on this org. (3) Bank transfers from or to the account: IN when it is the To account, OUT when it is the From account. The amount comes from this account's own leg (the To or From bank transaction), so it is in USD; a cross-currency transfer's Amount is in the From currency and is not used. Payee = the other bank account's name; Reference = the transfer reference. (source: server.mjs :: buildUpfxStatement)
- Unreconciled: IsReconciled for payments and bank transactions; ToIsReconciled (IN) or FromIsReconciled (OUT) for transfers. Default = unreconciled only; all=1 adds reconciled lines; from / to filter by date. Lines are deduplicated by source id and sorted by date. Description is "FX Transfer In" for money in and "FX Payment Out" for money out. (source: server.mjs :: buildUpfxStatement)
- File layout (Xero precoded statement import): header *Date,*Amount,Payee,Description,Reference,Check Number; date dd/mm/yyyy; signed amount with 2 decimals, no currency symbol. File name "UP FX Statement dd-mmm-yy.csv". SUPPLY > Payments > Payments Report toolbar button "UP FX Statement" downloads the unreconciled file. (source: server.mjs :: upfxCsv, /api/supply/xero/up-fx-statement.csv; supply/inject.html :: upfxDownload)
- Weekly email (n8n, Monday 08:00 London, POST /api/cron/up-fx-statement): sends ONLY when there is an unreconciled line that no earlier email carried. Emailed source ids are kept in app_settings up_fx_statement_emailed and pruned after 120 days. Recipients = app_settings up_fx_statement_recipients (default rita@ and accounts@). The email lists the new lines and attaches two files: the new lines only (the one to import) and every unreconciled line. Ids are marked only after the email is accepted; with no email key (sandbox) nothing sends and nothing is marked. Each real run logs etl_runs job up_fx_statement (rows = new lines). ?dry=1 returns what would be sent and writes nothing. (source: server.mjs :: runUpfxStatementCron, upfxEmailed, /api/cron/up-fx-statement)

## 3PL invoices
- Four 3PLs: uk_ilg, us_geneva, eu_ifulfilment, au_coghlans. Bill number: FULFILLMENT-<region>-<period end>. For Coghlans the bill date is the file's period end and the invoice number is added. (source: server.mjs :: TPL_KEYS, tpl/xero-bill)
- Cost-type accounts (storage, returns, inbound, other) are stored per 3PL in tpl_cost_accounts. Per-order freight and fulfilment go to the "region - channel" account map (tpl_account_map). Unmapped amounts appear as UNMAPPED lines. (source: server.mjs :: tpl/xero-bill)
- iFulfilment consumables: added into the total only when the "Consumables Cost" column sits outside "Total Excl Shipping" (Jul-26 and earlier). From Aug-26 it is inside, so it is not added again. (source: server.mjs :: _tplConsumablesInside)
- Tax: UK and EU at 20% VAT tax-inclusive (EU sheets are grossed up), AU GST 10% inclusive, US zero-rated. Geneva books by fee type to 303.2x cost-centre accounts; ILG books by DI charge code. (source: server.mjs :: tpl/xero-bill)

## Fulfil integration (active ERP)
- Push: every PO is received at China Port (stock.location CHP). The Horizon branch goes in the final_destination metafield and in the PO comment. Incoterm is always FOB. requested_shipping_date = production end. requested_delivery_date (and line delivery) = the PO grid completion date, else the estimated delivery. (source: server.mjs :: fulfilPushLines, fulfilCompletionMap)
- Company is fixed at create: AU ship-to country (PO, else branch) = company 3 (Dock & Bay Pty Ltd), anything else = company 1 (Dock & Bay Ltd). Currency = the supplier's default_currency. Payment term: credit days 90/60/30 give Net 90/60/30; anything else gives Immediate. (source: server.mjs :: fulfilCompanyForCountry, fulfilPaymentTermName)
- Line price: the confirmed portal cost, else the line cost, else the SKU's latest priced line from the same supplier, else from any supplier. Rounded to 4 decimal places. (source: server.mjs :: fulfilPushLines)
- Preflight blocks the push when: the supplier party, currency, payment term, China Port, metafield or branch is missing; a SKU is not in Fulfil; a line has no price; or a product has no purchase UOM. Writes to live Fulfil need FULFIL_LIVE_WRITES=true. (source: server.mjs :: fulfilPushLines)
- Updating a confirmed Fulfil PO: it is set back to draft, its lines are replaced in one write, then it is re-confirmed. States past confirmed cannot be edited. (source: server.mjs :: fulfilPushLines)
- Mirror: fulfil_purchase_orders is refreshed every 6 hours, or by n8n. Drift covers active POs only (PRODUCTION, READY TO SHIP, SHIPPING) and flags: missing from Fulfil, line count difference, or per-SKU qty difference. Price differences are never flagged. A "drift approved" sign-off lapses once the lines change. (source: server.mjs :: fulfil/drift, grid-status)
- ERP date drift: completion vs the Fulfil requested date (Cin7-era date for POs not in Fulfil). It flags when the gap is at least max(3 days, 5% of the days from today to completion). (source: server.mjs :: PO_ROWS_SQL erp_date_pending)
- Compare (Fulfil POs not in HORIZON): open Fulfil POs from product suppliers. A Fulfil PO counts as already in HORIZON when its number or reference matches a HORIZON PO, an erp_po, or a linked po_links ref/id. (source: server.mjs :: fulfilCompareRows)

## Supplier portal
- Suppliers submit a completion date and an invoice value. These wait as pending submissions until D&B applies them: completion goes to end_production_overide, invoice to supplier_invoice_total. Carrier and tracking update the shipment immediately. Production status applies immediately. (source: server.mjs :: /api/portal/submit, submission/:id/apply)
- Order confirmation stores supplier_confirmed_at/by plus an approved_lines snapshot (SKU to qty), so later changes show as a diff. (source: server.mjs :: /api/portal/submit)
- Line cost, qty and added-SKU changes go to portal_line_costs. D&B accepts them (they update the order-plan line, and the supplier cost becomes final_cost) or rejects them. Only confirmed final_cost feeds PO value. (source: server.mjs :: po-line-accept, po-line-reject)
- Portal "Amount due" = final invoice − milestones with a paid date, + credit_amount. It is 0 until a final invoice exists. Amounts always show "$" even for non-USD suppliers. (source: supply/portal-view.js :: PAYMENTS tab)

## Client portal pricing, orders, commissions
- Price tiers by market: rt = products.<mkt>_rt (includes tax). ws = ex-tax retail ÷ 2, where ex-tax = RT ÷ 1.2 (UK, EU), ÷ 1.1 (AU) or ÷ 1.0 (US, CA). dist = ws × (1 − discount %), with the discount taken from distributor_offers by market and method (fob, exw or 3pl). If no discount is set, the price falls back to ws. With no tier set, the legacy client_price_lists is used. (source: server.mjs :: cpTierPrice, /api/cp/prices)
- Client orders reject unknown and CLOSED SKUs. Non-whole cartons need explicit acceptance (sample orders are exempt). Samples are priced 0. The order is saved, then a Fulfil draft sale is attempted; if that fails it is flagged "needs keying". Stock shows in bands unless exact stock is configured. (source: server.mjs :: /api/cp/order)
- Commissions are monthly runs per rep group. Rate = the per-order override, else the group default. Commission = commissionable × rate ÷ 100. A credit-note row has commission 0 and carries amount × rate ÷ 100 in credit_adj; net = commission + credit_adj. Fulfil rows come from done/processing sales in the month using the untaxed amount; they are "exception" until the invoice is paid. A run cannot be finalised while exceptions remain (unless forced). The Xero bill is GBP, in the UK org, named COMMISSION-<month>-<GROUP>. (source: server.mjs :: /api/client/commission/*)

## Samples and barcodes (number-producing parts only)
- An accepted supplier charge (sample or shipment) becomes one Other payment = freight + product cost. The Payments Report Xero download splits a sample charge evenly across the sample's purposes, using sample_purpose_accounts. (source: server.mjs :: charge/:id/accept, payments-report _sampleSplit)
- Workshop barcodes come from a fixed pool of GS1 EAN-13s (free, assigned or used). The catalogue PDF prints a barcode only when the check digit is valid; a 12-digit code gets a leading 0. (source: server.mjs :: workshop-barcodes, _ean13Bits)

## Common questions
**Q:** Why did this PO's delivery date change when nobody edited the PO? **A:** A shipment's dates override the PO's. Once the PO sits on a shipment, the shipment's delivery, arrival or landing date (or Flexport's) replaces the calculated production end + 7 + branch transit. On the admin grid, riders also take the shipment master PO's dates (badge S).
**Q:** Why is the completion payment larger than the supplier's completion %? **A:** The start deposit drawn from a deposit ref is capped at what the ref has left. Any shortfall moves into completion, shown as catch-up. Completion is also capped so the total never goes above value + credit − balances already set.
**Q:** Why does a PO show no deposit and all balance? **A:** POs that are not complete with a value under 500 get 0% start and 0% completion, so 100% falls into the balance. The exception is a PO with a start or completion % override.
**Q:** Why is an AU payment coded to 620.00 AU and not the production account? **A:** In the Payments Report, AU is one account across all periods. The rule fires when the PO's country (or branch country) is AU, or when its funding deposit's country is AU. Posting is a separate step: completions and balances settle from 602.1 (P58+ and AU) or the production account (pre-P58); cross-org AU lines go through the 901 loan.
**Q:** Why does the buy plan count units that haven't shipped yet? **A:** On order counts the same as shipped. An open PO to a UK, US, EU, AU or CA destination that is not yet in the inbound feed lands at production end + 7 + branch sea transit. Once n8n lists it in inbound_shipments, the feed row replaces it.
**Q:** Why doesn't the Fulfil drift badge flag a price difference? **A:** Drift checks line count and per-SKU quantity only, and only for PRODUCTION, READY TO SHIP and SHIPPING POs. Prices still go to Fulfil when a push runs.
