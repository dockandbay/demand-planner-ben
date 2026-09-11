# SPEC — SSM buy-plan logic (CONFIG toggle) + SSM Complex Rules

Prepared 17-Aug-26 · Owner: Ben · Status: DESIGN for approval (buy-plan-changing — build behind a default-OFF toggle)

Related: [[world-class-roadmap]], [[inventory-snapshot-backfill]] (backtest + tier/seasonal), [[complex-rules]] (existing engine), `Claude Analyses/SSM_Service_Level_Stock_Model_Brief.md` (business case).

---

## 1. Goal and guiding principle

Add a **CONFIG switch** that flips the whole buy plan between **two logics**:

- **Cover-weeks (current)** — flat weeks-of-cover per SKU/market, overridden by Complex Rules. *This is today.*
- **Service-level SSM** — cover sized per SKU to demand volatility, lead time and a **service-level target set by tier**, with a separate **seasonal pre-buy** mode.

**Principle: SSM is expressed as a *computed effective cover-weeks*.** The buy engine already computes `target_units = effective_cover_weeks × weekly_demand`, where `effective_cover_weeks = crCoverWeeks(base, rules)` in both the Buy-3PL and Urgent passes. SSM simply supplies a different `base` (derived from safety stock) instead of the flat `md.t3` / `md.tf`. Everything downstream (Complex Rules, urgent, FBA, transfers, popups, cover display) keeps working unchanged.

**Hard guarantee:** with the toggle OFF, the buy plan is **byte-identical to today** ([[buy-plan-before-after]] snapshot required each build).

---

## 2. The CONFIG toggle

**CONFIG ▸ Admin ▸ General → "Buy plan logic"** (admin-only), backed by `app_settings`, injected as a global `BUY_LOGIC`.

- `BUY_LOGIC = 'cover_weeks'` (**default**) → today's engine, untouched.
- `BUY_LOGIC = 'ssm'` → the SSM path below.

One global switch to start (whole plan). Phase 3 can add per-market / per-category scoping for gradual adoption. The Safety-stock tab and Recommendations tab stay as they are (advisory), so you can compare before flipping.

---

## 3. How SSM computes the target (the engine change)

For each SKU × market × pool (3PL, FBA), when `BUY_LOGIC='ssm'`:

```
SafetyStock (units) = Z × √( L·σ_d²  +  d²·σ_L² )
CycleStock  (units) = ReviewCycleWeeks × weeklyDemand
Target      (units) = SafetyStock + CycleStock
EffectiveCoverWeeks = Target / weeklyDemand      ← this replaces md.t3 / md.tf as the "base"
```

- `Z` = z-score for the SKU's **service-level target** (from tier/seasonal rules — §4).
- `d` = mean monthly demand; `σ_d` = demand σ (forecast-error where available, else demand variability — the exact source logic already in `renderSafetyStockView`).
- `L` = replenishment lead (3PL = production + China→market ship; FBA = 3PL→FBA transfer lead), in months.
- `σ_L` = lead-time variability (`LEADTIME_VAR`, data-driven; or a % of lead).
- `ReviewCycleWeeks` = configurable (default 4).

Then, exactly as today: `EffectiveCoverWeeks` goes through `crCoverWeeks()` (Complex Rules raise-only overrides + floors), and `target_units = crCoverWeeks(...) × weeklyDemand`. **No change to the buy arithmetic, the urgent trigger, FBA, transfers, or the popups** — they all read the effective cover-weeks.

*Why this is safe:* SSM is confined to producing one number (the base cover-weeks). If that number equals `md.t3`, the plan is identical. The whole change is "where does the base cover-weeks come from."

---

## 4. SSM Complex Rules — the heart of it

Today a Complex Rule sets a **cover-weeks (cover_months) override**, raise-only, matched by category/market/condition. Under SSM, rules instead set the **service level** and the **buy mode**. The rule engine, matcher (`crMatch`) and per-month window all stay; only the *action* of a rule changes.

### 4a. Rule kinds (new `rule_kind` field, backward compatible)

