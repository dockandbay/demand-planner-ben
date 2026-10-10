---
topic: supply-finance
title: Supply chain and finance
covers: PO lifecycle and date chain, shipments, on-order vs inbound, order plan, PO payments and deposits, cash flow, Payments Report and Xero posting, 3PL invoices, Fulfil push and drift, supplier and client portals, commissions, sample charges, barcodes
sources:
  - migrations/322_v_po_finance_setbased.sql :: planner.v_po_finance (canonical PO date + payment calc)
  - migrations/213_vpol_carton_from_products.sql :: planner.v_purchase_order_lines (full/partial carton check)
  - server.mjs :: PO_ROWS_SQL (admin PO grid, shipment mastering, due dates, action flags, landed cost)
  - server.mjs :: accountsGate, /api/accounts/payables (ACCOUNTS > Payables)
  - supply/inject.html :: acRenderPayables, accountsCan
  - server.mjs :: cogsBuild, cogsValuation, cogsRates, cogsStore, COGS_COLS (BUY & MOVE > Inventory > COGS for Airtable)
  - artifact_v16.7.html :: renderCogs
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
  - server.mjs :: fulfilPushTarget, fulfilGuardCtx, fulfilExistingCandidates, FULFIL_CLIENT_PO_SQL, /api/supply/fulfil/po-search, /api/supply/po/:po/links (Fulfil create guard + Link Fulfil PO)
  - server.mjs :: sovAnalyse, sovLineBlock, sovModeBlock, sovChangeMode, sovFindSales, sovPushOrder, /api/supply/fulfil/sales-order/push-suppliers, /api/supply/fulfil/sales-order/analyse-batch, /api/supply/fulfil/sales-order/push-batch (Validate sales order)
  - migrations/334_so_supplier_pushes.sql :: planner.so_supplier_pushes
  - server.mjs :: /api/supply/received-pos/process (processReceivedPos)
  - server.mjs :: /api/portal/submit, /api/portal/line-cost, /api/supply/submission/:id/apply, /api/supply/po-line-accept, /api/supply/po-line-reject
  - server.mjs :: portalShipmentRole, portalCanReadAttachment, /api/portal/shipment/:ref, /api/portal/attachment/:id, staffOnly, /api/portal/redeem (portal access rules)
  - server.mjs :: portalPoIsSlim, portalPaymentsTrim, /api/portal/po-detail, /api/portal/shipment-notes-read, shipNoteUnreadSql (portal payload + per-supplier shipment reads)
  - server.mjs :: /api/portal/doc-remove, /api/portal/upload (supplier PO documents)
  - server.mjs :: portalOwnsProductSample (product-dev request-level ownership)
  - server.mjs :: cpTierPrice, /api/cp/prices, /api/cp/order, cpCreateFulfilDraft, cpAutoPush, cpSalesTeam, /api/client/portal-orders/:id (+ /fulfil-options, /push, /cancel)
  - server.mjs :: /api/client/commission/runs/build, /api/client/commission/runs/:id/xero-bill (client commission)
  - server.mjs :: cpAllowedOrderKeys, cpPortalThreads, cpOrderThreadFind, cpOrderClients, /api/cp/order-thread/:key, /api/client/order-thread/:key/post (order messages + documents)
  - migrations/336_client_order_threads.sql :: planner.client_threads.order_key, client_messages.internal
  - server.mjs :: /api/supply/charge/:id/accept, /api/supply/po-polybags/:po
  - server.mjs :: afLoadCommon (Auto Forecast cash phasing)
  - server.mjs :: buildUpfxStatement, upfxCsv, upfxConfig, runUpfxStatementCron, upfxEmailed, /api/supply/xero/up-fx-statement.csv, /api/cron/up-fx-statement
  - supply/inject.html :: PO_STATUSES, stGroup, prodStatusException, isFOBdest, poErpMisaligned, upfxDownload
  - server.mjs :: syncXeroBills, _syncXeroBillsRun, xbUpsert, xbLastSync, xeroBillsFullResync, /api/supply/xero/bills-sync-visit, /api/supply/xero/bills-resync-all (Xero bill cache)
  - server.mjs :: xeroHealPoLinks, xeroHealAllVoided, xbRefreshLive, xbLeadMatch, xeroVoidLinkFinding, resolvePoLinks, /api/supply/po/:po/links, /api/supply/xero/bills/search, /api/supply/xero/bills/verify (PO to Xero bill links)
  - supply/inject.html :: xeroBillPicker, xbsVisit, xbsSync
