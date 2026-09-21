# Deploy note — KV shared data-cache (Supabase egress/CPU fix) · v26.902 · 2026-08-12

**Why:** we're over Supabase egress + compute-CPU quota. Root cause (measured — see `Claude Analyses/SUPABASE_EGRESS_CPU_ANALYSIS.md`): the page "data build" pulls **~12 MB from Supabase** per run — dominated by `sales_actuals` (7.8 MB / 84k rows) and `forecast_outputs` (3.3 MB / 34k rows) — and the in-process cache is **per-process, so every Vercel serverless cold start re-runs the whole build** (full seq-scans of the two biggest tables). That repeated 12 MB pull is the biggest egress + DB-CPU source.

**Fix shipped (code):** the built blob is now cached in **Vercel KV (Upstash)**, refreshed only when data actually changes (n8n upload or a forecast edit) — so cold starts read it from **KV, not Supabase**. The Supabase build then runs ~once per upload instead of per cold start.

Sales data changes **only** on Diviyaj's n8n upload, so this is a near-total cut of the biggest source once wired.

---

## Code changes (already committed, `phase-2.1-suppliers`)
`server.mjs` only. **Feature-flagged** — with no KV env set, behaviour is byte-identical to today (in-process cache). Verified locally (KV off): page serve, `/api/demand/sku-data`, and the new invalidate endpoint all work; page renders; no JS errors.

- KV-aware data cache: `getDataVals()` = in-process → **KV (cold start, off-Supabase)** → Supabase build. Blob stored gzip+base64, **chunked at 900 KB** (`horizon:data:{0..n}` + `horizon:data:meta`) to stay under the REST value limit.
- `refreshDataCache()` = authoritative Supabase rebuild **+ write to KV** so all instances converge.
- Forecast edits now call `invalidateDataCache()` (rebuild + repush to KV), background/fire-and-forget (save latency unchanged).
- `DATA_TTL_MS` 5 min → **10 min** (with KV+invalidation it's just a heartbeat that re-reads KV cheaply, not a Supabase rebuild timer).
- **New endpoint:** `POST /api/data-cache/invalidate` — rebuilds the data cache from Supabase once and pushes to KV. Awaits the rebuild so the caller gets a success confirmation. Gated by the **existing** `N8N_WEBHOOK_SECRET` (header `x-webhook-secret`); auth-gate-exempt like the received-POs trigger.

## What Diviyaj needs to do

### 1. Provision Vercel KV (Upstash Redis) — REQUIRED for the fix to bite on Vercel
- Create a **Vercel KV** store and link it to the Horizon project. Vercel injects `KV_REST_API_URL` + `KV_REST_API_TOKEN` automatically — those are the two env vars the code checks (`KV_ON`). No other config, no npm dep (uses `fetch` + built-in `zlib`).
- **Without these env vars the code no-ops to the current in-process cache** (safe), so it can be deployed before KV exists — it just won't help until KV is linked.
- ⚠️ **Value-size check:** the blob is ~12 MB JSON → ~2 MB gzip → chunked at 900 KB (≈3 chunks). Upstash free tier historically caps values ~1 MB, so chunking should be fine; confirm on the chosen plan. If a chunk still trips a limit, lower `KV_CHUNK` in `server.mjs`.

### 2. n8n — call the invalidate endpoint after each upload
After the node(s) that write `sales_actuals` (and inventory/products) into Supabase, add an HTTP POST:
```
POST https://horizon.dockandbay.com/api/data-cache/invalidate
Header: x-webhook-secret: <N8N_WEBHOOK_SECRET>   (same secret as received-pos/process)
```
Response `{ ok:true, rebuilt:14, kv:true }`. This makes the Supabase build run once per upload. (Forecast edits already self-invalidate.)

### 3. (Optional, later) CDN-cache the lazy payload
`GET /api/demand/sku-data` returns the heavy globals. Serving it on a version-stamped, CDN-cacheable URL would let repeat loads skip the function + Supabase entirely — a further egress cut. Not in this change; flag for a later pass.

## Env vars summary
| Var | Required | Purpose |
|---|---|---|
| `KV_REST_API_URL` | for the fix | Vercel KV endpoint (auto-set when KV store linked) |
| `KV_REST_API_TOKEN` | for the fix | Vercel KV token (auto-set) |
| `N8N_WEBHOOK_SECRET` | already set | gates `/api/data-cache/invalidate` (reused) |

No migrations, no npm deps.

## Not yet done (quick follow-up wins, low risk — see the analysis doc)
- Widen the two 60 s client polls (timeline / product-unread) to 3–5 min.
- Time-throttle the PO-delivery snapshot (currently every PO-grid load).
