---
topic: connect
title: Connect (Gmail add-on and Chrome side panel)
covers: HORIZON side of the Connect app: signed assertions from Connect, who may use Connect (CONFIG > Permissions "Connect"), the resolve / search / lookup routes and what each card shows (PO, Fulfil order and tracking, SKU stock, client), the Fulfil live read with the fulfil_sales fallback, identity revoke / restore (sign-out of suspended Google Workspace users)
sources:
  - server.mjs :: connectVerify, connectAccess, identityBlocked, connectColExpr, connectRoute, connectAudit, connectBase
  - server.mjs :: connectPoCard, connectPoRows, connectSkuCard, connectSkuRows, connectStockSub
  - server.mjs :: connectOrderSales, connectOrderCard, connectOrderFromSale, connectOrderFromMirror, connectFulfilShipments
  - server.mjs :: connectPartyByEmail, connectClientCard
  - server.mjs :: /api/connect/resolve, /api/connect/search, /api/connect/lookup
  - server.mjs :: connectIdentity, /api/identity/revoke, /api/identity/restore
  - server.mjs :: mcpAccess (Claude connector honours the block)
  - migrations/387_connect.sql :: planner.identity_blocks, planner.identity_events, app_permissions.connect_access
verified_version: v28.489
fingerprints:
  server.mjs::connectVerify: ed0b696fae5a
  server.mjs::connectAccess: d272750cfad4
  server.mjs::identityBlocked: d6a883caff38
  server.mjs::connectColExpr: fca7dd7efcff
  server.mjs::connectRoute: 424ff2ad20d7
  server.mjs::connectAudit: fbfd65394dd5
  server.mjs::connectBase: a8d4965b9d93
  server.mjs::connectPoCard: 8cc5eb2c9861
  server.mjs::connectPoRows: 4013a985cc1c
  server.mjs::connectSkuCard: 474f9aa7ad75
  server.mjs::connectSkuRows: 7bd21d67545a
  server.mjs::connectStockSub: 85a6d9f25464
  server.mjs::connectOrderSales: ab67dd9be7a0
  server.mjs::connectOrderCard: 6ae0f709b1c0
  server.mjs::connectOrderFromSale: 007539e934c7
  server.mjs::connectOrderFromMirror: aeeab34b6571
  server.mjs::connectFulfilShipments: ffa639757a48
  server.mjs::connectPartyByEmail: 6a39903c22aa
  server.mjs::connectClientCard: 368c0adefc65
  server.mjs::/api/connect/resolve: e3d434bcf950
  server.mjs::/api/connect/search: 7f62d998f2fb
  server.mjs::/api/connect/lookup: 42068be10bbd
  server.mjs::connectIdentity: a43200abf591
  server.mjs::/api/identity/revoke: d2c45371929b
  server.mjs::/api/identity/restore: 74496260447d
  server.mjs::mcpAccess: 6fa73a2097c0
  migrations/387_connect.sql::planner.identity_blocks: f68b1e47bbec
  migrations/387_connect.sql::planner.identity_events: f68b1e47bbec
  migrations/387_connect.sql::app_permissions.connect_access: f68b1e47bbec
---

## What Connect is (from v28.483)
- Connect is a separate Dock & Bay app (Gmail add-on and Chrome side panel). It holds no business data: it asks HORIZON for answers server to server, and HORIZON applies the asking person's own access. Text from emails or pages never reaches HORIZON, only reference tokens (PO numbers, order numbers, SKU candidates, the sender's email). (source: server.mjs :: /api/connect/resolve)
- Every Connect call is logged in planner.mcp_audit with client_id "connect" and tool connect.resolve, connect.search or connect.lookup, so it shows in the connector use list under CONFIG > Admin > Permissions. (source: server.mjs :: connectAudit, connectRoute)

