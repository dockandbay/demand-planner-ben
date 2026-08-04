# SPEC — 3PL Invoicing (REPORTS ▸ 3PL Invoicing)

**Status:** captured brief, NOT built. Ben's future workstream (logged 2026-08-04).
**Slug:** rename existing `#/reports/tpl` → `#/reports/3pl-invoicing`.
**Scope now:** EU / iFulfillment (Blade, ILG). Title implies later coverage of Geneva, Propack too.

## Goal
Take a 3PL's monthly fulfilment invoice, allocate every cost line to the right accounting
**Cost Center** (via the ERP order the cost belongs to), split freight vs fulfilment, surface
the other cost types (storage, returns, inbound/rework), and ultimately post a **Xero bill**.

## Source files (what we actually receive each month)
- `DOC - May 26.xlsx` — the 3PL's line-level charge export (raw data).
- `Invoice INV-191666.pdf` — the 3PL's actual invoice (header totals / summary to reconcile to).
- (Ben's working file: `3PL INVOICE ACCOUNTING (Blade, ILG, Geneva, Propack) - BLADE.csv` — this is
  Ben's spreadsheet with **his mapping + workings + final summaries**, i.e. the target output, not
  a raw input. Raw line data is from **column J ("PASTE DATA") onwards**.)

## Raw data columns (BLADE.csv, col 11+ = the pasted export)
Id, Channel, BID, Company Name, First/Last Name, **Reference**, Classification, Despatch Date,
Address, Postcode, Country, Warehouse, Warehouse Shortcode, Total Items, Total Packages,
Picked Items, Currency, Currency Name, **Admin Fee, Volume Usage Fee, Pick Charge**, Weight,
Shipping Method, **Shipping Fee**, Consumables, Products, Product Channels, **Consumables Cost,
Duty & Taxes, Rework Labour, Rework Consumables, Storage, Additional Cost, Channel Labels Cost,
Total Cost, Total Excl Shipping**.

- **Reference** = the key. Matches a **Cin7 (or Fulfil) sales order** in the ERP.
- Ben's summary/mapping area (cols A–I): `Fulfilment TOTAL`, `COST CENTER MISSING`, `CALCS`,
  `Cost Center` (col I) — Cost Center is the mapped account; col H `CALCS` are his workings.
- **Freight vs fulfilment split:** `Shipping Fee` = freight; `Total Excl Shipping` = fulfilment fees.

## Mapping logic (Reference → account)
- The account = **`CostCenter` field on `cin7.salesorder`** for the matched order.
- These orders are the ones in the **EU iFulfillment branch**. So: download all Cin7 orders for the
  recent month(s) in that branch, match invoice lines by **Reference**, read their CostCenter.
- **Second pass** for anything unmatched (fuzzy/alt-ref) to reduce "COST CENTER MISSING".
- ⚠ Cin7 reads only. (Local server CIN7_* hits PRODUCTION Cin7 — read is fine, never write as a test.)

## Other cost types to identify (not per-order fulfilment)
Storage, Returns, Purchase Orders & Rework (inbounding stock), plus any Additional Cost /
Duty & Taxes / Channel Labels. These need their own account treatment (likely not order-mapped).

## Phased plan (Ben's staging)
- **Phase 1 — Parse & total.** Parse the raw data file(s); present the **sum of every field**
  (all fee columns + freight vs fulfilment split + the non-order cost buckets). Reconcile to the
  invoice PDF total. No ERP/Xero yet. This is the first pass.
- **Phase 2 — Map to Cin7.** Match Reference → Cin7 salesorder.CostCenter (EU iFulfillment branch),
  two-pass matching, surface unmapped. Produce cost-by-CostCenter summary (freight/fulfilment split).
- **Phase 3 — Map to Xero.** Turn the mapped summary into a **Xero bill** (draft; gated write).

## Open questions (for Ben, before Phase 1 build)
1. Upload model: user uploads the **xlsx** each month (like Ben's paste), or the CSV export? Confirm
   the canonical raw file = `DOC - May 26.xlsx` (not the BLADE working file).
2. Which fields are true "charges" to sum vs derived (Total Cost / Total Excl Shipping are subtotals)?
3. Cin7 vs Fulfil: EU currently Cin7 — is Fulfil in scope now or later?
4. Xero (Phase 3): which Xero account codes do CostCenters map to; bill as one line per CostCenter?
5. Multi-3PL: build EU/iFulfillment first, generalise later? (title lists Blade/ILG/Geneva/Propack).