fingerprints:
  migrations/322_v_po_finance_setbased.sql::planner.v_po_finance: 92613409dead
  migrations/213_vpol_carton_from_products.sql::planner.v_purchase_order_lines: bdf4fc99b74a
  server.mjs::PO_ROWS_SQL: cbab4f9d8e7a
  server.mjs::accountsGate: eed85da15ec4
  server.mjs::/api/accounts/payables: f95bff782b95
  supply/inject.html::acRenderPayables: dcfac50320fe
  supply/inject.html::accountsCan: c51271303351
  server.mjs::cogsBuild: 68c9ded1d569
  server.mjs::cogsValuation: bc96a6558dea
  server.mjs::cogsRates: 1824cafed9b3
  server.mjs::cogsStore: bcd45226f5b0
  server.mjs::COGS_COLS: 03fda4554d05
  artifact_v16.7.html::renderCogs: 0ba77ea1149c
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
  server.mjs::computeXeroRunPlan: f8b9a11c4793
  server.mjs::/api/supply/payments/xero-post: b681d6aa41c4
  server.mjs::/api/supply/xero/deposit-credit-note: 52b39f6ce1b1
  server.mjs::_poXeroRegion: 844d7ad9c549
  server.mjs::/api/supply/payments/xero-preflight: 0e54d381e8ff
  server.mjs::_xeroPlanIssues: 20dc55ced28a
  server.mjs::_xeroErrMsg: 6b79e9488cf7
  server.mjs::xeroContactFor: 874272a2feb3
  server.mjs::xeroContactLookup: a7f17b379f1d
  server.mjs::xeroContactTarget: c7ec57390326
  server.mjs::xeroContactDefault: 19163f96774d
  server.mjs::supplierByXeroContactIndex: ebc499aa574e
  server.mjs::sweepSupplierPaymentBills: a7d5fee41468
  server.mjs::/api/supply/xero/contact-check: d27e4561e3b2
  server.mjs::/api/supply/xero/migrate-au-bill: 41407c12ae60
  server.mjs::/api/supply/xero/push-queue/:id/push: 534db0c45147
  migrations/330_supplier_xero_contacts.sql::planner.suppliers.xero_contact_uk/au: e39d4e6d6226
  server.mjs::/api/supply/tpl/data: a80126dd517b
  server.mjs::/api/supply/tpl/goods-in: 015c39460dba
  server.mjs::_tplGridSummary: 0e93f4ce0c66
  server.mjs::_tplConsumablesInside: e11316018639
  server.mjs::fulfilPushLines: 5aa606bd5490
  server.mjs::FULFIL_MAP: a6c47c881a14
  server.mjs::fulfilCompletionMap: df8ad2805725
  server.mjs::/api/supply/fulfil/drift: 5d0b453f9536
  server.mjs::/api/supply/fulfil/grid-status: de13cc6028c0
  server.mjs::fulfilCompareRows: 9afcbaf79bb7
  server.mjs::fulfilImportPOs: 17755776cb38
  server.mjs::fulfilPushTarget: 2c0fb3c1cc0a
  server.mjs::fulfilGuardCtx: 431118959c8c
  server.mjs::fulfilExistingCandidates: 4a108d8a257b
  server.mjs::FULFIL_CLIENT_PO_SQL: 1dfcdf1c9fe5
  server.mjs::/api/supply/fulfil/po-search: f0bef6ad0581
  server.mjs::/api/supply/po/:po/links: 0bdb5f8c0dfd
  server.mjs::sovAnalyse: 9b73b85176ff
  server.mjs::sovLineBlock: bf5806a2f16a
  server.mjs::sovModeBlock: daa8ceb2c541
  server.mjs::sovChangeMode: b964a5103af5
  server.mjs::sovFindSales: 18cf17b8bb06
  server.mjs::sovPushOrder: 50ea623c436d
  server.mjs::/api/supply/fulfil/sales-order/push-suppliers: ba6d7a4f3b01
  server.mjs::/api/supply/fulfil/sales-order/analyse-batch: 0b121beebc47
  server.mjs::/api/supply/fulfil/sales-order/push-batch: 8d7875782e0b
  migrations/334_so_supplier_pushes.sql::planner.so_supplier_pushes: 193e21992ae8
  server.mjs::/api/supply/received-pos/process: 39c24ef889e6
  server.mjs::/api/portal/submit: 08ea62191222
  server.mjs::/api/portal/line-cost: 7d91a415da96
  server.mjs::/api/supply/submission/:id/apply: 49638e804b19
  server.mjs::/api/supply/po-line-accept: 073111cc8cb5
  server.mjs::/api/supply/po-line-reject: e6636f5d3d7e
  server.mjs::portalShipmentRole: 745b3171a691
  server.mjs::portalCanReadAttachment: a712ab0925c2
  server.mjs::/api/portal/shipment/:ref: f6ee876e945f
  server.mjs::/api/portal/attachment/:id: 386ae75896e8
  server.mjs::staffOnly: 0df84ff342f4
  server.mjs::/api/portal/redeem: 1b6cd55e81c1
  server.mjs::portalPoIsSlim: 17fefe2c8da5
  server.mjs::portalPaymentsTrim: 0527feb03955
  server.mjs::/api/portal/po-detail: 22521cd4b8ba
  server.mjs::/api/portal/shipment-notes-read: 46a5ba85ff73
  server.mjs::shipNoteUnreadSql: a728facfa589
  server.mjs::/api/portal/doc-remove: 0b42deeb0db0
  server.mjs::/api/portal/upload: 37dcc4894596
  server.mjs::portalOwnsProductSample: 29dda2af6dd1
  server.mjs::cpTierPrice: a2b9b629bb4a
  server.mjs::/api/cp/prices: 1445d08c02f9
  server.mjs::/api/cp/order: 398611112b12
  server.mjs::cpCreateFulfilDraft: 81e3ebb94ea9
  server.mjs::cpAutoPush: c9e609cf631c
  server.mjs::cpSalesTeam: fc161fffe290
  server.mjs::/api/client/portal-orders/:id: f994a90fd00a
  server.mjs::/api/client/commission/runs/build: 9f79554f891a
  server.mjs::/api/client/commission/runs/:id/xero-bill: fd75919ebdf4
  server.mjs::cpAllowedOrderKeys: b6d23180e894
  server.mjs::cpPortalThreads: 84a27797a150
  server.mjs::cpOrderThreadFind: 00c107366099
  server.mjs::cpOrderClients: 21bc75ca4d0c
  server.mjs::/api/cp/order-thread/:key: 3a5d8c8753ba
  server.mjs::/api/client/order-thread/:key/post: b7a4807dbfb7
  migrations/336_client_order_threads.sql::planner.client_threads.order_key: 04dc437babc1
  migrations/336_client_order_threads.sql::client_messages.internal: 04dc437babc1
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
  server.mjs::syncXeroBills: aa83d71fb7e3
  server.mjs::_syncXeroBillsRun: 96082099a446
  server.mjs::xbUpsert: 7f5a5479a726
  server.mjs::xbLastSync: 29ebc29cc1f8
  server.mjs::xeroBillsFullResync: 54b5a2882dd0
  server.mjs::/api/supply/xero/bills-sync-visit: 87f77c346216
  server.mjs::/api/supply/xero/bills-resync-all: 8c04a72e378c
  server.mjs::xeroHealPoLinks: b23530b2ab42
  server.mjs::xeroHealAllVoided: f7a9526d934b
  server.mjs::xbRefreshLive: 72a5b6526c2d
  server.mjs::xbLeadMatch: 4dfee85a4bdd
  server.mjs::xeroVoidLinkFinding: 093a000593ab
  server.mjs::resolvePoLinks: 2bf35107b878
  server.mjs::/api/supply/xero/bills/search: 5098368ae682
  server.mjs::/api/supply/xero/bills/verify: 13d9d1030b2a
  supply/inject.html::xeroBillPicker: 28bae78ad4bb
  supply/inject.html::xbsVisit: 129907732732
  supply/inject.html::xbsSync: 81f17c7b7d33
