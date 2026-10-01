# FIX for Diviyaj — first menu click does nothing for ~3–5 s after the page opens (v28.143, on top of live v28.142.3)

**Branch** `fix/first-click-boot-freeze` (NOT merged into `phase-2.1-suppliers`, so it can't overwrite your `.1–.3` patches).
**Patch** `FIX_2026-10-01_first-click-boot-freeze.patch` — 2 files (`artifact_v16.7.html`, `supply/inject.html`), client-only. No migration, no server change, no env.
I checked live's served bundles (v28.142.3): the three lines this patch touches are unchanged there, so it should apply cleanly — but please eyeball against your copy.

## What Ben reported
First click on menus (Supply ▸ Purchase Orders, ▸ Order plan, ▸ Quality Control …) doesn't load; clicking again ~10 s later works, then everything is fast.

## Cause (measured on live 01-Oct, Ben's Chrome, read-only)
On a SUPPLY landing the main thread is blocked by DEMAND work nobody is looking at:
- lazy SKU loader → `renderMain()` of the whole DEMAND plan: **~1.7 s**
- v28.087 prewarm `warm()` → `buildLiveDemand()` (requestIdleCallback, but one uninterruptible block): **~3.0 s**
Live trace: click PURCHASE ORDERS at 6.37 s → hash changes instantly → **main thread frozen 6.4 → 9.5 s** → page paints at 9.5 s. (Ignore repeating ~0.9 s "freezes" in a background tab — that's Chrome timer throttling.)
Plus: `renderBuyMoveActions()` calls `buildLiveDemand()` **unconditionally** → ~3 s on every BUY & MOVE entry.

## Fix
1. `hzDemandOnScreen()` = not on `#/supply|product|client|config`. Lazy loader renders DEMAND only when it's on screen (navigating to DEMAND renders it anyway).
2. Boot KA load: build the overlay only when DEMAND/BUY is on screen; else leave `DEMAND_BUILT=false` (BUY/DEMAND build on entry — existing guards).
3. Prewarm `warm()` stands down while the user is on SUPPLY/PRODUCT/CLIENT/CONFIG.
4. `renderBuyMoveActions` build gated on `!DEMAND_BUILT || BUY_FC_STALE` like every other caller.

## Verified (sandbox, jsdom on the served page)
| | before | after |
|---|---|---|
| SUPPLY landing, first 20 s | renderMain 1.7 s + buildLiveDemand 3.0 s | **no DEMAND work** |
| first DEMAND visit | (paid at boot) | build 3.0 s + render 1.6 s + 0.9 s, once |
| BUY after DEMAND | 3.0 s rebuild | **0.14 s** |
| Buy plan vs `?lazysku=0` baseline | — | **0 / 387 rows differ** (SUPPLY→DEMAND→BUY and direct BUY landing) |

Trade-off: the first DEMAND/BUY visit now pays the ~3 s build (with "Loading…") instead of it freezing whatever page you're on. v28.142 made that build cheap (was ~13 s when v28.087 added the prewarm). Proper long-term fix: make `buildLiveDemand` yield (chunk per market) or move it to a worker.

## Verify on live after applying
Fresh load on `#/supply/payments/payments-due`, click PURCHASE ORDERS within 3–6 s → page paints in < 1 s. Then BUY ▸ Buy plan shows SKUs; BUY → DEMAND → BUY second entry is instant.
