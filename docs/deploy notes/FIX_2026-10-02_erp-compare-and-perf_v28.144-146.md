# FIX for Diviyaj: ERP compare Fulfil-only + menu perf (v28.144 to v28.146; on top of v28.143)

**Branch** `fix/first-click-boot-freeze` (still NOT merged into `phase-2.1-suppliers`, so it can't overwrite your `.1-.3` patches).
Commits: `3f9fb804` v28.143 (first-click freeze, see FIX_2026-10-01 note) → `4494285e` v28.144 → `5ddd3839` v28.145 → `73024d0d` v28.146.
**Patch** `FIX_2026-10-02_erp-compare-and-perf_v28.144-146.patch` = `git diff 3f9fb804..73024d0d` on `artifact_v16.7.html`, `supply/inject.html`, `server.mjs`. Apply after the v28.143 patch.
No migration, no env var. Server restart needed (server.mjs changed).

## v28.144: ERP compare (Ben: "we are now 100% on fulfil")
- SUPPLY ▸ ERP compare: Cin7 section, its fetch and its badge fetch removed. Fulfil only. Badge throttled to one fetch per 5 min.
- PO ▸ Import/Export: "⬆ Import from Cin7" removed; new **⇄ ERP compare** button opens the Fulfil compare in a side drawer.
- **Matching:** a Fulfil PO counts as in the planner if its Fulfil id is a `po_links` (fulfil, linked) `external_id`, OR its number or reference matches a planner `po`, `erp_po` or linked `external_ref` (trimmed, case-insensitive). Ben's case: Fulfil PO with reference `PO-57EULX-SAMPLES` (link 363). Live read-only check: 31 of 32 Horizon-style Fulfil POs now match.
- BUY & MOVE Actions "ERP POs not in planner" uses the Fulfil compare **cache only** (never waits on Fulfil). Was the Cin7 compare.
- Server `/api/supply/bi/erp-compare` (+ `/ignore`) left in place, unused. Safe to delete later.

## v28.145: perf (items 1-3 of the 01-Oct menu crawl)
1. `hzEnsureDemand()` replaces 7 unconditional `buildLiveDemand()` calls (Exceptions, Safety stock, Ship bags, Inventory status, Anomalies, Cash flow compute, Auto Forecast feed). Rebuild only when `!DEMAND_BUILT || BUY_FC_STALE`.
2. CONFIG ▸ Products renders 200 rows then "Show more / Show all" (was 2,078 × 191 cells).
3. `/api/supply/xero/status`: regions in parallel + 2-min cache (`?fresh=1` bypass; callback/disconnect clear). `/api/supply/flexport/status?lite=1`: no Flexport API probe (label only).

## v28.146: clicking Buy & Move responds immediately
Ben: clicking BUY & MOVE in the menu did nothing. On a cold entry (demand not built yet: any SUPPLY landing since v28.143, or after a forecast edit) the ~3 s build ran inside the click; the trigger was the one-time PP-cover build at the top of `render()`. Now, for BUY & MOVE views, the tabs + a "Loading Buy & Move…" panel paint first, the rail expands, and the build runs 160 ms later, then the page renders (skipped if the user has navigated away). The PP-cover build is skipped for BUY & MOVE views (the deferred build covers it). Measured: click handler 3,077 ms → **16 ms**; loading panel + tabs + rail L2 visible at +120 ms; Actions page rendered by +320 ms after the build.

## Verified (sandbox, jsdom crawl on the served page)
| | before | after |
|---|---|---|
| DEMAND ▸ Exceptions, each sub-tab | ~2.9 s rebuild + render | render only (0-1.5 s), no rebuild |
| Analysis ▸ Safety stock / Ship bags | ~3.0 s | 0 s block |
| CONFIG ▸ Products | 6.2 s max block, 16.6 s total | 0.6 s |
| Xero status | 4.5 s every call | 5.2 s cold, 3 ms cached |
| Flexport page status | 4.9 s | 0.3 s |
| ERP compare tab | Cin7 + Fulfil | Fulfil only (no `bi/erp-compare` call) |
| Buy plan vs `?lazysku=0` baseline | | **0 / 387 rows differ, 75,113 units** (direct BUY, and Exceptions → BUY; re-checked after v28.146) |

Still open (not in this branch): Auto Forecast's first demand build on a SUPPLY page (~3 s, genuinely needed); Shipments/Productions crawl "still loading" (pre-existing); portal-signals 404 / admin pages hitting a 401 portal endpoint; order-plan 6.3 MB and sku-data 4.2 MB payloads.
