# Handover: B Corp 2025 - imports vs sales reconciliation + Zevero file rebuild

**Prepared by:** Ben (with Claude) - Dock & Bay
**Date:** 17 September 2026
**Status:** COMPLETE. Root cause found and fixed; corrected Sold + Downstream files rebuilt; summary produced. A few scope/sign-off items remain (section 8).
**Supersedes:** `HANDOVER - sets & BOM analysis.md` (the "blocked" phase). This file is the current source of truth. The original `HANDOVER.md` is phase 1 only.

---

## 0. TL;DR

- Josh's worry ("we sold 1.58M vs 1.15M imported, 430k more, correct?") is resolved: **1,584,777 is an over-count and unreproducible.** On a like-for-like physical-goods basis, purchased approximately equals sold.
- The defect was **BOM explosion / inconsistent set counting** in the source sales exports, plus a mapping that silently dropped approximately 44k items and excluded DTC.
- Fixed using **Horizon `planner.set_bom` as the authoritative kit to component map** (Ben's directive), with channel-prefix normalisation, on **Direction B (physical pieces)**.
- **Purchased is fixed at 1,154,344** (straight from the import report, not recomputed).
- Rebuilt, upload-ready files are in **`Zevero Docs - Rebuilt (physical pieces)/`**. Josh's originals are untouched.

### Final numbers

| Measure | Value | Was | Basis |
|---|--:|--:|---|
| Purchased (upstream) | 1,154,344 items | (fixed) | Import report, as booked |
| Sold (rebuilt) | 1,219,641 items | 979,728 | Physical pieces (sets exploded), + DTC, drops recovered |
| Net: sold - purchased | +65,297 (+5.7%) | - | physical goods |
| Downstream Transport (rebuilt) | 463,575 kg / 358,621 legs | 408,111 kg / 359,490 | Product + packaging weight |
| Inbound / D2C freight | 3,383,187 kg / 5,952 legs | (unchanged) | not touched |

---

## 1. The question

Josh (she/her) asked us to sanity-check a B Corp 2025 headline:
> "Import total 1,154,344 pieces, sales 1,584,777, we sold 430,433 more than imported. Correct?"

Answer delivered: no. Purchased approximately equals sold on a physical-item basis (sold ~65k more, ~5.7%, a small stock drawdown). 1.58M cannot be reproduced from any source file; it is an over-count (sets exploded on top of already-exploded lines, or gross pre-refund dashboard units).

---

## 2. Root cause (the key finding)

Source sales orders record a set sale inconsistently: sometimes as the **master SET line plus its exploded component lines** in the same order (double counts), sometimes as a bare kit line. You **cannot** separate a BOM component from a standalone sale by SKU string (a component towel line is byte-identical to a standalone towel sale). String heuristics swung the estimate from 15,607 to 58,518 units. It had to be fixed with a real kit to component map.

Separately, Josh's Sold upload mapped SKUs through `SKU_DATA` and silently dropped approximately 44k items (SKUs mapping to blank or missing product names) and excluded DTC entirely, so it under-counted at 979,728.

---

## 3. The fix / method (deterministic, no string heuristics)

1. **BOM authority = Horizon `planner.set_bom`** (live, read-only via Supabase MCP, project `oolwklahstnvocaugryg`). 1,989 rows, 287 SET SKUs to 453 components, with per-component quantity. Exported to `set_bom_horizon_live.csv` in this folder. Confirmed against known examples (e.g. `TOWLB-CAB-LG-4SETA-R` to BLUE/GREEN/RED/YELL x1).
2. **Prefix normalisation:** sales/import SKUs carry channel prefixes (`PP-`, `UK-`, `US-`, `AU-`, `CA-`, `EU-`, `FAIRE-`, ...) but the BOM keys are canonical. Strip the prefix, then join. This is what makes the map match. Makeup `nPAK` packs correctly do NOT match (single manufactured products, not sets) so they are never exploded.
3. **Direction B (physical pieces)** chosen by Ben: explode every set into its component items, on both sides. Per order: drop the SET master line; keep the component lines that are present; explode any bare kit line via the map. Standalone lines untouched.
4. **Purchased is fixed** at the import report figure (1,154,344). Not recomputed, not exploded (Ben's call - it is the agreed number and comes straight from the source).
5. **Weights = product + packaging.** Downstream weight is computed as Sigma(item qty x product weight); confirmed empirically (order weight approximately equals Sigma qty x product weight, ratio 0.99). It inherited the item undercount, so it was regenerated on corrected items, now including packaging (tag + poly bag + box + paper). Product/packaging weights parsed from `SKU_DATA.MERGE_bcorp` (last-but-one pipe field = product weight; tag/bag/box/paper fields = packaging).

### Residuals (small, acceptable)
- Approximately 5.2k qty (~0.4%) of sets stayed un-exploded because they have **no BOM row in Horizon** (e.g. `TEATWL-MD-3SET-*`, some bundles) plus makeup packs (intentionally single). None of these are in `set_bom`, so this is correct behaviour, not a bug. Their combined mass is still counted.
- Fees/services (`CUSTOM-LOGO`, `PERSONALISE_*`, `COMMISSION`, `PAYMENT-PROCESSING-FEE`, approximately 26k qty) correctly excluded from physical-goods counts.

---

## 4. Deliverables (all in this folder)

**`Zevero Docs - Rebuilt (physical pieces)/`** (Josh's originals in `Zevero Docs/` are untouched):
- `Sold 01.25.xlsx` ... `Sold 12.25.xlsx` - rebuilt, 1,219,641 items total. DTC included (105,394 items; the 5,865 dropped are all `CUSTOM-LOGO`).
- `Downstream Transport 01.25.xlsx` ... `12.25.xlsx` - rebuilt, 463,575 kg / 358,621 legs, product + packaging. One leg per order (origin = `shipped from facility`, destination = `delivery post city`/`code`, date = order date). Note: these retain the original helper `Sheet1` (stale monthly counts, unused by Zevero).

**Analysis folder root:**
- `summary.xlsx` - annual totals, reconciliation, monthly breakdown (Purchased / Sold rebuilt / Downstream kg).
- `RECONCILIATION_RESULTS.md` - method + numbers.
- `set_bom_horizon_live.csv` - the BOM map (kit to component).

---

## 5. Data sources

**Ben's source records (folder root):**
| File | Sheet(s) | Contents |
|---|---|---|
| `Bcorp 2025 IMPORT Report - for Josh & Andy (1).xlsx` | `PO_ALL` | Imports. `SKU` (col S), `Qty` (col T). `SKU_DATA`, `SIZE_AT` also present. |
| `Bcorp 2025 SALES Report for UK_EU H1/H2 (with post code).xlsx` | tabs `01`-`12` | Shopify + Amazon, UK/EU |
| `Bcorp 2025 SALES Report for US_AU_CA H1/H2 (with post code).xlsx` | tabs `01`-`12` | Shopify + Amazon, US/AU/CA |
| `Bcorp 2025 SALES Report for Direct to Client.xlsx` | `DTC` | Factory-direct / distributor bulk |

**Sales tab columns:** `D`=date, `E`=order size, `F`=order weight, `H`=shipped from facility (`City|Postcode`), `I`=id (order), `N`=projectName (channel), `P`=lineItems code (SKU), `Q`=lineItems qty, `R`=delivery post city, `S`=delivery post code.
**`SKU_DATA`:** `SKU` to `product_select_name` (Item Name) + `size` (Item Sub Name). `MERGE_bcorp` pipe field carries packaging + product weight. `product weight (kg)` also exists as its own column in the CSV export.

**Josh's Zevero templates (`Zevero Docs/`):**
- `2025 Purchased Goods UPDATED jan-dec25.xlsx` - `Upload Template`, `Quantity*`, total 1,154,344.
- `Sold 01-12.25.xlsx` - `Upload Template`: `Delivery Date*`, `Business Division` (Dock & Bay), `Item Name*`, `Item Sub Name`, `Unit*` (No of Items), `Mass`, `Amount*`.
- `Downstream Transport 01-12.25.xlsx` - `Upload Template`: date, facility address/postcode, destination address/postcode, `Amount (kg)*`.
- `Dock & Bay Transport Downstream D2C for Upload.xlsx` - China road freight, 3,383,187 kg.

**Horizon:** `planner.set_bom` (live Supabase, read-only). Google Sheets copy of DTC report: https://docs.google.com/spreadsheets/d/15Dcmht6WhGuZoJLOp9R52eUx0UpNFj26d7SZOGcw_aM/edit

---

## 6. Decisions made (locked)

- **Direction B (physical pieces)**, not Direction A (retail units). Flips the headline.
- **Purchased fixed at 1,154,344** from the import report (not recomputed / not exploded).
- **Downstream regenerated** on corrected items, **product + packaging** basis.
- **DTC left out of Downstream** (ecom scope unchanged) - see open item.

---

## 7. Reproduce

Scripts live in the session scratchpad (read-only, `openpyxl`, no external calls beyond the one read-only Supabase MCP pull of `set_bom`):
- `build_sold.py` / `write_sold.py` - explode Direction B, map via `SKU_DATA`, aggregate by date x item, write 12 Sold copies.
- `build_downstream.py` - per-order corrected weight (product + packaging), one leg per order, write 12 Downstream copies.
- `make_summary.py` - build `summary.xlsx`.
- `recon.py` - the three-way totals check.
Key operations: group sales rows by `id` to expose per-order line structure; NORM strips channel prefixes; join to `set_bom`; explode; map to Zevero template.

---

## 8. Open items / next steps

1. **DTC / distributor downstream legs** (~42,489 kg, 83 bulk orders) are excluded from the Downstream files (ecom scope). Josh to confirm whether distributor deliveries belong in downstream transport, or are covered by the separate D2C freight file.
2. **Approximately 3.5k Horizon-undefined sets** (e.g. `TEATWL-MD-3SET-*`, some bundles) are not in `set_bom` so stay un-exploded (~0.3%). To close: add their BOMs to Horizon `set_bom` (a live write - goes through Diviyaj).
3. **Strip the stale `Sheet1`** from the rebuilt Downstream files if pristine uploads are wanted (harmless as-is; Zevero ignores it).
4. **Reply to Josh** - draft exists (purchased 1.15M / sold 1.22M / 1.58M was an over-count); finalise and send.
5. Optional: patch `SKU_DATA` upstream so no SKU maps to blank/missing (the original root cause of the ~44k drop) so future exports are correct at source.

---

## 9. Hard rules carried forward

- **No writes to any live system (Google Sheets, Cin7, Fulfil, Airtable, Supabase) without Ben's explicit confirmation.** Reads are fine. Hand Ben any script to run himself.
- Never commit secrets / API keys.
- Ben's level is medium: show reasoning, be concise, confirm before acting.
- Horizon `set_bom` is the single BOM source of truth for this work.