verified_version: v28.250
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
- xdock_3pl (v28.187): for a client-bound PO, the 3PL branch its shipment lands at (shipment branch, else a 3PL rider PO on the same shipment), else blank. Drives the "Crossdock likely required" action. sub_comp_date / sup_completion_pending skip a submitted completion date equal to the current production end. (source: server.mjs :: PO_ROWS_SQL xdock_3pl)

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
- The post is refused if: the supplier's Xero contact is not found in the paying org (v28.176); a PO's linked bill was voided in Xero and has no single replacement (v28.183, "choose a bill"); a payment exceeds the bill's AmountDue; an account is missing, archived or not payments-enabled; or the run already has a non-voided bill (unless re-post is confirmed). Admin and confirm are required. (source: server.mjs :: xero-post)
- Preflight badges (from v28.173): on the Payments Report, each unposted run that shows the XERO button gets a badge from the same plan and checks as the Create in Xero popup, read only (Xero GETs only, nothing written). Red "⚠ N" = N problems that stop the post: the supplier's Xero contact not found in the paying org (from v28.176), a cross-org or mixed-org deposit, a payment above the bill's AmountDue, a settle account that is missing, archived or not payments-enabled, a missing 901 loan account, or a line with no account mapped. Amber "⚠" = warnings only: a P58+ deposit (credit note, no payment), no linked Xero bill (payment skipped), a bill amount due that could not be read, a cross-org line settling via loan 901, or a warn-level check. A faint tick = all clear; "?" = the check could not read Xero; nothing when Xero is not connected or the run has nothing to post. Posted ("done") rows show no badge. Results are cached 10 minutes per run and line set; any post or deposit credit note clears the cache. Xero calls are paced to 30 a minute per org, one batch at a time. (source: server.mjs :: /api/supply/payments/xero-preflight, _xeroPlanIssues)
- A failed Xero call reports Xero's own validation messages (every ValidationErrors entry, including nested ones) rather than the generic "A validation exception occurred". (source: server.mjs :: _xeroErrMsg)
- Supplier Xero contact (from v28.176): every supplier bill and credit note HORIZON posts (supplier-payment bill, deposit credit note, push-queue bill or credit note, AU bill migration) references the supplier's Xero contact by ContactID, never by name, because Xero silently creates a new contact when a posted name does not match. The contact name is suppliers.xero_contact_uk or xero_contact_au for that org (SUPPLY ▸ CONFIG ▸ Suppliers, and the Manage supplier drawer); when blank it is "<name> - <code>" for a kind=supplier row with a code (Fulfil's convention, e.g. "Nice Look - NL"), otherwise the supplier name. Fulfil builds the name from ITS supplier name, so migration 330 (v28.177) seeds the three that differ from HORIZON: MQ = "MQ Print - MQ", JM = "Jinma (merry) - JM", Huzhou Double Qing (Ribbon) = "Huzhou Double Qing (Ribbon) - HDQ". On 06-Oct-26 all 11 Fulfil suppliers had their "- CODE" contact in Xero UK and AU; Chilly Bottles, Foamie, Forming Reality, Kangxun and Zhongshan Huiming are not in Fulfil and posting for them is blocked until their contact exists or is configured. It is looked up by exact name among ACTIVE contacts in that org (GET only); found contacts are cached 10 minutes per org, misses 1 minute, and the post itself re-checks fresh. (source: server.mjs :: xeroContactFor, xeroContactLookup, xeroContactTarget, xeroContactDefault)
- If the contact is not found nothing is posted (no bill, payment, credit note or tracking option) and the error says "Xero contact '<name>' not found in <UK|AU>: create or merge it in Xero, or change the supplier's Xero contact in SUPPLY > CONFIG > Suppliers". HORIZON never creates a supplier contact in Xero (the old AU-migration auto-create was removed). The Create in Xero popup shows "Supplier: <name> → Xero: <contact>" and disables the post when it is missing; the preflight badge counts it as a blocking problem. Each contact field has a read-only "check" button. Commission (rep group) and 3PL bills still post by contact name. (source: server.mjs :: computeXeroRunPlan, _xeroPlanIssues, xero-post, deposit-credit-note, /api/supply/xero/contact-check)
- Matching Xero bills back to suppliers by contact name treats "<name>", "<name> - <code>" (or any "<name> - <suffix>"), "<name> (<person>)" and the configured contact names as the same supplier, plus the AU alias Jinmatex (Merry) = Jinma (Merry). (source: server.mjs :: supplierByXeroContactIndex, sweepSupplierPaymentBills)

## Xero bill links and the bill cache (from v28.183)
- Bill cache: planner.xero_bills holds every ACCPAY bill of both orgs (all statuses, including VOIDED and DELETED). The hourly cron (n8n, POST /api/cron/xero-bills-sync) reads only bills changed since the last sync (If-Modified-Since, which Xero reads as UTC), 1000 per page, explicitly asking for DRAFT, SUBMITTED, AUTHORISED, PAID, VOIDED and DELETED. The next watermark is the run start minus 5 minutes. A run that stops early (error, or more than 30 pages) keeps the high-water of what it read, so the next run resumes instead of skipping the rest. One sync runs at a time; a second caller waits for it. (source: server.mjs :: syncXeroBills, _syncXeroBillsRun, xbUpsert)
- After every sync: links to voided bills are healed from the cache (rule below), then an App health sanity finding "xero:links_to_voided_bills" records any PO link still pointing at a VOIDED/DELETED bill (count + examples; shown in CONFIG > App health log and the weekly report). (source: server.mjs :: syncXeroBills, xeroVoidLinkFinding)
- Sync on visit: opening SUPPLY > Payments > Payments Report or Xero payments starts a background sync only when the last completed sync is older than 12 hours; the page never waits and refreshes its preflight badges / exceptions when bills changed. "↻ Sync now" next to "Xero bills synced dd-mmm-yy hh:mm" (admins) always syncs straight away. (source: server.mjs :: /api/supply/xero/bills-sync-visit; supply/inject.html :: xbsVisit, xbsSync)
- Resync all bills (SUPPLY > CONFIG > Xero > Xero bills cache): re-reads every bill of both orgs (ordered by InvoiceID, 1000 per page; about 11 Xero calls, a minute or so), shows progress, logs etl_runs job xero_bills_full_resync. A cached bill it did not see is deleted only when that org's set was complete (bills read = Xero's item count) and no PO link points at it. (source: server.mjs :: xeroBillsFullResync, /api/supply/xero/bills-resync-all)
- Which bill belongs to a PO: the bill number or reference must START with the PO number (or the PO plus digits, a deposit / balance bill), never merely contain it; a leading token that is itself another PO's number (PO-44UKXR1 vs PO-44UKXR10) is that PO's bill. Voided / deleted bills are never linked (the live resolver and the manual link both refuse them). (source: server.mjs :: xbLeadMatch, resolvePoLinks, /api/supply/po/:po/links)
- Auto-heal: when a PO's linked bill is VOIDED or DELETED, HORIZON looks for its replacement: non-voided ACCPAY bills in either org that match the PO (rule above) and whose contact is the PO's supplier ("<name>", "<name> - <code>" or the configured Xero contact all count as the same supplier). Exactly one: the link moves to it (found_by auto-heal, the note keeps the old bill, health event xero:link_healed). None or several: no guess; the link turns to "action" with "linked bill voided: choose a bill", the Linked records panel shows ⚠ voided and the change-bill picker, and a payment run for that PO is blocked. A manual link is only healed to a bill of the same supplier as the voided bill. (source: server.mjs :: xeroHealPoLinks)
- Where it runs: payment runs (preview, preflight badges, post) re-read the linked bills live first and heal before planning; the PO's Linked records read heals from the cache, and "Find / refresh links" re-reads live and also searches Xero for the PO; every bill sync heals from the cache. (source: server.mjs :: computeXeroRunPlan, /api/supply/po/:po/links, xeroHealAllVoided)
- Change-bill picker (PO drawer > MASTER DATA & DOCS > Linked records): lists cached bills (voided ones last), always including the current link; when it opens it re-checks the listed bills and the current one live in Xero (GET Invoices?IDs, 50 per call, per org) and searches Xero for the typed text so a bill created since the last sync appears. Voided / deleted bills are struck through and cannot be picked; a voided current link shows "⚠ voided". (source: supply/inject.html :: xeroBillPicker; server.mjs :: /api/supply/xero/bills/search, /api/supply/xero/bills/verify, xbRefreshLive)

