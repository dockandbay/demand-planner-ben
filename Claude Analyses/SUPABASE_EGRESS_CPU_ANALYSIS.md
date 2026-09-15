# Supabase egress + compute-CPU deep dive (2026-08-12)

**Goal:** cut Supabase **egress** (bytes leaving the DB) and **compute CPU** (query execution) without hurting front-end performance.

Egress = bytes the DB ships to the app server (Vercel). CPU = query execution on the DB. Vercel→browser bytes are *Vercel* bandwidth, not Supabase — so the browser page size is a separate concern from this.

---

## Measured drivers (sandbox, mirrors live structure)

**The page "data build" is the dominant source of BOTH egress and DB CPU.** On every serve it runs ~12–14 queries in parallel (`_buildDataVals`) and pulls, per build:

| Pull | Bytes | Rows | Notes |
|---|---|---|---|
| `sales_actuals` (full, all history, all cols) | **7.8 MB** | 83,926 | 34 MB table; full seq scan each build |
| `forecast_outputs` (full) | **3.3 MB** | 34,320 | full scan each build |
| `v_product_inventory` ×2 in buildSKURAW | ~1.3 MB | 18,297 ×2 | cheap view (18 ms, unpivot of products) |
| others (DATA, PROD_CONST, CATS…) | ~1–2 MB | — | |
| **≈ 12+ MB per build** | | | |

**How often the build runs** decides everything:
- In-process cache `_dataCache`, `DATA_TTL_MS = 300000` (5 min), boot-warmed, stale-while-revalidate, invalidated on forecast save.
- **Vercel caveat (confirmed):** the cache is per-process. Serverless **cold starts each re-run the full 12 MB build** (boot warm), and warm instances rebuild every 5 min. So under sporadic traffic the 12 MB build runs far more than "every 5 min" — it is the biggest repeated egress + the biggest repeated DB CPU (full scans of the two largest tables).

**Secondary drivers**
- **Per-request complex queries** (PO grid `PO_ROWS_SQL`, cashflow, order-plan, actions) — cached only in-process (`poRowsCache` 10 min, `makeCache`), so **every cold start re-pays them**.
- **Client polls per open tab:** `loadTlNotifs` (60 s) + `loadProductUnread` (60 s) → 120 req/hr/tab of small COUNT-ish queries. `prewarmActions` every 10 min/instance.
- **New this session:** the PO-delivery snapshot fires on *every* PO-grid load (INSERT…SELECT over ~200 POs joining suppliers/branches/shipments). Cheap but self-inflicted DB CPU on a hot path — right-size it.

**Ruled out (low reward):**
- Materialising `v_product_inventory` — measured 18 ms, trivial.
- Date-pruning `sales_actuals` — only 7% of rows are >30 months old (data already spans just Jan-24→Aug-26); the plan needs ~24–30 mo for YoY.

---

## Recommendations — ranked by risk / reward (no front-end impact)

### 🟢 HIGH reward · LOW risk — do first
- **R1. Widen `DATA_TTL_MS` 5 min → 30–60 min.** Source data is ETL-fed (daily/periodic) and forecast-save already invalidates, so a longer window is safe. Cuts warm-instance rebuilds 6–12×. *One-line change; I can do it now.* (Helps warm instances; cold starts still rebuild — see R2/R4.)
- **R2. ETL-triggered cache invalidation.** Have n8n POST a rebuild/invalidate after each ETL load (reuse the existing `N8N_WEBHOOK_SECRET` + received-POs webhook pattern). Then the TTL can be very long and the 12 MB build runs **only when data actually changes**, not on a timer. *Needs Diviyaj/n8n.* Biggest safe egress+CPU cut on the warm path.
- **R3. Widen the two 60 s polls to 3–5 min** (or make event-driven). Notifications a touch less real-time; otherwise invisible. *I can do it now.*
- **R3b. Time-throttle the PO-delivery snapshot** (once per ~10 min/instance instead of every grid load). Preserves detection, removes the per-load DB write. *I can do it now.*

### 🟡 HIGH reward · MEDIUM risk — the structural fixes for Vercel
- **R4. Shared cross-instance cache for the built data (+ hot query results).** A **Vercel KV / Upstash Redis** store (NOT a Supabase table — reading a 12 MB blob back from Supabase is still egress) holding the built JSON, refreshed on ETL/edit. Cold starts then read from KV, so the 12 MB Supabase build stops running per cold start. *Infra = Diviyaj.* **This is the single biggest structural win** for the Vercel cold-start pattern.
- **R5. Browser-side cache of the heavy globals** (`_SKU_RAW`/`FC_OUTPUTS`) in IndexedDB keyed by a small data-version token the server returns. Repeat loads (refresh, re-open, version auto-reload — the common pattern) skip the pull entirely → cuts egress for repeat loads and *speeds up* the front end. Pair with making lazy-load the default. Risk = invalidation correctness (mitigated by the version token).

### 🟠 MEDIUM reward
- **R6. Lazy-load default** (`?lazysku=1` behaviour as default): ships `_SKU_RAW`/`FC_OUTPUTS` empty, fetched once after paint from the warm cache. Mostly cuts *Vercel* bandwidth + speeds first paint; only indirectly helps Supabase. Best combined with R5.
- **R7. Column-prune / server-aggregate remaining wide pulls** where a report doesn't need every column. Incremental.

---

## Suggested sequence
1. **Now (I can do, zero FE risk):** R1 (TTL 30–60 min), R3 (polls 3–5 min), R3b (throttle snapshot). Est. large cut to warm-path egress + CPU immediately.
2. **With Diviyaj:** R2 (ETL-triggered invalidation) then R4 (KV shared cache) — removes the cold-start rebuild, the dominant remaining driver.
3. **Then:** R5 browser cache + R6 lazy default for the repeat-load pattern.

All items keep the same data reaching the browser — they change *how often / from where* it's fetched, not *what* the user sees.
