# SPEC — n8n: import Cin7 sales orders for the 3PL invoice mapping

**For Diviyaj. Author: Claude (for Ben). Date: 2026-08-21.**

## Goal
Move the 3PL-invoice **"Import Cin7 orders"** step out of the app and into an **n8n scheduled flow** that keeps `planner.tpl_cin7_orders` populated. Once this is live, Ben will remove the in-app import button + endpoint and keep only the **Map to Cost Centres** and **Clean-up** steps (both read `tpl_cin7_orders`; they don't need the manual importer).

**Why:** the app currently fetches Cin7 sales orders on demand (`POST /api/supply/tpl/cin7-import`), paginating under a serverless time budget with a resume cursor — fiddly and slow. n8n can keep the table fresh in the background so the 3PL invoice analyse is instant and offline.

## What to replicate (exactly what the app does today)

**Source:** Cin7 v1 API — `GET https://api.cin7.com/api/v1/SalesOrders` (READ-ONLY; safe. Uses the same Cin7 API username + connection key already in the estate.)

**Query params (per page):**
- `rows=250`
- `page=<n>` — paginate from 1 until a page returns fewer than 250 rows.
- `fields=id,reference,customerOrderNo,costCenter,memberCostCenter,invoiceDate,branchId,total,freightTotal`
- `where=` (URL-encoded): `InvoiceDate>='<start>T00:00:00Z' AND InvoiceDate<='<end>T23:59:59Z' AND BranchId=<branchId>`

**Filter by `InvoiceDate`** (not OrderDate) — the 3PL bills by when the order shipped/invoiced, and the invoice mapping must match that period.

**Run once per 3PL branch** (loop all four):

| 3PL | Cin7 BranchId |
|---|---|
| UK — ILG (`uk_ilg`) | `5053` |
| US — Geneva (`us_geneva`) | `5055` |
| EU — iFulfilment/Blade (`eu_ifulfilment`) | `25073` |
| AU — Coghlans (`au_coghlans`) | `16288` |

## Upsert target — `planner.tpl_cin7_orders` (already exists, migration 176 — no DDL needed)

Per Cin7 order, upsert (conflict key = `cin7_id`):

```sql
INSERT INTO planner.tpl_cin7_orders
  (cin7_id, reference, customer_order_no, cost_center, member_cost_center,
   invoice_date, branch_id, total, freight_total, period, imported_at)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now())
ON CONFLICT (cin7_id) DO UPDATE SET
  reference=excluded.reference, customer_order_no=excluded.customer_order_no,
  cost_center=excluded.cost_center, member_cost_center=excluded.member_cost_center,
  invoice_date=excluded.invoice_date, branch_id=excluded.branch_id,
  total=excluded.total, freight_total=excluded.freight_total,
  period=excluded.period, imported_at=now();
```

Field mapping (Cin7 → column):
- `id` → `cin7_id`
- `reference` → `reference`
- `customerOrderNo` → `customer_order_no`
- `costCenter` → `cost_center`
- `memberCostCenter` → `member_cost_center`
- `invoiceDate` (first 10 chars, i.e. the date) → `invoice_date`
- `branchId` → `branch_id`
- `total` → `total`
- `freightTotal` → `freight_total`
- `period` → set to `to_char(invoice_date,'YYYY-MM')` (the order's invoice month)
- `imported_at` → `now()`

> The **Map** + **Clean-up** steps match on `reference` / `customer_order_no` (indexed) and read `coalesce(nullif(cost_center,''), member_cost_center)` as the Cost Centre — so those two columns per order are the critical payload. `period` is informational (used only for count summaries).

## Schedule / window
3PL invoices arrive monthly and reference orders invoiced that month (occasionally spilling a day or two into the neighbouring month). Recommended:

- **Daily** run covering `InvoiceDate` in **[first day of previous month → yesterday]**, all four branches. Idempotent upsert, so it only writes new/changed orders; it catches late-posted orders automatically (this is exactly the app's "sweep" behaviour). Cheap and robust.
- (Alternative: monthly on ~day 3 for the prior full month + one mid-month refresh. Daily is simpler and safer.)

## Notes
- **Read-only** against Cin7 — no writes to Cin7. ([[cin7-auth-is-live]]: the shared Cin7 creds hit PRODUCTION, but GET SalesOrders is safe.)
- **No migration required** — `planner.tpl_cin7_orders` already exists on live.
- **`planner.tpl_cin7_imports`** (run-log + incremental cursor) is used only by the in-app importer; once that's removed it becomes unused — safe to leave in place or drop later.
- Volumes: a month is typically a few hundred to a few thousand orders per branch (e.g. US Geneva ~2,400/period), 250/page → ~10-20 pages/branch. Add a small throttle between pages to be gentle on the Cin7 API.

## After it's live (Ben's side — app change, separate)
Remove the **"Import Cin7 orders"** button/step from REPORTS ▸ 3PL Invoicing and the `POST /api/supply/tpl/cin7-import` endpoint (+ `tplCin7Summary` import-run UI). **Keep** the **Map to Cost Centres** step and the **Clean-up** sweep (a targeted on-demand top-up for any reference still missing — a rare fallback once n8n keeps the table current).
