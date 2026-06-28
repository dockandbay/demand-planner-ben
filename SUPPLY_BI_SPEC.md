# SUPPLY ▸ Business Intelligence — Scope / Spec

Status: **DRAFT for Ben's sign-off.** Build one phase at a time, tested, version-bumped (per repo rules).
Owner: Ben (product/logic). Diviyaj wires prod writes + any schedule. Nothing here writes to a live
system without an explicit confirm / opt-in rule.

---

## 1. Vision

A new **SUPPLY ▸ BI** tab that turns the planner's data into **actions that optimise flow** — not just
charts. It sits on one **fluid demand engine** (recomputed live from forecast + stock-on-hand + inbound,
exactly like the buy plan) and surfaces accept-able recommendations, with an optional automation layer.

Three flagship recommendation types (all discussed, all high-ROI):
1. **Reallocate** order-plan qty across destinations to match demand (zero-cost flow fix).
2. **Fill** spare container space from urgent/near-term buys.
3. **Consolidate** under-filled shipments.

Plus an automation layer (auto-apply order-plan edits, auto-update suppliers via the timeline) and
supporting analytics + an AI "ask-your-data" layer.

---

## 2. Core engine — the fluid net-position projection (foundation; build first)

**Principle (Ben):** the buy plan / BI must be **fluid** — never a saved snapshot. Stock, POs and demand
move constantly, so BI **recomputes on every view** from the live inputs. The persisted `buy_plan` table is
demoted to an optional cache/history, not a dependency.

Per **SKU × destination (country/branch)**, over a rolling horizon, compute:

```
net_position(t) = on_hand + Σ inbound(arrives ≤ t) − Σ forecast_demand(≤ t)
cover_months    = (on_hand + inbound) / avg_monthly_demand
stockout_date   = first t where net_position(t) < 0
need_qty        = qty to restore target cover over the supplier lead time (MOQ / carton rounded)
urgency         = f(days_to_stockout, lead_time)   → critical / soon / ok / surplus
```

**Inputs (all already in Supabase):** `forecasts`/`forecast_outputs`, `product_inventory` (on-hand by
country/3PL/FBA), `inbound_shipments` + open `purchase_orders`/lines (in-transit qty + arrival dates),
`preorders`, `key_account_forecasts`, `sales_actuals`.

**Reuse:** the cover/stockout maths already exists server-side in `kpiBase()` + `/api/kpi/inventory-cover`
+ `/api/kpi/stockout-risk`. The engine extends that into a **per-SKU × destination projection** exposed as
one endpoint:

```
GET /api/supply/bi/projection   → [{ sku, country, on_hand, inbound, demand_12m, cover_months,
                                      stockout_date, need_qty, urgency, supplier, … }]
```

**Single source of truth:** every BI module reads this one projection, so BI, the buy plan and the KPIs can
never disagree. (The buy-plan demand logic — tier weighting, sub-category seeding, target cover — should be
shared with / ported alongside this so the numbers match the artifact exactly. Open item §9.)

---

## 3. Modules

### 3a. Reallocate — order-plan adjustment recommendations  ⭐ (highest ROI, slice 1)
*"Shipping 3000 blue towels to UK but US needs them" → rebalance the split of the same production.*

- For each **production (`prod_no`) still editable** (FUTURE / PRODUCTION / READY-TO-SHIP — not shipped),
  compare each destination's projected cover for each SKU.
- Where one destination has **surplus** cover and another in the same production is **short / at stockout**,
  recommend moving units **source → destination**.
- Two flavours:
  - **Zero-sum reshuffle** (gold): supplier total unchanged — only the per-destination split moves. No cost,
    no renegotiation, no freight change.
  - **Net adjustment**: demand drifted; recommend a real increase/decrease (flagged — changes supplier total + cost).
- **Output:** proposed qty edits, applied via the **existing Order Plan inline-edit + `po-line-accept`** flow.
  Example: *"Move 800 BLUE-L from PO-57UKXR1 → PO-57USXR1: UK 4.1→3.6mo (ok), US 0.3→2.6mo (clears stockout),
  supplier total unchanged."*
- **Guardrails:** editable POs only · net-positive only (never strip source below its own need) · carton/pallet
  rounding · MOQ · supplier eligibility (allowed multi-supplier list) · per-destination discontinue dates.
- **Reuse:** sibling of the existing pallet **rebalance engine** (`po-rebalance`, REBAL_MAX) — this is the
  demand-driven version.

### 3b. Fill-the-container — spare-capacity top-up from urgent buys (slice 2)
- For each shipment with a known departure and **spare pallets** (20 − current), find SKUs from the projection
  that are **near-term need / at stockout risk**, orderable from a supplier **already on that container**, and
  **producible before departure** (supplier `production_days` vs days-to-departure → rush flag).
- **Opportunistic top-up** (pull a planned buy forward, near-zero marginal freight) vs **stockout rescue**
  (rush onto the imminent container).
- Bounded by need (never over-fill beyond forecast → no dead stock). Shows pallets→units, cover impact,
  **freight $ saved** vs a separate later shipment.

### 3c. Consolidate — merge under-filled shipments (slice 3)
- Under-filled containers to the same branch/port within N days that could merge; same-supplier / same-port
  (e.g. China Consolidation) bookings; LCL→FCL tipping point. Shows pallets now → combined, **$ saved**, and a
  hold/merge action.

### 3d. Automation layer (slice 4 — after recs are trusted)
*Ben: "auto-update order plans, auto-update suppliers via timeline update."*

