# F1 — Auto Forecast "units to buy" is largely an allocation artifact

Scope doc (2026-08-05). Read-only analysis + proposed phased fix. No code changed yet.

## What the Auto Forecast does today

`computeAutoForecast()` (server.mjs ~7715) is a **rolling monthly buy plan per subcategory × market**:

- `demand[m] = max( catDem[s][m], skuDem[s][m] )`
  - `catDem` = the **subcategory** forecast (planner.forecasts, level='subcategory', latest run) — the full seasonal demand for the subcat.
  - `skuDem` = **sum of the per-SKU** forecasts (planner.forecast_outputs) — already clamped: pre-launch months = 0, discontinued = run-down capped by remaining stock.
- Roll stock forward: `avail = stock + open-PO inbound`, `buy[m] = max(0, demand − avail)`, carry `stock = max(0, avail − demand)`.
- Order each buy at `demand month − lead`; cost it (deposit/completion/balance/duty/freight).

So it is **no longer** a pure `subcat − ΣSKU` difference (that was the old model). But the core F1 problem survives inside `max(catDem, skuDem)`.

## The problem

Whenever `catDem > skuDem`, `demand` is driven by the **subcategory total**, and the difference (`catDem − skuDem`, the "gap") gets bought. That gap is a mix of:

1. **Discontinued-rundown shortfall** — a SKU being deliberately wound down. Its `skuDem` is capped low (or 0), but `catDem` still carries its historical share, so the plan "tops up" to the subcategory total and **buys stock for demand that is ending**. This directly contradicts the run-down cap. **← the main artifact.**
2. **Pre-launch parked share** — a future SKU that has share in the subcategory forecast but `skuDem = 0` (not launched). The plan buys it, even though the SKU doesn't exist to order yet — unless a **launched sibling / replacement** genuinely absorbs that demand.
3. **Genuine live-SKU shortfall** — real, in-scope, launched SKUs whose forecast exceeds available stock. This is the legitimate buy signal.

Today all three are lumped into one "units to buy" number, at **subcategory** granularity, with **no attribution to a SKU** and **no breakdown** — so a buyer can't tell how much of the number is real.

## Why it matters

- Over-buys against discontinued SKUs (cash + stock tied to demand that's disappearing).
- Buys ahead for SKUs that can't be ordered yet (pre-launch), or double-counts when a replacement SKU already covers the demand.
- Erodes trust in the report — the headline units/cash can't be reconciled to specific SKUs.

Scope of impact: **the Auto Forecast report + its cash-out plan only.** It does **not** feed the main buy plan (`BP.buyplanItems`) — that's a separate engine. (To confirm during build, per the before/after-snapshot rule.)

## Proposed fix — phased

**Phase 1 — Decompose & show the gap (read-only, no buy-number change). SAFE to build first.**
For each subcat × market × month, split the demand into:
- live-SKU forecast (`Σ skuDem` for launched, in-scope, not-discontinued SKUs),
- discontinued-rundown component,
- pre-launch / future-SKU component,
- unexplained residual.
Surface a breakdown in the report (a "why this number" expander + a totals line: *X units real · Y discontinued · Z pre-launch*). Nothing changes in the buy total yet — this just makes the artifact visible and lets us measure how big the problem actually is on live.

**Phase 2 — Exclude the discontinued-rundown component from the buy (behaviour change, gated).**
Cap `demand` at the **live + replacement** SKU forecast, not the raw subcategory total, so we stop buying against SKUs that are being wound down with no successor. Where a discontinued SKU **has** a `replacement_sku`, transfer its share to the replacement instead of dropping it.

**Phase 3 — Attribute the pre-launch / replacement share to a real SKU.**
Use the `replacement_sku` link so a launched successor absorbs a predecessor's share; flag any remaining pre-launch gap as *"needs a SKU / decision"* rather than a firm buy. Optionally expose the buy at SKU granularity.

## Decisions needed from Ben

1. **Discontinued SKUs with no replacement:** drop their share from the buy entirely (recommended), or keep buying to the subcategory total?
2. **Pre-launch / future-SKU share:** treat as a firm buy, or surface as a flagged "decision" line (not auto-bought)?
3. **Granularity:** keep the report at subcategory level with a breakdown, or push it down to SKU-level buy rows?

## Recommendation

Build **Phase 1 now** (pure diagnostic — it quantifies the problem on live with zero risk to any buy number), review the real magnitudes together, then decide 1–3 and do Phase 2/3. Phase 2/3 change buy quantities, so they need Ben's sign-off + a before/after snapshot of the report totals.
