# BUILD BRIEF: Amazon fees journal + month-end close checklist (11-Nov-26)

Brief as given by Ben 11-Nov-26 (pasted from the Fulfil/Xero thread); decisions and findings from the HORIZON thread are at the end.

## Goal
Make the Fulfil data accurate enough that manual journals (e.g. the Sellerboard "align Amazon sales with seller dashboard" accruals) are no longer
needed. From Oct-26 Fulfil carries Amazon revenue (per order, on shipment) and COGS (per shipment); the remaining gap is Amazon fees.
Related: BUILD_NOTE_sales_journal_consolidated_only_2026-11-11.md, docs/specs/cogs-channel-allocation.md.

## 1. Amazon fees journal
- Source: SP-API Finances (financialEventGroups + financialEvents per group) per region (EU, NA, FE).
- Cut-off: order-level fees (referral, FBA per unit, refund commission) go to the month the Fulfil order shipped (by AmazonOrderId); build on the
  10th, refresh on the 15th; fees with no Fulfil order use the posted-date month, flagged. Storage / long-term storage: the month they relate to.
  Removal / disposal / placement: posted-date month. After the 15th refresh for a closed month: next month, flagged.
- Mapping (one editable table in lib/ai-logic):
  - Principal / shipping / gift wrap / tax collected: not journalled (Fulfil has the sale); used for the reconciliation check only.
  - Referral / commission / variable closing / refund commission -> Seller's Fees: UK org 301 UK, 307 US, 345 EU, 346 CA; AU org 405.5.
  - FBA per-unit fulfilment -> Fulfilment - <mkt> - Amazon: UK org 1000.80 UK, 303.27 US, 303.41 CA, 1000.79 DE, 1000.81 FR, 1000.78 IT, 1000.82 ES; AU 427.1.
  - Storage, long-term storage, removal, disposal, inbound placement / transport -> Storage Fees: UK org 340 UK, 341 US, 342 EU, 343 CA; AU 430.2.
  - Advertising deducted from settlements -> Marketing - Amazon PPC: UK org 510 UK, 511 US, 512 CA, 513 EU; AU 496.
  - Refunds: revenue via Fulfil credit notes (check they exist; flag if not); refund commission -> Seller's Fees.
  - Reimbursements (lost / damaged FBA stock) -> Inventory Loss (decided below).
  - Reserves held / released -> UK 640 Amazon Reserved Balances / AU 620.1 Amazon Funds Withheld (651 Amazon Control Account: no new postings).
  - Unmapped -> flag, journal stays DRAFT.
- Journal: one per org per month, "HORIZON AMAZON FEES <org> YYYY-MM", Dr fee / cost accounts, Cr the matching Clearing - xx - Amazon
  (UK org: 9044 UK, 9059 US, 9060 CA, 9061 DE, 9065 FR, 9066 IT, 9067 ES; AU org: 9059 Clearing - AU - Amazon). Same create / review / post flow
  and replace-not-top-up rule as the COGS / SALES journals; emails Pooja + Harry (UK), Alex (AU).
- Check after build: per marketplace, Clearing - xx - Amazon at month end = payouts in transit / reserve only (Fulfil Amazon receivable + fees journal
  - payouts = 0 within 1%); residual shown per marketplace.
- Start month Oct-26.

## 2. Month-end close checklist (per org and month, read only)
1. Fulfil clearing accounts zero after the journals (9002 / 9003 / 9005, 9006; 9011 explained).
2. Consolidated invoices paid to 812 Deferred Revenue (n8n YVwZPRTU3wHywYK8): unpaid count, exceptions.
3. One-by-one Fulfil invoices missing from Xero (3+ days, no TEMP-SO) and open TEMP-SO stand-ins.
4. Amazon clearing accounts zero after the fees journal (per marketplace).
5. Inventory Loss (9009) for the month by location and count, large lines listed.
6. Other Fulfil accounts that should be zero (Cost Price Counterpart, Forex Write-Off, Write-Off).
7. Journals for the month created / posted / emailed (COGS, SALES, AMAZON FEES).
8. Manual journals for review (information): every non-HORIZON, non-"Journal Entry Summary" manual journal in the month touching sales (200-212),
   COGS (311.x, 401.x), Seller's Fees, Storage, Fulfilment or Fulfil clearing (9002-9011), with narration, amount, link.

## Decisions (Ben 11-Nov-26, HORIZON thread)
- FBA reimbursements -> Inventory Loss.
- UK VAT on Amazon UK fees -> from Amazon's monthly VAT invoice total (fees net, VAT from the invoice).
- PPC is taken out of the settlements -> book it from the settlement data by spend period (Marketing - Amazon PPC).
- UK, US, CA and AU payouts are booked to the Clearing - xx - Amazon accounts in Xero by hand (only EU has a flow, n8n J0MDixBTdxTNYXaU).

## Findings (HORIZON thread 11-Nov-26)
- SP-API access exists for all regions: n8n "Amazon SP-API | 00 Core request" (SSnR2GGAwMyIbdlw, active) holds LWA credentials EU, NA and AU (FE).
  "Amazon SP-API | 05 Finances & fees" (MTShasLtl2VO13aF) exists, inactive.
- HORIZON reaches SP-API only through the n8n proxy "Horizon | Amazon SP-API inbound proxy" (UNFJuF5ekAa4deQo, webhook horizon-spapi-inbound),
  which allows only the FBA inbound paths. The fees journal needs the read-only GET /finances/v0/financialEventGroups and
  /finances/v0/financialEventGroups/{id}/financialEvents paths added to that allow-list (or a separate read-only finances proxy flow).
- That proxy flow holds the n8n webhook secret as a literal (security review finding 42).
- 11-Nov-26 (Ben chose a separate read-only flow): n8n "Horizon | Amazon SP-API finances (READ ONLY)" NfaZOJnBlRTn6Tap, ACTIVE, webhook
  /webhook/horizon-spapi-finances, tags Horizon + Amazon. Allows only GET /finances/v0/financialEventGroups, /financialEventGroups/{id}/financialEvents
  and /finances/v0/(orders/{id}/)financialEvents; regions EU, NA, AU; calls 00 Core request. Tested: EU groups Oct-26 returned (10), a POST is refused 403.
  The FBA inbound proxy UNFJuF5ekAa4deQo was not changed.
