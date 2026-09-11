# Deploy note — Shared PO-finance view (v25.660)

## What changed
The admin PO-finance calc and the supplier portal calc were two hand-maintained copies of the same big CTE.
They drifted (that was the portal payment bug). This change makes both read ONE Postgres view.

- **New migration `migrations/123_v_po_finance.sql`** — `CREATE OR REPLACE VIEW planner.v_po_finance`
  (the admin `base..calc4` chain verbatim: per-PO payment figures + effective dates, own-PO dates, no supplier
  filter, no shipment mastering). Idempotent.
- **server.mjs** — two queries rewired to the view:
  - admin `/api/supply/purchase-orders` + `/api/supply/cashflow`: `WITH mastered AS (SELECT v.*, … FROM
    planner.v_po_finance v …) SELECT <landed/ERP/action columns> FROM mastered` — mastering + landed-cost +
    ERP + action flags now layer on top of the view.
  - `POS_SQL_PORTAL`: `SELECT <portal subset> FROM planner.v_po_finance WHERE supplier_name = ANY($1)`.

## ⚠️ Action required (order matters)
**Run migration 123 on live BEFORE (or in the same deploy as) the server.mjs change.** Until the view exists,
`/api/supply/purchase-orders`, `/api/supply/cashflow` and the supplier portal will 500.

No new env vars. No data migration. View only — safe to re-run (CREATE OR REPLACE).

## Verification done in sandbox (all 1371 POs)
- **admin unchanged:** new admin query == old admin query, byte-identical, every column, every PO (0 diffs).
- **drift gone:** portal payment columns == admin payment columns for the same POs (0 drift).
- **fixes:** 308 portal payment values corrected (top supplier alone) — the portal now applies the deposit-ref
  draw cap and the richer line-value (confirmed portal costs + product `cost_<code>` fallback) that admin used.
  These are alignments *to* admin, which is the source of truth.

## Note
This supersedes the earlier surgical portal patch (completion cap + credit + shipment join). That logic is now
in the shared view, so there's a single place to maintain the payment calc going forward.
