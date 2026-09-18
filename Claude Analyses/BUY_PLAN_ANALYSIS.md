# Buy Plan Engine — Deep Analysis & Stress Test (2026-08-02)

Reviewed the `BP` buy engine in `artifact_v16.7.html` (~lines 1141–2843) from three lenses — senior developer, forecasting/inventory model, and empirical stress test. Context: fix **v26.393** (`fwdDemand` off-by-one) already landed and is confirmed correct by both reviewers.

## Stress test results (jsdom + `buildLiveDemand`, crafted SKUs)
- **Robustness: clean.** Across **1,877 real sku×markets**: 0 NaN, 0 negative, 0 absurd (>1M) quantities. No throws.
- **Edge scenarios:** ZERO-demand→0 ✓ · huge-stock→0 ✓ · MOQ 5000 enforced ✓ · future-launch first-buy→7000 ✓ · zero-lead→all normal ✓ · discontinue→no normal buy past cutoff ✓.
- **⚠ Confirms the structural issue:** `SPIKE 5000 (Nov only), lead 12wk` → **Buy 3PL 0, Urgent 4,900**. `CLIFF 5000×4, lead 20wk` → **Buy 3PL 0, Urgent 20,000**. Demand inside the lead window lands entirely in **Urgent** as a minimal rush, not a proper replenishment — the same shape as PICNIC.

## HIGH priority

**1. Near-lead-time horizon is structurally under-bought (the big one).**
The "overdue" normal-buy path is described in comments (2397–2401) but **never implemented** — `buyOverdue` is read in 3 places but **never written**, and the `else` at 2420 does nothing. So demand whose ideal placement is inside the lead window (`pi=i−lm < 1`) is handed entirely to the **Urgent** scan — which sizes only to reach **zero cover** (`urgentQtyNeeded` accumulates `abs(negative stock)`, target 0 weeks), not to restore target cover. Result: long-lead / sustained-deficit SKUs get a minimal rush and sit at ~0 cover until a future `pi≥1` month opens. This is why PICNIC's Sep–Dec and the SPIKE/CLIFF stress cases all show as urgent-only. **Fix direction:** either implement the documented clamp (place at `pi=1`, set `buyOverdue`, size to the gap) or make Urgent size to `URGENT_THRESHOLD_WKS`/bridge-to-next-arrival, not zero.

**2. `getBuyQtys` summary drops buys placed beyond index 1–2.** (`START_IDX=1`, `idxCount=AFTER15?2:1`, ~1255). `buyDisplay[pi]` has no upper clamp, so a buy correctly placed at index 3+ (long lead, arrival further out) is computed but **not summed into the Buy-3PL list** — shows 0 while the detail table shows it. Under-reports exactly the long-lead SKUs you most want surfaced. Interacts with the v26.393 fix (more/bigger buys now).

**3. Stale demand overlay after in-tab forecast edits.** `buildLiveDemand()` (rebuilds `md.demand` from `FC_OUTPUTS`) runs only on BUY **tab entry** (`renderBuyView`), but every settings input calls `BP.render()` directly — which clears `BUY_CACHE` and recomputes against the **previous** demand overlay. Numbers change on setting tweaks so it *looks* live, masking it. **Fix:** call `buildLiveDemand()` at the top of `render()` (or gate on a "forecast dirty" flag).

**4. FBA transfer sizing is inconsistent (PASS 1 vs PASS 2).** PASS 1's 3PL-protection sim reads `assumedArr[fi]` for future months, but in the forward PASS 1 those future buys **don't exist yet** (0) → over-conservative → under-transfers to FBA. PASS 2 (display) reads a fully-populated `assumedArr` → shows a **different** (larger) transfer than the one that actually drove the buy math. Displayed ≠ used.

## MEDIUM
- **Urgent scan sizing sim double-counts / clamps differently** than the trace that detected the danger (`simStock` seed vs `stockTrace.closing`, un-clamped vs `Math.max(…,0)`) — rush qty can be over/under the real deficit (~2478).
- **Urgent look-ahead off-by-one:** `i>MAY_OFFSET+URGENT_LOOKAHEAD` scans 4 months (2,3,4,5), comment says 3 (~2438).
- **`w3next>0` guard suppresses valid cliff buys:** the normal-buy gate keys off *next* month's demand; on a cliff (high `i`, ~0 `i+1`) it can block a real buy even though `tg3` (now incl. arrival month) shows a gap (~2396). *Directly related to the v26.393 fix — worth changing to `demAt(i)>0 || w3next>0`.*
- **Discontinue:** 3PL buy demand is zeroed post-cutoff but FBA transfers use *real* post-disc demand — a discontinuing SKU with an FBA tail can't buy stock to feed it. Confirm intended.
- **First-buy A-tier boost** multiplies the *gap* by 1.5 then carton+MOQ rounds → can wildly over-buy small A-tier launches (~2408).
- **Lead rounding** `Math.round(l3/4.33)` can model orders arriving ~days early; transit `lt` applied to transfers but not 3PL buy arrival — confirm `l3` includes transit (~2232).

## LOW
- Remaining-proration divides by `total` with only an `elapsed>0` guard → a bad extract `cur_days.total=0` NaNs a whole SKU (~2296).
- First-buy date compare assumes zero-padded ISO; short/malformed `launch` mis-classifies (~2217).
- Sub-carton FBA need dropped to 0 assuming the transfer path recovers it — not guaranteed (~1264).
- MOQ not carton-aligned (`Math.max(r,moq)`); dormant while `moq` all-null (~2409).
- Cover colour band uses base `t3`, ignoring first-buy/A-tier boost → correctly-stocked launch shows red (cosmetic, ~2707).

## Bottom line
The engine is **numerically robust** (no NaN/negative/crash across ~1,900 sku×markets). The dominant real issue is **HIGH-1**: the normal-vs-urgent split leaves the near-lead-time horizon under-bought — the v26.393 fix corrected the *arrival-month* exclusion, but the deeper "demand inside the lead window becomes a minimal rush, never a proper replenishment" behaviour remains. HIGH-2/3/4 cause the surfaced numbers to under-report or diverge from what drove the math.