## Who is asking: the signed assertion
- Connect sends "Authorization: Connect v1.<payload>.<signature>". The signature is HMAC-SHA256 over "v1.<payload>" with CONNECT_SHARED_SECRET (at least 32 characters, the same value in Connect and HORIZON). A plain email header is never trusted. (source: server.mjs :: connectVerify)
- Refused with 401 bad_assertion when: the header is missing or not the Connect scheme, the signature is wrong, aud is not "horizon", it expired (exp plus 5 seconds of clock skew), it was issued more than 5 seconds in the future, it lives longer than 60 seconds, the email does not end @dockandbay.com, act does not match the route (lookup for /api/connect/*, revoke or restore for /api/identity/*), or the request id (jti) was already used. (source: server.mjs :: connectVerify)
- Replay check: used request ids are kept in memory for the token lifetime plus skew, and at least 65 seconds. It is per server instance. (source: server.mjs :: connectVerify)
- Without CONNECT_SHARED_SECRET every route answers 503 not_configured. (source: server.mjs :: connectRoute, connectIdentity)

## Who may use Connect
- Refused with 403 no_access unless: the person is a super admin, or is ticked under "Connect" in CONFIG > Admin > Permissions (app_permissions.connect_access). Unticking refuses their next request. (source: server.mjs :: connectAccess)
- Anyone signed out by Connect's identity revoke is refused, super admins included, even with the tick. (source: server.mjs :: connectAccess, identityBlocked)
- Order and client data (from Fulfil) also need HORIZON's CLIENT grant (client_access, or admin; super admins always), the same grant as the CLIENT tab (v28.484, Ben 25-Oct-26). Without it: lookup of kind order or client answers 403 no_access, search leaves out order and client hits, and resolve returns no orders and client null. PO and SKU data need only the Connect tick. ACCOUNTS and COMMISSIONS grants do not apply (the cards hold no ACCOUNTS or commission data). (source: server.mjs :: connectAccess, /api/connect/lookup, /api/connect/search, /api/connect/resolve)

## Resolve, search and lookup (all read only)
- Resolve takes up to 50 each of PO numbers, order numbers and SKU candidates, plus one client email, and returns only the real ones with a label. PO label: PO, supplier, status. Order label: order number, client, state. SKU label: product name. Client: the Fulfil party, or null when the email is not a Fulfil contact. (source: server.mjs :: /api/connect/resolve)
- Search (at least 2 characters, default 10 hits, at most 25) looks in HORIZON POs (PO number or client PO reference; open POs before complete), HORIZON products (SKU or product name; in planning scope first; the hit shows free stock per warehouse), Fulfil orders (number or reference, newest first) and Fulfil clients (party name, 3 or more characters). Exact matches come first, then POs, orders, SKUs, clients. (source: server.mjs :: /api/connect/search)
- PO card: supplier and status from purchase_orders; ex-factory = the Flexport departure date (v_po_finance flex_departure: the Flexport actual departure, else the estimated departure, from the Flexport API import or the legacy Flexport table, matched to the PO by Flexport reference, PO number or shipment ref), else the factory production end (v_po_finance eff_prod_end: the production end override, else production start + supplier production days) (v28.484, Ben 25-Oct-26); ETA = the canonical delivery date (v_po_finance eff_delivery); the shipment (shipment ref, raw shipment status, ETA) when the PO has one; line count and units from v_purchase_order_lines. (source: server.mjs :: connectPoCard)
- PO payment: owed = PO value used + credit_amount. Paid = start deposit paid (v_po_finance start_paid, which includes the deposit draw) + completion assigned + balance payments 1 and 2 + balance payments 3 onward (po_balance_payments). paidPct = paid / owed, rounded, 0 to 100. State: "Paid in full" at 100%, "Part paid" when any completion or balance payment exists, "Deposit paid" when only the deposit is paid, else "Not paid"; null when the PO has no value. (source: server.mjs :: connectPoCard)
- SKU card: free stock per warehouse UK, US, AU, EU = products.inventory_<market>_3pl (the ERP available quantity; on hand is the separate _3pl_onhand column). Next inbound = the open inbound_shipments leg (quantity minus received above 0, with a date) arriving soonest from today; only when none is dated today or later, the oldest overdue one. It shows the PO, warehouse, open quantity and ETA. (source: server.mjs :: connectSkuCard)
- Order card: read live from Fulfil sale.sale by order number or customer reference, all channels including DTC (Shopify) and Amazon: number, reference, channel, client (party id and name), ordered date, state, and each customer shipment with its state, carrier and every tracking number. Fulfil keeps one tracking record per package (shipment.tracking with origin stock.package), so each package's code is listed; the shipment's own tracking number is added when not already there. (source: server.mjs :: connectOrderCard, connectFulfilShipments)
- Client card: Fulfil party by id, or by contact email (party.contact_mechanism of type email, active). Shows the name, the first email, and the 5 newest numbered sales orders with date and state. (source: server.mjs :: connectClientCard, connectPartyByEmail)
- Fallback: when Fulfil cannot be read (not configured, down or erroring), order, client and search answers come from planner.fulfil_sales, the wholesale mirror filled by the client portal order import. It holds wholesale channels only, so a DTC order is then not found. The client ref is then the party email (else name). (source: server.mjs :: connectOrderSales, connectClientCard, connectPartyByEmail)
- Fulfil is only read (search_read); Connect never writes to Fulfil. On the sandbox it reads whichever Fulfil the CONFIG Sandbox/Live switch points at; production always reads live Fulfil. (source: server.mjs :: fulfilRead)
- Fulfil states are shown in words: Draft, Quotation, Confirmed, Processing, Done, Cancelled for orders; Draft, Waiting, Assigned, Picked, Packed, Done, Cancelled for shipments. (source: server.mjs :: connectOrderFromSale)
- Links: horizonUrl opens the PO (#/supply/purchase-orders/<PO>), the order drawer in CLIENT > Orders (#/client/orders/F<Fulfil id>), CLIENT > Clients for a client, and SUPPLY > Purchase Orders for a SKU (there is no SKU page yet). fulfilUrl opens the sale or party in Fulfil. (source: server.mjs :: connectPoCard, connectOrderFromSale, connectClientCard, connectSkuCard)

## Identity: sign-out of suspended people
- Connect's watcher calls POST /api/identity/revoke when someone is suspended or deleted in Google Workspace, and POST /api/identity/restore when they are active again. The person is the assertion's email; the body is informational only. (source: server.mjs :: connectIdentity)
- Claude connector access (v28.489, Ben 26-Oct-26): every @dockandbay.com account may connect, read only, with no Permissions tick, including people with no app_permissions row. ACCOUNTS and COMMISSIONS data still need those grants (no row = neither). Suspended people (identity block) are refused. The old "Claude connector" Permissions column is gone; app_permissions.mcp_access is no longer read.
  (source: server.mjs :: mcpAccess)
- Revoke deletes all the person's Claude connector tokens (planner.mcp_tokens) and writes a block row (planner.identity_blocks). While blocked, Connect routes and the Claude connector refuse them. It does not untick any permission. (source: server.mjs :: connectIdentity, mcpAccess)
- Restore deletes the block row only. Permissions stay as they are (never re-ticked); deleted connector tokens stay deleted, so the person connects Claude again. (source: server.mjs :: connectIdentity)
- Both are idempotent (a repeat answers ok), and every call is written to planner.identity_events (email, revoke or restore, ok, detail). (source: server.mjs :: connectIdentity)
- Not covered here: HORIZON's main staff login is the production harness's (Diviyaj); ending those sessions on revoke needs his change. (source: server.mjs :: connectIdentity)

## Common questions
- "Why does Connect say I have no access?" Ask an admin to tick Connect for you in CONFIG > Admin > Permissions (order and client cards also need CLIENT), or you were signed out by Connect after a Google Workspace suspension.
- "Why is a Shopify order missing in Connect?" Fulfil could not be read at that moment and the fallback mirror only holds wholesale orders. Try again; if it persists, check the Fulfil connection.
- "Is Connect's free stock the same as on hand?" No: it is the ERP available quantity (inventory_<market>_3pl), net of allocations.