- **Auto-apply order-plan edits** — user defines **rules** (e.g. "auto-apply zero-sum reallocations under 500
  units when it clears a stockout and reduces no destination below 2 mo cover"). Anything outside the rule stays
  a manual one-click. Every auto-action is **previewed, logged, reversible**.
- **Auto-update suppliers via the timeline** — when an order-plan qty changes (manual or auto), automatically
  post a **supplier-portal timeline note** ("Qty for BLUE-L revised 3000→2200 — please confirm") and raise the
  confirmation action, reusing the existing portal notes + confirmation workflow.
- **Safety (non-negotiable, per repo rules):** auto-apply is **opt-in per rule**, bounded by thresholds, with a
  global kill-switch, a full **audit log**, dry-run preview, and **undo**. Writes to live systems (prod Supabase,
  supplier portal, Cin7) stay Diviyaj-gated / confirmed. "Auto" defaults to **auto-recommend + one-click apply**;
  true hands-off only for the low-risk, pre-authorised band.

### 3e. Supporting analytics (slices 5+)
- **Supplier scorecard** — on-time production (promised vs actual), portal confirmation responsiveness,
  cost-price accuracy (quoted vs final invoice), escalation rate, lead-time reliability → ranked.
- **Freight & landed cost** — $/unit by lane/mode/supplier, freight as % of COGS, consolidation savings realised.
- **Cash-flow BI** — deposit/balance/freight outflows by week, peak periods, deposit-pool utilisation, FX.
- **OTIF / lead-time slippage** — actual vs planned across prod→ship→land→deliver; where time is lost.

### 3f. AI layer (slices, on top)
- **Ask-your-data** — NL over the projection + POs/shipments ("which POs can I consolidate to AU this month?").
- **Narrated recommendations** — AI writes each rec's plain-English rationale + $ impact (maths stays deterministic).
- **Weekly "state of supply" digest** — emailed: shipped, late, cash out, top risks, consolidation/realloc wins.
- **Anomaly detection** — flag odd cost prices, qty swings, date slippage vs history.
- Reuses the existing server-side Claude harness (current model id).

---

## 4. Recommendation lifecycle (shared by 3a–3c)

`detect (engine) → score/rank (impact $, urgency) → surface (BI tab card) → review →
 apply: manual one-click  |  auto (rule-gated) → write-back (existing po-line / portal / Cin7 paths) →
 audit (who/what/when, before→after) → undo`

Recommendations are **derived live**, not stored — but every **applied action** is written to an audit table.

---

## 5. New data / migrations

- `planner.bi_action_log` — audit of applied recommendations (type, sku, from_po, to_po, qty_before/after,
  actor, auto/manual, rule_id, ts). For undo + accountability.
- `planner.bi_automation_rules` — opt-in auto-apply rules (type, thresholds, scope, enabled).
- *(Optional)* `planner.buy_plan` extension or a `buy_plan_projection` cache — only if we later want history /
  performance; **not required** for the fluid engine.
- No schema change needed for the projection itself (reads existing tables).

---

## 6. Architecture & endpoints (sandbox build; Diviyaj wires prod)

- `GET /api/supply/bi/projection` — the fluid net-position engine (core).
- `GET /api/supply/bi/reallocations` — order-plan move recommendations.
- `GET /api/supply/bi/fill-opportunities` — container top-ups.
- `GET /api/supply/bi/consolidations` — shipment merges.
- `POST /api/supply/bi/apply` — apply a rec (routes to existing `po-line` / `po-line-accept` / portal-note paths) + audit.
- `GET/POST /api/supply/bi/rules` — automation rules.
- Client: new `['bi','BI']` entry in `SECTIONS` (after ORDER PLAN), rendered by the server-injected SUPPLY UI.

---

## 7. Phasing (build + test one slice at a time)

| Phase | Slice | Ships value |
|------|-------|-------------|
| 0 | **Core engine** `/bi/projection` + BI tab shell + nav | foundation; a live cover/urgency view |
| 1 | **Reallocate** recommendations (manual one-click apply) | zero-cost flow fix — biggest win |
| 2 | **Fill-the-container** | pull buys forward for free freight |
| 3 | **Consolidate** shipments | merge under-filled containers |
| 4 | **Automation** (rules + supplier timeline auto-update) | hands-off the safe band |
| 5 | **Analytics** (supplier scorecard, freight, cash, OTIF) | reporting depth |
| 6 | **AI layer** (ask-your-data, digest, anomaly) | conversational + proactive |

**Recommended start: Phase 0 + Phase 1.**

---

## 8. Out of scope / Diviyaj-owned
- Prod Supabase writes, n8n schedules, hosting/secrets.
- Any automatic write to supplier portal / Cin7 / Xero stays gated/confirmed.

## 9. Open questions / dependencies
1. **Shared demand logic** — to guarantee BI == buy plan == KPIs, the buy-plan demand calc (tiers, sub-category
   seeding, target cover, horizon) should be the *same* code the projection uses. It currently lives in the BUY
   **artifact** (client-side). Decision: **port it to a shared server calc** (recommended, so the server-injected
   BI tab matches the artifact) — confirm the exact parameters with Ben.
2. **Target cover** per market (weeks) and **horizon** — confirm the values the buy plan uses.
3. **Editable window** for reallocation — confirm statuses treated as "still changeable" (FUTURE/PRODUCTION/READY-TO-SHIP?).
4. **Auto-apply risk band** — Ben defines the thresholds where hands-off is acceptable.
