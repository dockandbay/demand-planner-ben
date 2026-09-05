# Forecast-related Reports — Logic Audit (2026-08-02)

Read-only audits (two independent reviewers) of the reports downstream of the demand forecast, per Ben's ask: "ensure related reports to demand forecast are accurate in logic. Auto forecasts, exec summary." No code changed yet — these are findings to triage into fixes.

> **UPDATE 2026-08-05 (verified against current code):**
> - **F2 — RESOLVED.** The subcategory query IS pinned: `run_id = (SELECT max(run_id) FROM planner.forecasts WHERE level='subcategory')` (server.mjs ~7819); SKU side uses `max(run_id)` too. No silent-multiply risk.
> - **B-HIGH (Exec vs Revenue basis) — RESOLVED.** `buildExecData` uses the RAW/overridden forecast with **no BI_CACHE overlay** (artifact ~9236: "use the RAW forecast (no BI_CACHE / AI overlay)") and `curMonthForecast` for the current partial month — matching the Revenue pop-out + plan. Ben's confirmed convention (actual/implied forecast, not BI-recommended) is already what it does.
> - Still open to triage: **F1** (buy signal is largely an allocation artifact), **F3** (currency-blended cash labelled USD), Exec MEDIUM (LY "Actual" treats missing 2025 rows as £0 → inflates YoY), and the LOW items.

---

## A. AUTO FORECAST — `/api/scenario/auto-forecast` (server.mjs ~7113–7231) + `renderAutoForecastReport` (artifact ~8419)

**What it actually is:** NOT a forecasting engine. It's a *differencing* report: `buy = max(0, subcategory_forecast − Σ SKU_forecast)` per subcat×market×month. All seasonality/growth lives upstream in the saved forecasts. It never writes back (read-only decision view + CSV).

### HIGH
- **F1 — The "gap" is largely a structural artifact, not unmet demand.** SKU forecasts are derived from the subcat total by shares summing to 1, then clamped (pre-launch→0, discontinued→capped at remaining stock). So Σ SKU ≤ subcat by construction, and the "units to buy" gap is dominated by (i) parked share of unlaunched SKUs and (ii) deliberately-run-down discontinued SKUs. Buying against the discontinued component contradicts the stock cap. **Fix:** exclude the discontinued-rundown component; decide whether a launched sibling absorbs the pre-launch parked share before calling it buy.
- **F2 — `catDem` sums `planner.forecasts level='subcategory'` with NO `run_id` filter** (server.mjs ~7176), while `skuDem` reads unversioned `forecast_outputs`. `forecasts` is run-versioned. If the external job ever leaves >1 subcategory run, every buy number multiplies by the run count. Works today only because one run happens to exist. **Fix:** pin to `run_id = max(...)`. (Confirm with Diviyaj whether the job accumulates runs — latent HIGH.)

### MEDIUM
- **F3 — Cost is currency-blended but labelled USD.** `avg(l.cost_price)` mixes suppliers priced in different currencies (cost held in supplier default_currency); GBP derived at hardcoded 1.34. Whole cash-out plan affected. **Fix:** normalise to one currency via supplier default_currency + FX; drive GBP off a live rate.
- **F4 — Units table and Payments table cover different order sets.** Orders whose order-month is before the window are dropped from Units silently, but their payment legs still show; near-term (just-overdue) buys vanish from units. **Fix:** surface an "already-overdue this window" line or set truncated=true on that branch too.
- **F5 — Zero-cost fallback silent** for subcats with no PO history → shows units but £0 cash, no flag. **Fix:** flag missing cost or fall back to products.cost_<code>.

### LOW
- **F6** GBP everywhere divides by hardcoded `AF_GBP=1.34` (artifact ~8418). **F7** dead `cover` param + header comment describes a different (cover-netting) model than the code implements — misleading. **F8** ref-code key omits year (unsafe if window >12 months).

**Net:** arithmetic is sound; real risks are conceptual — F1 (buy signal is mostly an allocation artifact) and F2 (silent multiply if a 2nd run lands), plus F3 (currency-blended cash).

---

## B. EXECUTIVE SUMMARY — `buildExecData()` (artifact ~7815) + `renderExecView()` (~8473) + new `execSumPopRender()`

### HIGH
- **Exec summary and Revenue pop-out use different forecast bases.** `buildExecData` overlays Claude BI-rule adjustments (`BI_CACHE`) on forecast units (~7912); `revMonthly` does NOT (~7304). For any subcat with an active BI rule, the two surfaces report different revenue/units for the same country·channel·month. **Fix:** one convention — fold BI_CACHE into `revMonthly` too, or drop it from `buildExecData`.

### MEDIUM
- **"FY26 · Actual" label overstates it.** FY26 = Σ each FY27 month's prior-year value (lyU/lyR); those are real 2025 actuals only where a row exists, else forecast-derived or £0. **Fix:** relabel "Actual (LY)"/"prior year".
- **Missing prior-year rows silently deflate LY → inflate YoY.** A month with no 2025 counterpart contributes 0 to FY26; YoY then overstates growth; badge even prints "new" for existing categories lacking a 2025 row. **Fix:** track LY coverage; suppress/asterisk YoY when LY months missing.
- **Current partial month counted as full actual, unlike the main plan.** Exec + revMonthly use MTD actual for CUR_MONTH; the plan's `fyTot` substitutes `curMonthForecast`. Exec/Revenue agree with each other but both differ from the plan grid. **Fix:** use curMonthForecast for CUR_MONTH to match, or document the MTD basis.

### LOW
- buildExecData uses subcat `calc().fu`, may ignore per-SKU overrides (`skuOutFC`) — confirm calc().fu folds them in. · Latent NaN if ASP/units non-numeric (coerce with ||0). · FY28 per-month YoY badges compare forecast-2027 vs mixed-2026 — dim/footnote them.

**Consistency wins:** the new exec-summary popout IS consistent with the full report (identical FY arrays, psum, labels). FY windows are correct (FY27 = full Mar–Feb; FY28 = 10mo, labelled partial). No divide-by-zero.

**Net:** biggest risks — (1) BI_CACHE forecast-basis mismatch between exec and Revenue pop-out (HIGH); (2) LY treats missing prior-year rows as zero while labelling the result "Actual," inflating headline YoY.
