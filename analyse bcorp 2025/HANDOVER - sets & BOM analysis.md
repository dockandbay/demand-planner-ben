# Handover: B Corp 2025 — sets, BOM explosion & the sales reconciliation

**Prepared by:** Ben (with Claude) — Dock & Bay
**Date:** 17 September 2026
**Status:** Root cause identified (BOM explosion in source orders). Blocked pending **Horizon / Cin7 BOM definitions** and the **Fulfil import script**. Direction decision (A vs B) outstanding.
**Supersedes/extends:** `HANDOVER.md` (phase 1 only). This file is the current source of truth.

---

## 0. TL;DR for whoever reopens this

- Purchased/imports (~1.15M) is **solid and agreed**. The argument is entirely about **how sales are counted**.
- Josh's quoted sales of **1,584,777 ("1.58 mil") cannot be reproduced from any file** — hers or ours. Every defensible method lands **1.14M–1.34M**.
- The real defect: **source sales orders contain BOM explosion.** A set sale is recorded as the **master SET line PLUS its exploded component lines** in the same order, so summing line items over-counts sets.
- You **cannot** reliably separate a BOM component from a genuine single-item sale by SKU string (a component towel line is identical to a standalone towel sale). The double-count estimate swung from **15,607 → 58,518 units** just by tweaking the heuristic. **This must be fixed at the source import using the real kit→component definitions (Horizon/Cin7), not by pattern-matching.**
- Next action when reopened: get the authoritative **kit → component (BOM) mapping** from Horizon/Cin7, get the **Fulfil import script**, confirm **direction A or B**, then write the Apps Script filter.

---

## 1. The question (unchanged from phase 1)

Josh asked us to sanity-check a headline for the B Corp 2025 report:

> "The import total is 1,154,344 pieces, and the sales is 1,584,777, we sold 430,433 pieces more than imported. Does that sound correct?"

Josh's latest message (which triggered this re-analysis):

> "That new file (DTC) didn't have all purchased that I could see? So purchased data still shows 1.14mil items bought, and the ecom etc (all not dtc) is at 1.58 mil plus what is in the dtc, unless that is all sales?"

Josh is she/her.

---

## 2. Data sources

**Ben's source records (root of the working folder):**

| File | Key sheet(s) | Contents |
|---|---|---|
| `Bcorp 2025 IMPORT Report - for Josh & Andy (1).xlsx` | `PO_ALL` | Imports/purchases. Individual SKU per line, `Qty` = pieces. Also `SKU_DATA`, `SIZE_AT`. |
| `Bcorp 2025 SALES Report for UK_EU H1 (with post code).xlsx` | tabs `01`–`06` | Shopify + Amazon, UK/EU, Jan–Jun |
| `Bcorp 2025 SALES Report for UK_EU H2 (with post code).xlsx` | tabs `07`–`12` | Shopify + Amazon, UK/EU, Jul–Dec |
| `Bcorp 2025 SALES Report for US_AU_CA H1 (with post code).xlsx` | tabs `01`–`06` | Shopify + Amazon, US/AU/CA, Jan–Jun |
| `Bcorp 2025 SALES Report for US_AU_CA H2 (with post code).xlsx` | tabs `07`–`12` | Shopify + Amazon, US/AU/CA, Jul–Dec |
| `Bcorp 2025 SALES Report for Direct to Client.xlsx` | `DTC` (+ month tabs `01`–`12`) | Factory-direct / distributor bulk orders |

**Josh's working files (`Zevero Docs/` subfolder) — Zevero carbon-accounting upload templates:**

| File(s) | Sheet | Quantity column | Total |
|---|---|---|---|
| `2025 Purchased Goods UPDATED jan-dec25.xlsx` | `Upload Template` | `Quantity*` | **1,154,344** |
| `Sold 01.25.xlsx` … `Sold 12.25.xlsx` | `Upload Template` | `Amount*` | **979,728** |
| `Downstream Transport 01–12.25.xlsx` | `Upload Template` | `Amount (kg)*` | **359,490 parcel legs** (weight, not items) |
| `Dock & Bay Transport Downstream D2C for Upload.xlsx` | `Upload Template` | `Amount (kg)*` | 5,984 legs |

**Key column layout of the regional SALES month tabs** (used throughout):
`E = order size`, `G = sum total` (a per-SKU aggregate, ignore), `I = id` (order id), `K = reference`, `N = projectName` (channel), `P = lineItems » code` (SKU), `Q = lineItems » qty`.
- `order size` is written **once per order** on its first line and equals the **sum of `lineItems » qty` for that order**. Summing `order size` = summing `lineItems » qty` = 1,027,987.
- `SKU_DATA` sheet maps `SKU` → `product_select_name` (friendly Item Name) + `size` (the Zevero "Item Sub Name").

