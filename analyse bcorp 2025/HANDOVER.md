# Handover: B Corp 2025 imports vs sales reconciliation

**Prepared by:** Ben, Dock & Bay
**Date:** 16 September 2026
**Status:** Analysis complete. One follow-up outstanding (Josh's sales source).

---

## 1. The question

Josh asked us to sanity-check a headline claim for the B Corp 2025 report:

> "The import total is 1,154,344 pieces, and the sales is 1,584,777, we sold 430,433 pieces more than imported. Does that sound correct?"

## 2. Answer (short version)

- **Imports: confirmed.** ~1,154,372 pieces, matches Josh's figure to within 28 (rounding).
- **Sales: does not reconcile.** The actual order data totals **1,139,246 pieces** across every channel (including Direct to Client). That is **445,531 below** Josh's 1,584,777.
- **Direction is wrong.** On the real data, imports and sales are essentially level: we **imported ~15,126 more than we sold** (a 1.3% net stock build), rather than selling 430k more than we imported.
- **Conclusion:** the import side is right, but the quoted sales figure of 1,584,777 is overstated by roughly 445,500 and could not be reproduced from any sheet in the reports. Need Josh's working to find the gap.

## 3. The numbers

| Measure | Pieces | Source |
|---|---|---|
| Imports | 1,154,372 | IMPORT report, `PO_ALL` sheet, column T (Qty), 3,010 PO lines |
| Sales, regional month tabs | 1,027,987 | 4 regional SALES files, tabs 01-12, column Q (lineItems qty) |
| Sales, Direct to Client | 111,259 | DTC report, `DTC` tab (83 factory-direct bulk orders, no overlap) |
| **Sales, total** | **1,139,246** | |
| **Net (imported − sold)** | **+15,126** | ~1.3% of imports |

Sales by channel (full year): Shopify DTC 549,572 (48%), Shopify wholesale 276,727 (24%), Amazon all marketplaces 228,936 (20%), Direct to client & distributor 81,787 (7%), untagged 2,224 (0.2%).

## 4. How each figure was measured

- **Imports** = sum of column T ("Qty", pieces) on the `PO_ALL` sheet in the import report. This is the line-by-line purchase order log and already includes direct-to-client POs.
- **Sales** = sum of the `lineItems » qty` column across the monthly tabs (01-12) of the four regional sales reports, plus the `DTC` tab in the Direct to Client report. `order size` and `lineItems » qty` agree row for row, so no double counting. DTC order IDs were checked against the month tabs: **zero overlap**, so DTC is genuinely additive.
- One sold unit = one piece. SKU data has no pack-size multiplier, so there is no unit-to-piece conversion that would inflate sales toward 1,584,777.

## 5. Data sources (files in this folder)

| File | Key sheet | Notes |
|---|---|---|
| `Bcorp 2025 IMPORT Report - for Josh & Andy (1).xlsx` | `PO_ALL` | Imports. Pieces in col T. |
| `Bcorp 2025 SALES Report for UK_EU H1 (with post code).xlsx` | tabs 01-06 | Shopify + Amazon, UK/EU, Jan-Jun |
| `Bcorp 2025 SALES Report for UK_EU H2 (with post code).xlsx` | tabs 07-12 | Shopify + Amazon, UK/EU, Jul-Dec |
| `Bcorp 2025 SALES Report for US_AU_CA H1 (with post code).xlsx` | tabs 01-06 | Shopify + Amazon, US/AU/CA, Jan-Jun |
| `Bcorp 2025 SALES Report for US_AU_CA H2 (with post code).xlsx` | tabs 07-12 | Shopify + Amazon, US/AU/CA, Jul-Dec |
| `Bcorp 2025 SALES Report for Direct to Client.xlsx` | `DTC` | Factory-direct / distributor bulk orders. Also in Google Sheets (below). |

Google Sheets copy of the DTC report (owner ben@dockandbay.com):
https://docs.google.com/spreadsheets/d/15Dcmht6WhGuZoJLOp9R52eUx0UpNFj26d7SZOGcw_aM/edit

## 6. Deliverables produced

- **`Bcorp 2025 - Imports vs Sales Reconciliation.docx`** — the written analysis for Josh & Andy (updated to include Direct to Client).
- **`split DTC by month.gs.txt`** — Google Apps Script to split the `DTC` tab into monthly tabs 01-12 inside the Google Sheet. Run via Extensions > Apps Script > paste > Run `splitDTCByMonth`. It only creates months that have data, rewrites cleanly on re-run, and drops any unparseable-date rows into a `DTC_no_date` tab.

## 7. Outstanding / next steps

1. **Get Josh's sales source.** Which export or pivot produced 1,584,777, over what date range and channel set. Most likely a channel counted twice, an order-vs-line-item mix-up, or a wider date window. Line it up against the 1,139,246 month by month or by product to locate the ~445k gap.
2. **Run the DTC month-split script** in the Google Sheet if not already done, and check the 12 monthly counts sum to 111,259.
3. Optional: a few messy country labels in the DTC data were flagged (e.g. "Francec", "UK" vs "United Kingdom"). Ben has cleaned these; worth a final check before the B Corp submission.

## 8. Caveats

- All figures are individual pieces.
- The DTC data spans 31 Dec 2024 to 30 Dec 2025; the single 2024 row groups into month 12 in the split. Switch to strict 2025-only if the downstream user needs it.
- Import total and Josh's quoted import total differ by 28 pieces (rounding), treated as a match.