## Universal Partners FX USD statement (from v28.174)
- Why: Xero's API cannot create bank statement lines, so HORIZON builds a statement file for the Universal Partners FX USD bank account (UK org; account id in app_settings up_fx_bank_account_id) that someone imports in Xero (the account > Manage Account > Import a Statement). Each in/out then has a statement line to reconcile against. Read only: Xero GET calls only. (source: server.mjs :: buildUpfxStatement, upfxConfig)
- Sources. (1) Payments on the account with Status AUTHORISED (DELETED and VOIDED are dropped). ACCPAYPAYMENT, ARCREDITPAYMENT and AR overpayment/prepayment refunds are money OUT (negative); ACCRECPAYMENT, APCREDITPAYMENT and AP overpayment/prepayment refunds are money IN (positive). Amount = BankAmount (the bank account's currency). Payee = the invoice or credit note contact; Reference = the invoice or credit note number. (2) Spend / receive money on the account, AUTHORISED: SPEND* = OUT, RECEIVE* = IN; transfer legs (SPEND-TRANSFER / RECEIVE-TRANSFER) are skipped. Read in 6-month date windows, from 24 months back by default, because Xero refuses an account-only filter on this org. (3) Bank transfers from or to the account: IN when it is the To account, OUT when it is the From account. The amount comes from this account's own leg (the To or From bank transaction), so it is in USD; a cross-currency transfer's Amount is in the From currency and is not used. Payee = the other bank account's name; Reference = the transfer reference. (source: server.mjs :: buildUpfxStatement)
- Unreconciled: IsReconciled for payments and bank transactions; ToIsReconciled (IN) or FromIsReconciled (OUT) for transfers. Default = unreconciled only; all=1 adds reconciled lines; from / to filter by date. Lines are deduplicated by source id and sorted by date. Description is "FX Transfer In" for money in and "FX Payment Out" for money out. (source: server.mjs :: buildUpfxStatement)
- File layout (Xero precoded statement import): header *Date,*Amount,Payee,Description,Reference,Check Number; date dd/mm/yyyy; signed amount with 2 decimals, no currency symbol. File name "UP FX Statement dd-mmm-yy.csv". SUPPLY > Payments > Payments Report toolbar button "UP FX Statement" downloads the unreconciled file. (source: server.mjs :: upfxCsv, /api/supply/xero/up-fx-statement.csv; supply/inject.html :: upfxDownload)
- Weekly email (n8n, Monday 08:00 London, POST /api/cron/up-fx-statement): sends ONLY when there is an unreconciled line that no earlier email carried. Emailed source ids are kept in app_settings up_fx_statement_emailed and pruned after 120 days. Recipients = app_settings up_fx_statement_recipients (default rita@ and accounts@). The email lists the new lines and attaches two files: the new lines only (the one to import) and every unreconciled line. Ids are marked only after the email is accepted; with no email key (sandbox) nothing sends and nothing is marked. Each real run logs etl_runs job up_fx_statement (rows = new lines). ?dry=1 returns what would be sent and writes nothing. (source: server.mjs :: runUpfxStatementCron, upfxEmailed, /api/cron/up-fx-statement)

## ACCOUNTS (from v28.247)
- ACCOUNTS is a top menu after CLIENT, seen only by users with the ACCOUNTS grant (CONFIG > Admin > Permissions) or admins. Unlike other areas, reading is gated too: every /api/accounts/* call returns 403 without the grant. (source: server.mjs :: accountsGate)
- Payables: open Xero bills in UK and AU (status approved or awaiting approval, amount due above zero) from the hourly Xero bill cache, grouped by contact, org and currency, aged by due date into Not due, 1-30, 31-60, 61-90 and 90+ days overdue. Amounts stay in the bill currency (no GBP conversion). (source: server.mjs :: /api/accounts/payables)
- A contact counts as a Supplier when any of its bills is linked to a HORIZON PO, or its Xero name ends " - <supplier code>" matching a HORIZON supplier code. The Suppliers pill shows only those; All contacts shows every open bill. (source: server.mjs :: /api/accounts/payables)
- 3PL invoicing moved from REPORTS to ACCOUNTS > 3PL invoicing in v28.247; old #/reports/3pl-invoicing links redirect. (source: supply/inject.html :: acRenderPayables)
- Bank ageing (v28.249, interim): Xero items entered on a bank account but not reconciled, UK and AU: spend and receive money, bill and invoice payments whose account is a bank account (payments booked to loan or prepayment accounts are left out, they can never reconcile), and transfers with an unreconciled side (each side shows on its own account; transfer-type bank transactions are not counted twice). Grouped by bank account, aged by transaction date into 0-30, 31-60, 61-90 and 90+ days, amounts in the bank account currency. Bank statement lines not yet matched in Xero are not included (needs Xero bank statement access). (source: server.mjs :: accountsBankSyncOrg; supply/inject.html :: acRenderBank)
- Bank ageing data comes from a background job (hourly n8n cron /api/cron/accounts-bank-sync, the local server hourly, or Refresh now), logged in etl_runs as accounts_bank_ageing; the screen reads the stored result and shows a stale badge when the last good run is over 2 hours old or failed. Xero refuses broad bank transaction reads on the UK org, so the job reads year by year and halves any window Xero refuses. (source: server.mjs :: accountsBankSync)
- Back-date (v28.250): a weekly learn job (read only on Xero and Gmail) pairs RECONCILED Xero spend and bill payments (UK and AU, last 120 days) with accounts@ emails. "Receipts to attach" = pairs where the Xero item has no file. Pairing: exact amount, email from 60 days before to 7 days after the bank date, and the payee name in the sender or subject; without the name only an email with 8 amounts or fewer, the same explicit currency and a gap of -2 to +3 days counts. Amounts are read from the subject, body and up to 2 PDF attachments. Left out of matching: feeds (payees with 60 or more items in the window), 3PLs (Coghlans, ILG, I-Fulfilment, Geneva: billed through 3PL invoicing) and HORIZON product suppliers. Nothing is attached or changed in Xero from this page. (source: server.mjs :: accountsLearn)
- Back-date "Tax to review" = every reconciled UK spend coded Reverse Charge (feeds included, 3PLs and product suppliers left out), with the treatment Ben set: non-GBP expenses = Zero Rated Expenses, GBP = 20% VAT on Expenses or No VAT, UK bank fees = No VAT. Reverse Charge is never proposed. (source: server.mjs :: accountsLearn)
- Inbox matcher (v28.248, step 1): one Gmail mailbox (accounts@) is connected by a user with ACCOUNTS access, read-only scope (gmail.readonly); HORIZON never sends, labels or deletes mail. The refresh token is stored sealed (AES-256-GCM) in planner.accounts_gmail. The tab shows the newest 25 emails for a Gmail search (default last 30 days) with their attachments, and flags Stripe emails without attachments (receipt link). Matching to unreconciled bank lines and bill creation are not built yet. (source: server.mjs :: /api/accounts/gmail/*; supply/inject.html :: acInRender)

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
- Create guard (v28.199, URGENT after the PO373 / PO385 duplicate): HORIZON never creates a Fulfil PO for a CLIENT PO = branch country DIRECT, a Direct to Client / UK B2B JLEW / UK B2B NEXT branch, or a key-account PO (a plain "client" text or a sales_order_ref alone is not enough: stock POs use client for samples and sales_order_ref for FBA shipment ids; the duplicate check below still uses any PO's refs). A client PO must be linked to its existing Fulfil PO instead. (source: server.mjs :: FULFIL_CLIENT_PO_SQL, fulfilPushTarget)
- Push target order: (1) the PO's manual Fulfil link (po_links system fulfil, found_by manual), (2) the Fulfil PO whose reference = the HORIZON PO. A manual link is never overwritten by the automatic link refresh. (source: server.mjs :: fulfilPushTarget, resolvePoLinks)
- No create for ANY PO when Fulfil already has a non-cancelled PO whose number = the HORIZON PO or its erp_po, whose reference = one of its refs (sales_order_ref and client_po_ref, split on , ; /), or which is sale-linked (purchase.request chain) to a sales order whose number or reference is one of those refs. The push returns 409 "This PO looks like it already exists in Fulfil (from sales order X). Link it instead of creating a new one." (source: server.mjs :: fulfilExistingCandidates, fulfilPushTarget)
- A push never rewrites the lines of a Fulfil PO generated from a sales order (type dropship, or sales set): refused with 409, change it in Fulfil. A client PO found only by reference is refused when Fulfil has another candidate PO for it (ambiguous: link the right one). A manual link to a cancelled or missing Fulfil PO is refused. (source: server.mjs :: fulfilPushTarget)
- A failed or malformed Fulfil lookup is never treated as "not found": the push stops with 503 and nothing is sent. Every refusal (including lookup failures) logs a sanity row "fulfil:create_refused:<po>" in the App health log. All guard checks run before the dry-run / write. (source: server.mjs :: fulfilStrictSearch, fulfilGuardRefuse, /api/supply/po/:po/cin7-lines)
- Rate limits (v28.231): when Fulfil answers 429 (too many requests) to a READ (GET, search_read, read, search, search_count), HORIZON waits (Retry-After, else 1s, 2s, 4s) and retries up to 3 times. Writes are never retried, since a rate-limited write may still have run. (source: server.mjs :: fulfilFetch)
- Link Fulfil PO: PO grid Fulfil column (every client PO not linked by hand, replacing Update lines / both / date and a reference-only "in sync"), the ERP update popup and the PO drawer Linked records. The picker searches live Fulfil READ ONLY: first the guard's own candidates ("suggested"), then by number, reference, supplier or sales order; it shows number, supplier, state, SO-generated flag, line count, units, last modification and which HORIZON PO already points at it. Choosing one saves po_links fulfil (manual) after checking the id exists and is not cancelled; nothing is written to Fulfil. A linked client PO shows a link badge in the grid (no push). (source: server.mjs :: /api/supply/fulfil/po-search, /api/supply/po/:po/links, /api/supply/fulfil/grid-status; supply/inject.html :: fulfilPoPicker, fillErpFulfil, erpUploadInert)
- Dev only: HZ_FULFIL_WRITE_STUB=1 (ignored on Vercel) makes the PO push run its guard and preflight reads, then return what it would send without any write. (source: server.mjs :: fulfilPushLines)
- Updating a confirmed Fulfil PO: it is set back to draft, its lines are replaced in one write, then it is re-confirmed. States past confirmed cannot be edited. (source: server.mjs :: fulfilPushLines)
- Mirror: fulfil_purchase_orders is refreshed every 6 hours, or by n8n. Drift covers active POs only (PRODUCTION, READY TO SHIP, SHIPPING) and flags: missing from Fulfil, line count difference, or per-SKU qty difference. Price differences are never flagged. A "drift approved" sign-off lapses once the lines change. (source: server.mjs :: fulfil/drift, grid-status)
- ERP date drift: completion vs the Fulfil requested date (Cin7-era date for POs not in Fulfil). It flags when the gap is at least max(3 days, 5% of the days from today to completion). (source: server.mjs :: PO_ROWS_SQL erp_date_pending)
- Compare (Fulfil POs not in HORIZON): open Fulfil POs from product suppliers. A Fulfil PO counts as already in HORIZON when its number or reference matches a HORIZON PO, an erp_po, or a linked po_links ref/id. (source: server.mjs :: fulfilCompareRows)

## Validate sales order (from v28.192)
- Where: SUPPLY > Purchase Orders > Direct to Client > "Validate sales order" drawer. Input = a Fulfil sales order number (SO59854, so59854 or 59854), a Fulfil link (.../sales_order/284762) or the order reference. A link is an exact id; otherwise id, number and exact reference are searched, then a partial reference match; more than one hit lists them to pick. (source: server.mjs :: sovFindSales)
- Lines: every sale.line of type "line". Ship method = sale.line.delivery_mode. Drop ship (dropship) and, from v28.230, Backorder (backorder, shown as "Backorder (buy for warehouse)") are supplier lines: both carry sale.line.supplier and a purchase request, get a supplier card, the supplier picker and the push. Ship / pick_up / make_on_order = from stock or other, shown grey with no supplier. Service products (e.g. SHIPPING) are shown grey and left out of line and unit totals. The Fulfil supplier = sale.line.supplier. (source: server.mjs :: sovAnalyse)
- Supplier choices for a drop-ship line = the active purchase.product_supplier rows of that product, limited to the sale's company when any match. Pre-selected: the current Fulfil supplier, else the only option, else none ("Choose..." with a red !). * = more than one supplier possible. The HORIZON SKU supplier (main_supplier_final) shows as a hint when it differs. Fulfil status: ok (same), differs (pick differs from Fulfil), missing (no Fulfil supplier). (source: server.mjs :: sovAnalyse)
- Summary chips: units and line counts per CURRENTLY picked supplier, plus No supplier and Ship from stock. (source: supply/inject.html :: openSoValDrawer)
- A line cannot be changed when: it is not drop ship or backorder (inter-company drop ship included), the order is done or cancelled, the line has shipped, or its purchase request is already on a purchase order (any PO state). If the request is not yet on a PO and is draft, requested (v28.230) or exception, the request's supplier is changed together with the line, so Fulfil buys from the new supplier. (source: server.mjs :: sovLineBlock, /api/supply/fulfil/sales-order/push-suppliers)
- Fulfilment method (v28.234): each line has a method dropdown, From stock (ship) / Back order (backorder) / Drop ship (dropship), coloured like the client order review. It is locked (🔒 with the reason) for service lines, other methods (pick up, make on order, inter-company drop ship), orders not in draft / quotation / confirmed / processing, shipped lines, and lines whose purchase request is on a PO that is not cancelled (change it on the PO first). Switching to Back order or Drop ship opens the supplier picker; the line is not pushable until a supplier is chosen when the product has suppliers. (source: server.mjs :: sovModeBlock; supply/inject.html :: openSoValDrawer)
  - How it is written: draft / quotation orders get a plain write of sale.line.delivery_mode. Confirmed / processing orders run Fulfil's own Modify wizard (sale.wizard_order_modification, action change_fulfil_strategy), the same as Modify > "Change Fulfil Strategy on Line Item": a plain write there saves the field but leaves the old shipment move and raises no purchase request (verified on the Fulfil sandbox 09-Oct-26). The wizard defaults to "Cancel the Order", so the code always sets the action and checks the wizard opened on the right order. (source: server.mjs :: sovChangeMode)
  - Order of writes when switching to Back order or Drop ship: the chosen supplier is written on the line first, then the method changes, so the purchase request Fulfil raises is for that supplier (requests can be bought into a PO soon after). Read back: method, line supplier and the request's supplier must all match, else the line is reported failed with what Fulfil shows. (source: server.mjs :: sovPushOrder)
  - What Fulfil does (sandbox-verified): the line keeps its id. To Back order / Drop ship: the customer-shipment move is replaced and a purchase request raised. To From stock: the purchase request is cancelled (its PO line too, if any) and the line goes on a NEW customer shipment, which can be merged with the order's other shipment in Fulfil.
  - One result per line (a method change and a supplier change merge; worst result wins). The push history records the method before and after (migration 344; before it, the rows are stored without methods). (source: server.mjs :: sovAudit)
- Push: admin only; needs FULFIL_LIVE_WRITES=true on live Fulfil; one push per order at a time. The server re-reads the order and refuses any line that is blocked, not on the order, or given a supplier not set up on the product. Each change is a write of sale.line.supplier, then every written line is READ BACK; a line only counts as saved when Fulfil shows the new supplier. Every attempt (ok, failed, blocked) is logged in planner.so_supplier_pushes with old and new supplier and the user. (source: server.mjs :: /api/supply/fulfil/sales-order/push-suppliers)
- Many orders at once (v28.194): paste a list (one per line, or separated by commas, spaces or semicolons); each item is an order number, Fulfil link or reference, resolved exactly as for one order. Repeats are dropped (same text, or two items that resolve to the same order: the later one shows as "duplicate"); at most 50 per batch (the rest are listed as not analysed). Orders are read 3 at a time; a busy or failing Fulfil call is retried with back-off before the order is reported as an error. One item keeps the single-order view. (source: server.mjs :: /api/supply/fulfil/sales-order/analyse-batch; supply/inject.html :: openSoValDrawer)
- Batch results: items that did not resolve come first with the reason (not found, ambiguous with the matching orders to pick, duplicate, error). The summary adds up every analysed order: orders, lines and units (service lines left out, as for one order), supplier chips by current pick, No supplier, Ship from stock, and blocked drop-ship lines. Each order is a collapsible section with its ok / differs / missing / blocked counts; orders needing attention (missing or differing supplier, no supplier picked, a failed push) sort first. (source: supply/inject.html :: openSoValDrawer)
- Batch push: "Push all changed" or one order's "Push changed"; one confirm lists every change grouped by order. Orders are pushed one after another, each exactly as a single push (same gate, per-order lock, server re-read, write, read-back, audit row); a failure on one order (busy, not found, Fulfil error, failed line) is shown on that order and the others carry on. (source: server.mjs :: sovPushOrder, /api/supply/fulfil/sales-order/push-batch)

## Supplier portal
- Suppliers submit a completion date and an invoice value. These wait as pending submissions until D&B applies them: completion goes to end_production_overide, invoice to supplier_invoice_total. Carrier and tracking update the shipment immediately when the supplier is the shipment's master (consolidating) supplier; a rider's carrier and tracking wait as a pending submission. Production status applies immediately. (source: server.mjs :: /api/portal/submit, submission/:id/apply)
- Order confirmation stores supplier_confirmed_at/by plus an approved_lines snapshot (SKU to qty), so later changes show as a diff. (source: server.mjs :: /api/portal/submit)
- Line cost, qty and added-SKU changes go to portal_line_costs. D&B accepts them (they update the order-plan line, and the supplier cost becomes final_cost) or rejects them. Only confirmed final_cost feeds PO value. (source: server.mjs :: po-line-accept, po-line-reject)
- Shipment access: a supplier is on a shipment as its master (they supply the master PO: shipments.master_po, else the shipment ref when it is a PO number) or as a rider (one of their POs has that shipment_ref). Both may read and post shipment notes, add charges, see the shipment's tracking and add timeline files. Only the master may change shipment-level fields (Shipping status, ship date, carrier, tracking); setting Shipping moves every PO aboard to SHIPPING. A supplier sees only the shipment charges raised by its own supplier, and may delete only a shipment message written by its own people. (source: server.mjs :: portalShipmentRole, /api/portal/shipment/:ref)
- File access in the portal: a file is served when its PO is the supplier's, or it belongs to the supplier's sample request, product development item (sample versions by the supplier's own development request), or it is a shipment timeline file (attached to a note on that shipment, or uploaded by the supplier) on a shipment the supplier is on. Sharing a shipment never opens another supplier's PO documents. A note may only reference a file the supplier can open. Staff file and DTC routes refuse portal sessions; the portal uses its own /api/portal routes. (source: server.mjs :: portalCanReadAttachment, /api/portal/attachment/:id, staffOnly)
- Sign-in links: valid 24 hours (PORTAL_LINK_HOURS) and single use. Opening the link only shows a "Continue to portal" page; the button redeems it once (atomic), so email scanners cannot use it up. The session lasts 7 days; Sign out deletes it. Link and session tokens (supplier and client portal) are stored only as a SHA-256 hash ('h1:...'), never the raw value, so reading the tables cannot sign anyone in; tokens written raw before v28.210 are still accepted until they expire. Expired links are purged hourly; expired sessions are kept 90 days for the portal activity report (raw ones hashed in place), then purged. (source: server.mjs :: /api/portal/redeem)
- Portal first load (v28.189): completed POs come as light rows (every list field, no lines / documents / costs / detail-only fields); opening one (MANAGE) or a batch order plan fetches the rest first, so what is shown is unchanged. Payment runs made up only of archived POs' milestones (archive cutoff, same as the PO list) are not sent: the Payments headline still includes them and "Show them" loads them. (source: server.mjs :: portalPoIsSlim, portalPaymentsTrim, /api/portal/po-detail)
- Product development with competing suppliers (v28.191): a sample version belongs to the supplier whose development request it was made under; only that supplier can change it, add files to it, or create versions on that request. A supplier's product notes and uploads are tied to its own supplier id, so a competitor on the same item never sees them; a document another supplier uploaded is neither listed nor downloadable; components sampled by another supplier show "another supplier". (source: server.mjs :: portalOwnsProductSample, portalCanReadAttachment)
- Supplier submissions (completion date, invoice value, tracking, production status, confirmation) are checked before anything is saved; if a later step fails after something was saved, the supplier is told exactly what was saved (409) and the caches are refreshed. (source: server.mjs :: /api/portal/submit)
- A supplier can remove a PO document it uploaded itself while it is a draft or was rejected; once sent for approval (or approved) it stays. The document type chosen at upload is stored. (source: server.mjs :: /api/portal/doc-remove, /api/portal/upload)
- Dock & Bay's shipment messages are read per supplier: opening a shipment card marks the notes shown read for that supplier only; other suppliers on the same shipment still see them unread. shipment_notes.read_at still means "a supplier has read it" for Dock & Bay. (source: server.mjs :: /api/portal/shipment-notes-read, shipNoteUnreadSql)
- Portal "Amount due" = final invoice − milestones with a paid date, + credit_amount. It is 0 until a final invoice exists. Amounts show in the supplier's own currency (suppliers.default_currency, USD when unset; v28.190), 2 decimals, unit costs up to 4. (source: supply/portal-view.js :: PAYMENTS tab)

## Client portal pricing, orders, commissions
- Price tiers by market: rt = products.<mkt>_rt (includes tax). ws = ex-tax retail ÷ 2, where ex-tax = RT ÷ 1.2 (UK, EU), ÷ 1.1 (AU) or ÷ 1.0 (US, CA). dist = ws × (1 − discount %), with the discount taken from distributor_offers by market and method (fob, exw or 3pl). If no discount is set, the price falls back to ws. With no tier set, the legacy client_price_lists is used. (source: server.mjs :: cpTierPrice, /api/cp/prices)
- Client orders reject unknown and CLOSED SKUs. Non-whole cartons need explicit acceptance (sample orders are exempt). Samples are priced 0. Stock shows in bands unless exact stock is configured. (source: server.mjs :: /api/cp/order)
- Order review before Fulfil (v28.227): a submitted portal order goes straight to Fulfil as a draft sale only when auto-post applies: the client's "Portal orders" setting (clients.order_review) is Auto post, or it is Inherit and CLIENT ▸ Config "Post portal orders to Fulfil automatically" (cp_auto_push_fulfil) is on. The default is OFF, so orders are held with status 'review' (Awaiting review). Always review beats the global switch. The override is read fresh at submit time. If an auto-post fails, the order shows "Needs push" with the reason. (source: server.mjs :: cpAutoPush, /api/cp/order)
- Order emails (v28.227): one email on submit, to the client user, cc the sales team (cp_sales_team_emails, else cp_ops_emails) plus the client's owner. With cp_client_confirm_email off it goes to the sales team only. A failed auto-post also alerts the sales team. (source: server.mjs :: cpSalesTeam, /api/cp/order)
- Reviewing an order (CLIENT ▸ Orders, v28.227): anyone with CLIENT access can edit an order that is Awaiting review / Needs push: PO, requested date, ship-from, Fulfil carrier and service, internal note (appended to the Fulfil comment), lines (qty, price, add, remove). Flags, cartons, units and totals are recomputed on the server; every edit is written to the order history. Fulfilment per line is From stock (delivery_mode ship), Back order (backorder) or Drop ship (dropship). Back order and drop ship need a supplier from the product's Fulfil suppliers (purchase.product_supplier, the client market's company first): one option is set automatically, several show a dropdown. (source: server.mjs :: /api/client/portal-orders/:id, /fulfil-options)
- Pushing (v28.227): creates a Fulfil DRAFT sale (Confirmed is not wired yet). Blocked while a back order / drop ship line has no supplier, or the order already has a Fulfil draft; partial cartons need explicit acceptance. One push at a time per order. Each line carries delivery_mode and, when not From stock, supplier; the header carries carrier and carrier_service when set. Live writes need FULFIL_LIVE_WRITES=true; dry run returns the payload without writing; HZ_FULFIL_WRITE_STUB=1 fakes the write on the sandbox. A pushed or cancelled order is read-only. (source: server.mjs :: /api/client/portal-orders/:id/push, cpCreateFulfilDraft)
- Commissions are monthly runs per rep group. Rate = the per-order override, else the group default. Commission = commissionable × rate ÷ 100. A credit-note row has commission 0 and carries amount × rate ÷ 100 in credit_adj; net = commission + credit_adj. Fulfil rows come from done/processing sales in the month using the untaxed amount; they are "exception" until the invoice is paid. A run cannot be finalised while exceptions remain (unless forced). The Xero bill is GBP, in the UK org, named COMMISSION-<month>-<GROUP>. (source: server.mjs :: /api/client/commission/*)
- Link Fulfil PO (v28.207): the PO grid payload carries fulfil_link_needed (client PO with no manual Fulfil link, FULFIL_LINK_NEEDED_SQL), which raises the "Link Fulfil PO" PO action; see the actions topic. (source: server.mjs :: PO_ROWS_SQL)
- Order visibility and rep groups (v28.204): a client's orders are the Fulfil sales mirror rows matching ANY of its ticked modes: Agent Code (the Fulfil sales order metafield "Agent Code", code agent_code, copied by the sales import into fulfil_sales.agent_code; the client lists one or more codes, e.g. appelman), tag (sale metadata, legacy), channel + region, company / email. A user with scope 'self' ("own customers only") is NARROWED to orders where they are the customer email and the portal orders they placed, except when the client has an Agent Code: then every user of that rep group sees all the group's orders (Ben 07-Oct-26). Commission runs pick a rep group's orders through the same rule, so they follow the Agent Code too. (source: server.mjs :: cpVisibilitySql, cpAgentCodes, cpSelfNarrows, cpOrders, fulfilImportSales)
- Order messages and documents (v28.200): one thread per client and order, keyed F<fulfil_id> (Fulfil sales mirror) or P<portal order id>; a portal submission's thread follows it into the mirror once its Fulfil number appears there. Documents are the thread's message attachments. A portal user may open an order's thread only if the order is visible to their client under the My orders rules; a scope 'self' user only for their OWN orders (mirror rows with their email as party email, portal orders they placed), except in a rep group with an Agent Code, whose users open every order of the group. Another client, or a non-own order for a 'self' user, gets 403. Staff can post internal messages or documents that the client never sees, counts or downloads. Unread counts (My orders, Messages, nav badge) all come from one thread list, so they agree. An order visible to two clients has two separate conversations. (source: server.mjs :: cpAllowedOrderKeys, cpPortalThreads, cpOrderThreadFind, cpOrderClients)

## Samples and barcodes (number-producing parts only)
- An accepted supplier charge (sample or shipment) becomes one Other payment = freight + product cost. The Payments Report Xero download splits a sample charge evenly across the sample's purposes, using sample_purpose_accounts. (source: server.mjs :: charge/:id/accept, payments-report _sampleSplit)
- Workshop barcodes come from a fixed pool of GS1 EAN-13s (free, assigned or used). The catalogue PDF prints a barcode only when the check digit is valid; a 12-digit code gets a leading 0. (source: server.mjs :: workshop-barcodes, _ean13Bits)

## Common questions
**Q:** Why did this PO's delivery date change when nobody edited the PO? **A:** A shipment's dates override the PO's. Once the PO sits on a shipment, the shipment's delivery, arrival or landing date (or Flexport's) replaces the calculated production end + 7 + branch transit. On the admin grid, riders also take the shipment master PO's dates (badge S).
**Q:** Why is the completion payment larger than the supplier's completion %? **A:** The start deposit drawn from a deposit ref is capped at what the ref has left. Any shortfall moves into completion, shown as catch-up. Completion is also capped so the total never goes above value + credit − balances already set.
**Q:** Why does a PO show no deposit and all balance? **A:** POs that are not complete with a value under 500 get 0% start and 0% completion, so 100% falls into the balance. The exception is a PO with a start or completion % override.
**Q:** Why is an AU payment coded to 620.00 AU and not the production account? **A:** In the Payments Report, AU is one account across all periods. The rule fires when the PO's country (or branch country) is AU, or when its funding deposit's country is AU. Posting is a separate step: completions and balances settle from 602.1 (P58+ and AU) or the production account (pre-P58); cross-org AU lines go through the 901 loan.
**Q:** Why does the buy plan count units that haven't shipped yet? **A:** On order counts the same as shipped. An open PO to a UK, US, EU, AU or CA destination that is not yet in the inbound feed lands at production end + 7 + branch sea transit. Once n8n lists it in inbound_shipments, the feed row replaces it.
**Q:** Why did a PO's Xero bill change by itself? **A:** Its linked bill was voided in Xero and the PO had exactly one live bill of the same supplier, so HORIZON relinked it (Linked records shows "auto-relinked: previous bill voided"; the note keeps the old bill). With no or several candidates it asks you to choose instead.
**Q:** Why doesn't the Fulfil drift badge flag a price difference? **A:** Drift checks line count and per-SKU quantity only, and only for PRODUCTION, READY TO SHIP and SHIPPING POs. Prices still go to Fulfil when a push runs.

## Flexport booking named by Fulfil IS (v28.223, SUG-0042)
- A Flexport booking lodged from a PO is named by the Fulfil internal shipment (IS) number(s) of every PO on that shipment (master plus consolidated riders), read live from Fulfil stock.shipment.internal where reference = PO, newest first, cancelled ignored; several are joined "IS288 / IS377". Every PO on the shipment goes in the booking's Purchase Order tags. No IS found or Fulfil unavailable: named by the PO number, with a note in the preview. (source: buildFlexportBookingBody)
- On lodging, each PO's IS number is saved (purchase_orders.fulfil_is_number, migration 339). The Flexport import then links an IS-named Flexport shipment to every PO carrying that IS (sets flexport_reference) where the PO has no Flexport link yet, so ETAs and costs keep flowing. (source: server.mjs :: booking-submit, runFlexportImport)

## COGS per unit for Airtable (v28.235)
- Where: BUY & MOVE > Inventory > COGS. Analyse previews, Download CSV gives the exact file, Email to Airtable sends it (admin). Columns and order match the Airtable cogs-up import: UK ILG, AU Coghlans, CA Propack, US Geneva, EU iFulfillment, AU FBA, CA FBA, UK FBA, US FBA, EU FBA. (source: server.mjs :: COGS_COLS)
- Source: LIVE Fulfil "Inventory Valuation" (inventory.valuation.report, generate, by product, per warehouse) for the UK company (GBP: UKILG, USGENEVA_STD, EUIFUL) and the AU company (AUD: AUCOGHLANS, AMZ_FBA_AU). Unit cost per warehouse = Fulfil's own costing (it differs by warehouse). (source: cogsValuation)
- Currency: converted from the company currency to the column currency at Fulfil's current rates (GBP base: 1 GBP = rate). US Geneva = USD, EU iFulfillment = EUR, AU columns stay AUD, UK ILG stays GBP. (source: cogsRates)
- Rule per SKU per column (Ben 09-Oct-26):
  1. Stock on hand in Fulfil with a unit cost > 0: the Fulfil value, which replaces the stored one.
  2. Otherwise (sold out: Fulfil values it at 0): the LAST STORED value is kept, never overwritten.
  3. Never valued (nothing stored): supplier cost (planner.products.cost, USD) converted to the column currency. Stored once sent, so it becomes the last known value until Fulfil values the SKU.
- FBA columns (v28.240, Ben): UK FBA = AMZ_FBA_UK (GBP), US FBA = AMZ_FBA_US (USD; AWD and Geneva FBA prep are separate pools, not included), EU FBA = quantity-weighted across AMZ_FBA_DE, FR, IT, ES, PL, NL, SE, BE and IE (EUR), all from the UK company. CA Propack and CA FBA (decommissioned) are kept only (sets still recomputed from kept components).
- SKUs = everything stored plus Fulfil products that exist in planner.products (Fulfil test items and packaging codes are left out). Airtable's email sync replaces the table, so every SKU is sent every time.
- Analyse writes nothing. Email rebuilds on the server, sends (Resend, attachment cogs-up-IMPORT.csv, to COGS_AIRTABLE_EMAIL) and only then stores values (planner.cogs_values) and logs the run (planner.cogs_uploads, migration 345). A missing warehouse in the Fulfil report blocks the send. Load baseline CSV seeds the stored values from an Airtable export (fills only empty cells). (source: cogsStore, /api/supply/cogs/email, /api/supply/cogs/import-baseline)
- Review flags: moves over 25% vs the stored value are shown red (often a Fulfil costing oddity worth checking before sending).
- Sets / bundles (v28.236): every build-on-the-fly set in planner.set_bom (one level, 311 sets) is costed per column as the sum of its components' values in that column × quantity, using each component's own resolved value (Fulfil, kept or supplier cost). Components are worked out first. If any component has no value in that column, the set falls back to the normal rules (kept, else supplier cost) and the cell lists the missing components. Set values are stored with source set_bom when sent. Set component SKUs are included even if nothing was stored for them. (source: cogsBuild)
- Filters (v28.236): category (products.category_name_final, else category), status (products.status), search on SKU or product name, and quick filters All / Changed / Big moves / Sets / Supplier cost / Has blanks. History opens in its own modal.
- Persistence (v28.238): every Analyse saves its full result (planner.cogs_analysis, newest row only, migration 345). Opening the tab shows that saved result with "Analysed <date time> by <user>" until the next Analyse. Times are London time. (source: /api/supply/cogs/last, /api/supply/cogs/analyse)