Google Sheets copy of the DTC report (owner ben@dockandbay.com):
https://docs.google.com/spreadsheets/d/15Dcmht6WhGuZoJLOp9R52eUx0UpNFj26d7SZOGcw_aM/edit

---

## 3. The numbers, three ways

### Method A — retail units (multipack/set = one line item, as currently summed)

| Measure | Pieces | Source |
|---|---:|---|
| Imports (purchased) | 1,154,372 | `PO_ALL`, `Qty` (Josh's Purchased file = 1,154,344 — matches to 28) |
| Ecom sales, ex-fees | 1,026,807 | 4 regional files, tabs 01–12, `lineItems » qty` (FAIRE fees 1,180 removed) |
| DTC sales | 111,259 | DTC tab, `lineItems » qty`, 1,190 lines |
| **Total sales** | **1,138,066** | |
| **Net (imported − sold)** | **+16,306** | ~1.4% net stock build |

This is essentially the phase-1 conclusion: imports ≈ sales, imported slightly more. **But it still contains the BOM double-count (see §5), so ecom here is overstated for sets and understated is nowhere near 1.58M.**

### Method B — "explode everything" (WRONG — recorded so it is not reused)

An earlier pass exploded every `nSET`/`nPAK` master line by its pack size on both sides (imports 1,257,957 / sales 1,338,437, "sold 80k more"). **This is invalid** because (a) the towel sets are **already exploded** into component lines in the source, so it double-explodes them, and (b) it wrongly multiplied makeup `nPAK` SKUs, which are single manufactured products. Do not use these figures.

### Method C — where 1,584,777 sits

Unreproducible. Josh's own ecom upload totals **979,728**. The source ecom totals **1,027,987**. Summing `order size` = 1,027,987 (no hidden multiplier). `sum total` (col G) = 127,884,831 (a per-SKU aggregate, meaningless as a total). Downstream transport = 359,490 legs. **Nothing reaches 1.58M.** It is ~250k above even the most generous piece view, so it likely includes double counting (e.g. gross pre-refund units from a Shopify/Amazon dashboard, or explosion stacked on the already-exploded data). Treat as not-yet-explained.

---

## 4. Why Josh's Sold upload = 979,728 (the ~4.7% monthly gap)

Josh's build maps every sold SKU through `SKU_DATA` and keeps only rows that resolve to a product name. Vs the source ecom total of 1,027,987 (gap **48,259**):

| Component | Pieces | Legitimate to drop? |
|---|---:|---|
| SKUs missing from `SKU_DATA` entirely | 25,510 | Partly — ~1,180 are FAIRE fees (correct); rest are real product SKUs, mostly multipacks/sets |
| SKUs mapping to a **blank** product name | 19,090 | No — real sales silently dropped |
| Residual (rounding / date-boundary) | ~3,659 | Minor |

Her Sold upload **also excludes DTC entirely** (111,259). So as it stands her Zevero "Sold" is understated by ~44k of genuine product **plus** all DTC. (Fixable by patching `SKU_DATA` so no SKU maps to blank/missing — but note this is a *separate* issue from the BOM double-count, which pushes the other way.)

Month-by-month, Josh's Sold tracks the source ~4-6% low every month:
`Jan 49,829 vs 51,350 … Dec 73,430 vs 77,735` (total 979,728 vs 1,027,987).

---

## 5. THE KEY FINDING — BOM explosion in source orders

A set sale appears in the source as the **master SET line + its exploded component lines**, all under the same order `id`. Confirmed examples (regional file UK_EU H1, tab `01`):

```
ORDER id=1236505 (order size=5)        ORDER id=1236296 (a 3-set)
  TOWLB-CAB-LG-BLUE-R    qty 1           TOWLH-CBH-LG-CREAM    qty 1
  TOWLB-CAB-LG-GREEN-R   qty 1           TOWLH-CBH-XL-CREAM    qty 1
  TOWLB-CAB-LG-RED-R     qty 1           TOWLH-CBH-SM-CREAM    qty 1
  TOWLB-CAB-LG-YELL-R    qty 1           TOWLH-CBH-3SET-CREAM  qty 1  ◄ master
  TOWLB-CAB-LG-4SETA-R   qty 1  ◄ master
```

Summing all lines counts that one set as **4–5** instead of 1 (retail) or 4 (physical pieces).

**Critical characteristics:**
- **Towel `nSET` SKUs ARE exploded** (assembled kits: master + component variant lines).
- **Makeup `nPAK`/`nPACK` SKUs are NOT exploded** — they are single manufactured products (e.g. `MAKUP-HOM-3PAK`, qty = number of packs, no child lines). Do not treat these as BOMs.
- There is **no master/component flag** in the exported columns. Master and component lines are byte-identical except for the SKU string.
- The **SET token position varies** (`TOWLB-CAB-LG-4SETA-R` vs `TOWLH-CBH-3SET-CREAM`), so naive prefix matching fails.
- Some SET SKUs carry region/channel prefixes (`UK-`, `US-`, `PP-`, `FAIRE-`) that their component lines do not — another reason string matching is unreliable.
- The source is **inconsistent**: explosion appears mostly on Shopify UK orders; some Amazon set orders are not exploded. So the defect is not uniform across channels.

**Why this can't be fixed by post-hoc string matching:** a `TOWLB-CAB-LG-BLUE-R` line is identical whether it's a standalone towel sale or a 4-set component. Our double-count estimate moved from **15,607 → 58,518 units** purely by improving the heuristic. Reference points from string-based passes (all approximate, do not quote as final):
- Total `nSET` master-line qty across all regional files: **51,078**
- Detected BOM component qty (best heuristic): **58,518**
- "Master-only" ecom (drop detected components): **~969k**
- "Components-only" ecom (drop master kit lines): **976,909**
- Imports also contain some pack SKUs: **26,525 qty across 60 SKUs** (`PP-` prepacks, FBA makeup packs) — so any explosion/collapse decision must be applied consistently to the import side too.

---

## 6. Ben's directive & the open decision

**Ben's rule:** *"Only master products should be counted. Exclude BOMs."* The fix belongs in the **Fulfil data-import script** (PROCESS tab step 2, *"Run the script to import all data"*), **NOT** the "g&h script" (that only populates delivery post codes into columns G & H).

**Direction still to confirm — it flips the headline number:**

| Interpretation | Keep | Drop | Effect vs imports (individual towels) |
|---|---|---|---|
| **A** — the SET is the master product | the `nSET` line = 1 | the component lines | sold < imported for every set |
| **B** — the individual towels are the masters; the SET is the BOM/kit | the component towels | the `nSET` kit line | sold = physical towels → **reconciles with imports** |

Imports are booked as individual towels, so **B reconciles cleanly**; but "exclude BOMs" reads literally like the SET *is* the BOM. **Confirm A or B before writing the filter.**

---

## 7. What's blocked / needed to finish

1. **Horizon / Cin7 BOM definitions** — the authoritative **kit SKU → component SKUs** mapping. This is the reliable key to identify BOM lines (replacing string heuristics). Ben will reopen this with Horizon access.
   - Cin7 is **not** connected in the Claude session. Options to get the mapping: (a) Cin7 API (Core or Omni REST — supply key at runtime, never commit), (b) a CSV export of BOM/kit products dropped into this folder, or (c) browser automation while logged in. Confirm whether it's **Cin7 Core or Omni**.
   - Alternatively the mapping may be obtainable from **Fulfil** (kit/BOM product structures) — Fulfil *is* connected via MCP.
2. **The Fulfil import script + the G&H script** — not yet seen. Only `split DTC by month.gs.txt` (the DTC month-splitter, unrelated) is in the folder. Need these pasted or the Google Sheet shared to place the filter against the real layout.
3. **Direction decision A vs B** (see §6).
4. Ideally, confirm whether the Fulfil line-item payload the import pulls carries a **kit/component flag or parent-line reference** — if so the filter is one reliable line and Horizon may not even be needed.

---

## 8. Next steps when reopened

1. Pull the kit→component (BOM) list from Horizon/Cin7 (or Fulfil). Build a definitive set of BOM/kit SKUs and their components.
2. Decide direction A or B.
3. In the **import script**, filter line items: if direction B, drop the kit `nSET` master lines and keep components; if direction A, drop the component lines belonging to a kit in the same order and keep the master. Use the BOM map + order grouping — **not** SKU string patterns.
4. Apply the **same convention to the import side** so purchased and sold are like-for-like.
5. Re-run the three-way totals and produce the corrected imports-vs-sales reconciliation for the B Corp submission.
6. Separately, patch `SKU_DATA` so no SKU maps to a blank/missing product name (recovers the ~44k Josh's Sold upload silently drops), and add DTC to her Sold upload.
7. Deliver the reply to Josh with the corrected, single-convention numbers.

## 9. Hard rules for the resuming session
- **Do not run any script against the live Google Sheets / Cin7 / Fulfil without Ben's explicit confirmation.** Read operations are fine; writes need a confirm. Hand Ben the Apps Script to review and run himself.
- Never commit secrets/API keys.
- Ben's technical level is medium: show reasoning, be concise, confirm before acting.

## 10. Reproduce the analysis
All figures above came from Python (`openpyxl`) reads of the .xlsx files in this folder — read-only, no external calls. Key operations: sum `lineItems » qty` across numeric-named tabs per regional file; group rows by `id` to expose per-order line structure; map SKUs via the `SKU_DATA` sheet. Josh's `Zevero Docs` totals: sum `Quantity*` (Purchased) and `Amount*` (Sold) on each `Upload Template` sheet.
