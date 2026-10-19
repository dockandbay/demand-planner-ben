# HORIZON deploy: v28.398 to v28.403

**AT A GLANCE:**
- Branch `review-fixes-2026-10-05`, HEAD `9b96a1bd` (`9b96a1bdcde8c6d4f44cde1c705af54a7eba85b5`) = v28.403.
- Live checked 19-Oct-26 (`/api/version`): **v28.397**. This package follows straight on.
- **No migrations.** No new env vars. No dependency changes.
- **No new `/api/cron/*` or other secret-only routes:** nothing to add to the login-gate exemption list.
- **Files:** `server.mjs`, `artifact_v16.7.html`, `package.json`, `CHANGES.md`, `lib/ai-logic/*.md`.

## 1. Migrations
None.

## 2. Data steps on live
- **None manual.**
- **Flexport dates (v28.399)** refresh on the next Flexport sync, which re-imports every shipment.

## 3. Please look at

### 3.1 Push journal to Xero: a NEW Xero write path (v28.400 to v28.402)
- **Where:** 3PL invoicing, in the cross-month reclass box. A new "Push journal to Xero UK / AU" button sits next to the CSV download.
- **Route:** the existing `POST /api/supply/tpl/journal/:id`.
  - `{ dry: true }` returns the journals; no Xero write.
  - `{ push: true }` creates them.
  - Admin or ACCOUNTS only (same as the 3PL bill).
- **What it writes:** `PUT/POST ManualJournals` in **Xero UK** (ILG, Geneva, iFulfilment) or **Xero AU** (Coghlans). Per month the cost is moved into, it writes the original and its reversal, both POSTED, in the format the accountants already post by hand:
  - **UK:** narration "3PL UK 2026-09 reclass to 2026-07"; cost accounts debited, described "Reclass <ym> orders out of <period>"; one 805 Accruals credit; dated the order month's last day. The reversal ("Reversal: …") is dated the invoice month's last day. NoTax (NONE).
  - **AU (Coghlans):** narration "Coghlan: Monthly adjustment"; every line, including 805, described "Appropriation of <Mon>-<yyyy> costs". The reversal is dated the 1st of the next month. BAS Excluded, shown on cash basis. One journal per month, adding up all of that month's weekly Coghlans invoices.
- **Reads before writing:**
  - **EU / US:** reads the invoice's own Xero bill (`Invoices?where=InvoiceNumber=="FULFILLMENT-<region>-<month end>"`) for its CurrencyRate. Journals are in GBP; if the bill is missing, it refuses.
  - **Duplicates:** checks `ManualJournals?where=Narration==...` and refuses if one already exists (AU also matches the date and the old "Coughlin" spelling).
- **Xero calls:** about 2 to 4 per push, from the shared daily allowance.
- **Checked offline:** the builder recreates the hand-posted UK Sep-26 journals and the AU Sep-26 journal exactly. Nothing was posted from the sandbox.

### 3.2 FBA transfers round UP to whole cartons (v28.403): buy-affecting, approved by Ben
- **Before:** the normal 3PL to FBA transfer rounded down. For example, HAIRW-WAF-BOHMDRM UK needed 58 with a carton of 60, and recommended 0 under Full and 58 under Any.
- **Now:** cartons = min(ceil(capped need / carton), max(1, ceil(90-day FBA demand / carton)), floor(website-protection cap / carton)). It is still 0 when 90-day FBA demand is under 70% of a carton.
- **Non-GRS:** cartons = min(ceil(need / carton), floor(pool / carton)).
- **Sandbox buy plan before vs after** (all markets, shown to Ben, who said "ship it"):
  - FBA transfers: 3,098 to 6,672 (+3,574; 46 SKU-markets newly get one carton).
  - Buy 3PL: +130.
  - Urgent and Buy FBA: unchanged.
  - Future-month buys: +6,810 (largest: HAIRW-SUM-UNICN-NB UK +2,340, HAIRW-CAB-NAVY-NB UK +2,160).
  - **Expect a similar shift on live.**

### 3.3 Flexport arrival date (v28.399)
- **The bug:** the Flexport import stored Flexport's PORT arrival in both landing and arrival, so a later delivery date never reached HORIZON once the ship docked. Example: PO-56AUWK1 showed 10-Oct; Flexport says delivery 21-Oct.
- **Now:**
  - landing = port arrival (actual, else estimated)
  - arrival = delivered in full (actual, else estimated), else the port arrival
- **Effect:**
  - shipment Arrival, and Completion = arrival + 7
  - PO delivery dates where they come from Flexport
  - the "ETA passed, not arrived" flag
- **Sandbox check:** 23 current shipments move 3 to 11 days later. The sandbox buy plan was identical before and after.

## 4. Schedules (n8n)
No changes.

## 5. Env
No new variables.

## 6. Behaviour changes to know
- **v28.398, 3PL Push actuals:**
  - shows progress ("x of y references, about n min left")
  - one push per invoice at a time (a second click shows the progress)
  - carries on across pages
  - a notice when it finishes
  - Display only (Rita's "Loading" that never went away).
- **v28.399:** Flexport arrival = delivery (above).
- **v28.400 to v28.402:** Push journal to Xero (above).
- **v28.403:** FBA transfers round up to whole cartons (above).

**New routes:** none. The journal route only gains `dry` / `push` body options.

---

## Separate request (not in this package): IS numbers in the 3PL shipments table

Hi Diviyaj, a request for the 3PL invoicing shipments table (`planner.tpl_fulfil_shipments`):

Please also include Fulfil **INTERNAL shipments** (`stock.shipment.internal`, the IS numbers), not just customer shipments. 3PL invoices (for example Coghlans) bill goods-out lines against IS numbers. Today those don't match anything, so HORIZON books them to "Other".

**Example:** IS224 = Coghlan's - Storage Zone to Amazon FBA - AU - Storage Zone, reference FBA15GJFKWDL, shipped 30-Sep-26. 7 lines on that week's Coghlans invoice (A$178.13) went to Other.

**Fields needed per IS:**
- shipment_number (IS224)
- reference (FBA...)
- from_location
- to_location (name or id)
- ship / effective date
- company
- state

With to_location, HORIZON can sort them, the same as the old Cin7 FBA* / TRF* rules:
- an Amazon FBA location = that region's Amazon cost centre
- another of our warehouses = a branch transfer (Other Costs)

Thanks!
