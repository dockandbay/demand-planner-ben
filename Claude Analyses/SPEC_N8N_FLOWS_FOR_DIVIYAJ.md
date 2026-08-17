# Spec: n8n flows for HORIZON (for Diviyaj)

From: Ben · 17-Aug-26 · Three scheduled snapshot flows, all **straightforward** (Ben asked me to flag if complex — they aren't). Flows 1 & 3 are scheduled authenticated POSTs; Flow 2 is a Cin7 stock pull → transform → Supabase insert.

Production app: `https://horizon.dockandbay.com` · Supabase prod `oolwklahstnvocaugryg`, schema `planner`.

**Follow-up (after these are confirmed live):** the manual "📸 Snapshot now" buttons in the app (forecast snapshot on the Accuracy page; open-actions snapshot on the Metrics report) will be moved into **CONFIG ▸ Admin** (kept as a manual fallback). Ben will confirm the n8n flows are running first; then Ben's team relocates the buttons.

---

## Flow 1 — Monthly forecast snapshot ("lock" the forecast)

**Purpose.** On the **5th of each month**, lock the current forecast so forecast-vs-actual **accuracy** accrues over time. This replaces the manual "snapshot" button on the Accuracy page (`#/demand/kpis/accuracy`). Each dated snapshot records what we forecast at that moment; later it's compared to actuals.

**The endpoint already exists** — the flow just has to call it on a schedule:

- **Schedule:** 5th of each month (e.g. 06:00 UTC — any time on the 5th is fine; the current month's forecast should be settled by then).
- **Action:** `POST https://horizon.dockandbay.com/api/forecast/snapshot`
  - Body (JSON, optional): `{ "note": "Monthly auto-snapshot {{ $now.format('YYYY-MM') }}" }`
- **Auth:** this is a write endpoint, so it needs to pass the app's auth (the Vercel access proxy). Please wire whatever service credential / header the other write-flows use. If a clean service path is needed, tell me and I'll add a webhook-secret guard on this route (same pattern as `POST /api/data-cache/invalidate`).
- **What it does server-side:** inserts a dated run into `planner.forecast_runs` + SKU-level rows into `planner.forecasts (level='sku', method='snapshot')` from the live `forecast_outputs`. Read back by `GET /api/kpi/forecast-accuracy` and shown on the Accuracy page.
- **Idempotency:** each call creates a **new** run, so please ensure it fires **once** on the 5th (don't retry-loop). Two runs in a month isn't harmful but is redundant.
- **Verify:** after it runs, `GET /api/kpi/forecast-accuracy?level=cc` returns a snapshot for the new month; the Accuracy page reflects it.

---

## Flow 2 — Inventory-available snapshot (3× per month)

**Purpose.** On the **1st, 10th and 20th of each month**, capture on-hand available stock into `planner.inventory_snapshots`. This feeds the safety-stock / stockout model and extends the monthly history already loaded (Jan-2025 → Aug-2026). Mid-month snapshots (10th/20th) catch intra-month stockouts that a month-start-only view misses (important for fast-moving seasonal lines).

**Target table** `planner.inventory_snapshots`:

| column | type | |
|---|---|---|
| sku | text | product SKU (must match `planner.products.sku`) |
| warehouse | text | mapped warehouse code (below) |
| snapshot_date | date | the run date (1st / 10th / 20th) |
| available | integer | on-hand available units for that sku × warehouse |
| source | text | set to `'n8n'` |

Primary key: `(sku, warehouse, snapshot_date)`.

**Flow shape (recommended):** Cin7 current-stock pull → transform (branch → warehouse map + exclusions) → Supabase **upsert**. (Same data as the "Historic and Current Stock Valuations" export Ben has been loading manually; units = available qty per SKU per branch.)

**Steps:**
1. **Schedule:** cron on the 1st, 10th, 20th (e.g. `0 6 1,10,20 * *`).
2. **Pull** current available stock per SKU per branch from Cin7 (branch-availability / stock endpoint).
3. **Map branch → warehouse** and **drop unmanaged branches** using this map (branches mapping to `null` are excluded — do NOT insert them):

   ```
   'UK ILG'            -> uk_3pl        'US Geneva'          -> us_3pl
   'AU Coghlans'       -> au_3pl        'EU iFulfillment'    -> eu_3pl
   'EU ILG'            -> eu_3pl        'UK FBA'             -> uk_fba
   'US FBA'            -> us_fba        'AU FBA'             -> au_fba
   'EU FBA'            -> eu_fba        'US AWD'             -> us_awd
   'UK ILG non grs'    -> uk_nongrs     'US Geneva non GRS'  -> us_nongrs

   EXCLUDE (-> null): CA FBA, CA Propack, CA Embroidery   (CA is decommissioned)
                      3PL Test, Nordstrom Test, Test, US Walmart, UK Head Office,
                      AU Embroidery, Direct to Client, US B2B, UK B2B, UK B2B JLEW,
                      China Stock, Zalando, JP FBA, and all *Preorder branches
   ```
   If a **new branch** appears that isn't in this list, please skip it and flag it to Ben (don't guess a mapping). Multiple branches can map to the same warehouse (e.g. EU iFulfillment + EU ILG → `eu_3pl`) — sum their units per (sku, warehouse).

4. **Sanity check (optional but recommended):** the pull usually includes a "Grand Total" row = sum of all branches; if present, confirm the detail rows sum to it before writing (catches a truncated export).
5. **Upsert** into Supabase with `snapshot_date` = the run date and `source='n8n'`:

   ```sql
   INSERT INTO planner.inventory_snapshots (sku, warehouse, snapshot_date, available, source)
   VALUES (:sku, :warehouse, :date, :available, 'n8n')
   ON CONFLICT (sku, warehouse, snapshot_date)
   DO UPDATE SET available = EXCLUDED.available, source = EXCLUDED.source;
   ```
   (Or `DELETE FROM planner.inventory_snapshots WHERE snapshot_date=:date` first, then plain insert — either is fine.)

6. Only insert SKUs that exist in `planner.products` (a left-join / filter avoids orphan rows; `amzn.gr.*` Amazon label variants and 0-unit noise can be dropped).

**Reference:** the manual loader (`POST /api/config/inventory-snapshot-load`, in `server.mjs`) implements this exact mapping/exclusion/reconciliation logic if you want to mirror it. A direct Cin7 → Supabase flow is cleaner for n8n; alternatively I can add a small JSON endpoint (`{date, rows:[{sku,warehouse,available}]}`) if you'd prefer to post to the app instead of writing Supabase directly — tell me which you'd like.

---

## Flow 3 — Open-actions snapshot (weekly)

**Purpose.** Every **Thursday at 11:59 GMT**, snapshot the count of open supply actions (per the ACTIONS engine) into a weekly time-series. Feeds the **Open-actions scoreboard** on `#/supply/reports/metrics` (the weekly trend). Replaces the manual "📸 Snapshot now" button there.

**⚠️ Already partly automated — please reconcile, don't duplicate.** This snapshot **already runs on a Vercel cron**: `vercel.json` schedules `59 23 * * 4` (Thursday **23:59** GMT) → `GET /api/cron/action-metrics` → `snapshotOpenActions()` → upserts `planner.action_metrics_snapshot`. Ben wants it at **Thursday 11:59 GMT**. So the cleanest options are:

- **Option A (simplest — no n8n):** change the Vercel cron in `vercel.json` from `59 23 * * 4` to `59 11 * * 4`. One line, done. The endpoint upserts the current ISO-week row, so re-running is idempotent.
- **Option B (n8n, for consistency with Flows 1 & 2):** create an n8n cron `59 11 * * 4` that calls the snapshot endpoint (auth as per Flow 1), **and remove the Vercel cron** so it doesn't also fire at 23:59 (otherwise you'd snapshot twice — same week row, so it just overwrites, but cleaner to have one owner).

**Endpoint:** either `GET /api/cron/action-metrics` (the existing cron target) or `POST /api/supply/action-metrics/snapshot` (what the manual button hits) — both call the same `snapshotOpenActions()`.

**Note:** the scoreboard's caption currently reads "weekly snapshot — Thursday 23:59 GMT". If you change the time to 11:59, ping Ben and he'll update that label (a 1-word app change).

---

## Notes

- Both are **read-from-source → write** flows; no complex logic. Flow 1 ≈ 2 nodes (cron + HTTP). Flow 2 ≈ 4 nodes (cron + Cin7 pull + transform/map + Supabase upsert).
- Flow 2's branch map lives in `server.mjs` `_INV_BRANCH_MAP` (single source of truth) — keep them in sync; if the map changes there, mirror it in the n8n transform (or better, expose it via a tiny endpoint so n8n reads it — I can add that if useful).
- CA is being decommissioned, so all `ca_*` warehouses are intentionally excluded.