| `rule_kind` | Action | Applies in |
|---|---|---|
| `cover_weeks` (legacy) | Override cover-weeks (today's behaviour) | cover_weeks mode; in SSM mode treated as a **floor** (see 4d) |
| `service_level` | Set the service-level target (%) → drives Z → safety stock | SSM mode |
| `seasonal_prebuy` | Switch the SKU/group to seasonal pre-buy mode + service floor | SSM mode |

### 4b. Default service level by tier (the base rule set)

Seeded rules, editable in CONFIG. Keyed on `market_tier`:

| Tier (`market_tier`) | Default service level | Z |
|---|---|---|
| **A** | 99% | 2.33 |
| **B** | 97% | 1.88 |
| **C** | 93% | 1.48 |
| (untiered) | 90% | 1.28 |

These are the dials Marketing owns ("set the promise"). Any Complex Rule can override for a specific category / market / condition.

### 4c. Seasonal handling (two things at once)

For products where `core_seasonal='Seasonal'`:

1. **Service-level FLOOR** — a seasonal line gets at least (say) **97%** regardless of its ABC tier, because ABC-by-annual-revenue under-rates seasonal (evidenced: beach towels = #1 stockout category, tier-C stockout rate 10.2%). Overrides the tier default upward, never downward.
2. **Pre-buy mode** (Phase 2) — because lead time (17–23 wks) exceeds the selling window, the target is not a continuous buffer but a **single up-front commitment**: `target = cumulative forecast to season-end + forecast-risk uplift`, committed by an **order-by cut-off** (season start − lead). This is the "order the SS27 forecast up to July, up front" rule generalised.

### 4d. Guardrails (floors / caps)

- `floor_weeks` / `cap_weeks` per rule — e.g. "never below 1 carton", "never above 6 months". Legacy `cover_weeks` rules act as **floors** in SSM mode (so existing hand-set covers still protect their SKUs).
- Materiality / thin-history: SKUs with too little history fall back to the tier default cover or the current cover-weeks (tagged), never a wild SS from noise.

---

## 5. Parameters (CONFIG ▸ Admin ▸ General, with defaults)

| Parameter | Default | Notes |
|---|---|---|
| Buy plan logic | `cover_weeks` | the master toggle |
| Tier → service level | A 99 / B 97 / C 93 / untiered 90 | editable |
| Seasonal service floor | 97% | overrides tier upward |
| Review cycle (weeks) | 4 | cycle-stock allowance |
| σ_L source | data (PO history) | or None / ±15 / ±25 / ±40% |
| σ_d source | fc-err → demand → est | same cascade as the Safety-stock tab |

---

## 6. What must NOT change

- Toggle OFF → identical buy quantities (snapshot proof).
- Toggle ON → both passes (Buy 3PL + Urgent), FBA cartonisation, 3PL↔FBA transfers, China-stock top-ups, MOQ/pallet logic, EOL caps, discontinue handling — **all unchanged**; they simply consume the SSM-derived cover-weeks.
- Complex Rules matching, per-month windows, and the "raise-only" semantics are preserved.

---

## 7. Phasing

- **P1 — Toggle + steady-state SSM.** CONFIG switch; SSM effective cover-weeks for Core/continuing SKUs; tier→service-level rule set; guardrails; legacy cover_weeks rules become floors. Default OFF. Snapshot-verified identical when off. *(This is the buildable first slice.)*
- **P2 — Seasonal pre-buy mode + service floor.** `seasonal_prebuy` rule kind; order-by cut-off; forecast-to-season-end target.
- **P3 — Adoption tooling.** Per-market/category toggle; monthly "SS rec vs realised stockout/on-hand" scorecard (productionised backtest); auto-suggested rule changes.

---

## 8. Open decisions (need Ben)

1. **Default tier → service levels** — A 99 / B 97 / C 93 acceptable, or different (e.g. A 99.5, C 90)?
2. **Seasonal floor** — 97%? higher?
3. **Review cycle** — 4 weeks, or match your ordering cadence?
4. **Legacy cover_weeks rules in SSM mode** — treat as floors (recommended) or ignore?
5. **Scope of the first build** — global toggle only (P1), or include per-market scoping from the start?
6. **Seasonal in P1** — apply the seasonal service *floor* in P1 (cheap, big win) and defer the full *pre-buy* to P2 (recommended), or hold all seasonal for P2?

---

## 9. Build checklist (once approved)

- [ ] `app_settings.buy_logic` + CONFIG ▸ Admin ▸ General toggle + `BUY_LOGIC` inject.
- [ ] SSM cover-weeks function (reuse `renderSafetyStockView` SS maths) → feeds `t3base`/`tf` when `BUY_LOGIC='ssm'`.
- [ ] Extend Complex Rules schema (`rule_kind`, `service_level`, `seasonal`, `floor/cap`) + editor UI; migration.
- [ ] Seed tier→service-level rule set + seasonal floor.
- [ ] Buy-plan before/after snapshot: identical OFF; expected rebalance ON (~£752k per backtest).
- [ ] Version bump + CHANGES + deploy note (new migration for rule schema).
