# Spec — Auto Forecast: buy-to-cover (mirror the buy plan)

**For Ben's sign-off before any code. Author: Claude. Date: 2026-08-21.**

## 1. The problem
The Auto Forecast (`server.mjs computeAutoForecast`, report at SUPPLY ▸ Payments ▸ Auto Forecast) is a **different, simpler engine** than the buy plan, so its near-term "units to order" look low and don't match what the buy plan tells you to place:

- **Order-when-you-run-out, no cover target.** `arrive = max(0, demand − on-hand − open POs)`, rolled forward. The buy plan buys **ahead to a weeks-of-cover target**; the AF only buys the bare monthly shortfall, later.
- **Overdue buys are hidden.** Order month = demand month − lead. Near-term demand's order month falls before the window → dumped into an `overdue_units` scalar (measured **36,638 units** on 21-Aug) that is **omitted from the units grid** (footnote only).
- **Truncation.** Buys past the 18-month window are dropped (`truncated=true`).
- **Cost basis** is a forecast-weighted `coalesce(products.cost, cost_lx, cost_xr)` (not the supplier-aware / price-list cost the Order Plan uses) — separate issue, noted.

Net: the AF and the buy plan will never agree while they're two engines.

## 2. The core decision — two ways to make them "identical"

**Option A — reimplement the buy plan's cover logic inside `computeAutoForecast` (server).**
- Replicate: per market × pool (3PL/FBA) cover-week targets (from `products.target_cover_weeks_<mkt>_<pool>` / category fallback), lead times (supplier production_days + branch sea transit), the urgent pass, EOL/discontinue cap, MOQ, FBA-transfer-first, non-GRS drawdown, Complex Rules raise-only.
- Pros: self-contained server change; the report stays server-rendered.
- Cons: **duplicates the buy engine and will drift** from the real buy plan (the buy plan lives in the artifact and changes often). High risk of "AF says X, buy plan says Y" forever.

**Option B — drive the AF from the buy plan's ACTUAL computed buys (recommended).**
- The buy plan (artifact `BP` engine) already computes, per SKU × pool × month, the exact buy quantities (`proj[i].bQ`, urgent `b3u`, FBA transfers, etc.). The AF becomes a **cash-phasing layer on top of those quantities** rather than its own demand model.
- Mechanics: the client (which already runs the buy plan) produces a per-supplier × month buy-quantity table from the buy plan output and posts it to a lightweight endpoint that phases it into deposit/completion/balance/freight/duty using supplier terms (the phasing code already exists in `computeAutoForecast`). OR the report is rendered client-side reusing the buy-plan output directly.
- Pros: **identical by construction, zero drift** — the AF spend = the buy plan's actual plan, phased into cash. One source of truth.
- Cons: bigger refactor; the AF stops being a standalone server query and depends on the buy-plan build (which is already how the SUPPLY app gets buy numbers).

**Recommendation: Option B.** "Identical logic" is only truly achievable if the AF consumes the buy plan's output. Option A guarantees future divergence.

## 3. Proposed design (Option B)
1. **Buy-quantity feed.** After the buy plan builds (`buildLiveDemand` + `buildLiveBpOverlay`), collect per **supplier × order-month** buy units across all SKUs/markets/pools — using the buy plan's own numbers (`proj[i].bQ` + urgent + FBA transfer), with the same **order-month = arrival/needed month − lead** already in the buy engine. Respect the **20th-cutoff** rule (see 1b) so "buy now" is the correct month.
2. **Overdue → month 0.** Any buy whose order month is at/before the current month is placed in the **first window month** ("order now"), not hidden. (Directly fixes the 36,638-unit hole.)
3. **Cash phasing (reuse existing).** Per supplier terms: deposit at order month, completion at order+production_days, balance at arrival+credit_days, duty at delivery, freight containerised per market/month. This logic already exists in `computeAutoForecast` — keep it, just feed it the buy-plan quantities.
4. **Cost.** Use the same cost the Order Plan/price list uses (supplier-aware / price-list estimate) so spend ties to the PO estimates — replaces the blunt `coalesce(cost,…)`.
5. **Window.** Keep 18 months but surface anything truncated as an explicit line, not a silent drop.
6. **Currency.** Keep USD base + GBP view, but replace the hardcoded `AF_GBP=1.34` with the CONFIG FX rate.

## 4. Fallback (if Option B is too big now)
Pragmatic Option A-lite: keep the server engine but (a) **fold overdue into month 0**, (b) **add the cover-week target** (buy to `demand over next N cover-weeks − pipeline` instead of just this month's shortfall), (c) fix cost + FX. This narrows the gap to the buy plan without a full refactor, accepting some drift.

## 5. Risks / notes
- **Financial report** — any change moves the projected cash curve. Ship with a before/after comparison (old vs new monthly totals) for Ben to eyeball.
- Depends on the buy plan being correct first (items 1a/1b land before this).
- Buy-plan snapshot harness ([[buy-plan-snapshot-harness]]) is the way to pull the per-month buys offline for verification.

## 6. Decision needed from Ben
- **Option A vs B** (recommend B).
- If B: OK to make the AF report depend on the buy-plan build (client-driven), rather than a standalone server query?
