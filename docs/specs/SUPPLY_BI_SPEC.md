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

### 3e. Metrics Summary — operational "state of supply" at a glance (slice 0, with the shell)
A simple counts dashboard at the top of the BI tab (pure aggregation from POs + shipments, no engine):
- **Open POs** (count, split by status: future / production / shipping)
- **Units in production** (Σ qty on POs in PRODUCTION)
- **Shipments** (active / in-transit count)
- **40ft containers shipping or in production** (derived: Σ pallets ÷ ~20 pallets-per-40ft, or the
  container combo from the freight `seaEst`) — confirm pallets-per-container in Q.
- Supporting tiles: units inbound (in transit), $ value in production / in transit, POs awaiting supplier
  confirmation, deposits outstanding.
Fast, low-risk, high-visibility — ships alongside the tab shell.

### 3f. Supporting analytics — ⏸ PAUSED (Ben: focus on the rest first)
Deferred until the recommendation + metrics modules are proven. Captured for later:
supplier scorecard · freight & landed cost · cash-flow BI · OTIF / lead-time slippage.

### 3g. AI layer (slices, on top)
- **Ask-your-data** — NL over the projection + POs/shipments ("which POs can I consolidate to AU this month?").
- **Narrated recommendations** — AI writes each rec's plain-English rationale + $ impact (maths stays deterministic).
- **Weekly "state of supply" digest** — emailed: shipped, late, cash out, top risks, consolidation/realloc wins.
- **Anomaly detection** — flag odd cost prices, qty swings, date slippage vs history.
- Reuses the existing server-side Claude harness (current model id).

---

## 4. Recommendation lifecycle — Apply / Snooze / Dismiss (like Actions)

BI recommendations behave **exactly like SUPPLY ▸ Actions**: each card can be **Applied**, **Snoozed**
(1wk / 1mo), or **Dismissed**, with Open / Snoozed / Dismissed / Applied filter pills and a **Restore**.

**Reuse the existing mechanism** — `planner.supply_action_state` (`action_key, status, snooze_until, note`)
+ the `POST /api/supply/actions/state` endpoint already do this for Actions. BI recs get a **stable
deterministic key** so snooze/dismiss survive the live recompute, e.g.:
- reallocate → `bi-realloc|{sku}|{from_po}|{to_po}`
- fill → `bi-fill|{shipment_ref}|{sku}`
- consolidate → `bi-consol|{shipment_a}|{shipment_b}`

Add an **`applied`** status to the lifecycle (Actions today use open/snoozed/dismissed/done). On each
recompute: derive recs live → join to `supply_action_state` by key → hide dismissed, hide snoozed-not-due,
mark applied. A rec that's been actioned won't nag again.

Full flow:
`detect (engine) → score/rank ($ impact, urgency) → surface (BI card) → Apply / Snooze / Dismiss →
 on Apply: write-back via existing po-line / po-line-accept / portal-note paths → set status=applied + audit (before→after) → undo`

Open question Q5: whether these cards **also appear in the SUPPLY ▸ Actions tab** (they share the state
table, so it's feasible) or live only in the BI tab.

---

## 5. New data / migrations

- **Reuse `planner.supply_action_state`** for the Apply/Snooze/Dismiss lifecycle (add `applied` to the
  allowed statuses) — no new state table needed; same `/api/supply/actions/state` endpoint.
- `planner.bi_action_log` — audit of *applied* recommendations (type, sku, from_po, to_po, qty_before/after,
  actor, auto/manual, rule_id, ts). For undo + accountability.
- `planner.bi_automation_rules` — opt-in auto-apply rules (type, thresholds, scope, enabled). *(Phase 4.)*
- Metrics Summary + the projection need **no schema change** (pure reads of existing tables).
- *(Optional, later)* `buy_plan` cache — only if we want history/perf; **not required** for the fluid engine.

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
| 0 | **BI tab shell + nav + Metrics Summary** (counts) + core engine `/bi/projection` | live "state of supply" + the foundation |
| 1 | **Reallocate** recs with Apply/Snooze/Dismiss lifecycle | zero-cost flow fix — biggest win |
| 2 | **Fill-the-container** | pull buys forward for free freight |
| 3 | **Consolidate** shipments | merge under-filled containers |
| 4 | **Automation** (rules + supplier timeline auto-update) | hands-off the safe band |
| — | ~~Analytics~~ (supplier scorecard, freight, cash, OTIF) | ⏸ PAUSED — deferred |
| 5 | **AI layer** (ask-your-data, digest, anomaly) | conversational + proactive |

**Recommended start: Phase 0** (Metrics Summary is a quick, visible win) **then Phase 1.**

---

## 8. Out of scope / Diviyaj-owned
- Prod Supabase writes, n8n schedules, hosting/secrets.
- Any automatic write to supplier portal / Cin7 / Xero stays gated/confirmed.

## 9. Decisions (locked with Ben 2026-06-28)
1. **Shared demand logic** → **Port the buy-plan calc to a shared server engine** (single source of truth: BI = buy plan = KPIs).
2. **Target cover** → **Read the exact targets from the BUY artifact** (can differ per product / category / market). Default **12 weeks** where unknown.
3. **Editable window for reallocation** → **FUTURE + PRODUCTION only** (Ready-to-ship is treated as locked for packing; never touch shipped).
4. **Metrics Summary** → **all proposed tiles** (open POs by status · units in production · active shipments · 40ft containers shipping/in-prod · units inbound · $ value in production & transit · POs awaiting confirmation · deposits outstanding).
5. **Container size** → **20 pallets = one 40ft** (matches the freight model's 20-pallet container).
6. **Where recs show** → **Hybrid**: the BI tab holds all recs; only **high-urgency** ones (e.g. stockout-rescue reallocations) also raise a SUPPLY ▸ Action.

### Still open (Phase 4 only)
- **Auto-apply risk band** — thresholds where hands-off auto-apply is acceptable. Deferred until we build automation.
