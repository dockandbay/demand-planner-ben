# SPEC — Filter Rules Engine (reusable, saveable SKU selectors)

Ben, 2026-08-31. A reusable, named, **global** filter that selects SKUs by a set of AND'd conditions.
Built as a pop-down (styled like buy-plan **Complex Rules**). Used in the **demand plan** (show only matching
SKUs) and later as **scope inside Complex Rules**. Designed **jsonb-first** so new condition types can be added
without a schema change.

## Decisions (Ben, confirmed)
1. **AND only** to start (multi-select within a field = "any of these"). OR-groups = future.
2. Each filter carries a **Show / hide sub-categories** toggle (how it renders in the plan).
3. Metric conditions are **"flagged now"** — evaluated on the **current month**, current country×channel.
4. Saved filters are **global**.
5. Architecture must be **flexible to evolve** → condition list is data (`jsonb`), field registry is extensible.

## Data model
```
rule = {
  id, name, enabled,
  match_mode: 'and',            // future: 'or' / nested groups
  show_subcats: true|false,     // plan render behaviour
  conditions: [ condition, … ]  // AND'd
}
condition = {
  field:  '<field key>',        // from the FIELD REGISTRY below
  op:     '<operator>',         // valid ops depend on field type
  value:  <scalar | array>,     // multi-select ⇒ array (= "any of")
  severity?: 'red' | 'red_amber'// only for metric fields
}
```
Persisted: **`planner.filter_rules`** — `id, name, enabled, definition jsonb, created_at, updated_at`.
The whole `rule` (minus id/name/enabled) lives in `definition` → **new condition types need no migration**.
Injected as a `FILTER_RULES` global, exactly like `COMPLEX_RULES`. Endpoints `GET/POST /api/filter-rules`,
`POST /api/filter-rules/:id/delete` (mirror `/api/buy-complex-rules`).

## Field registry (extensible — the flexibility hinge)
Each field declares `{key,label,type,ops,options?}`. The evaluator + the builder UI are **driven by this registry**,
so adding a field = one registry entry + one evaluator case.

| key | label | type | ops | source |
|---|---|---|---|---|
| `category` | Category | enum[] | in / not-in | SKUM.c |
| `subcategory` | Sub-category | enum[] | in / not-in | SKUM.s |
| `tier` | Market tier | enum[] (A/B/C) | in / not-in | SKUM.ti |
| `status` | Status | enum[] | in / not-in | SKUM per-market state |
| `core_seasonal` | Core/Seasonal | enum[] | in / not-in | SKUM.cs |
| `release_window` | Release window | enum[] | in / not-in | SKUM.rw |
| `from_replacement` | From-replacement | bool | is | SKUM.rep |
| **`metric.fclt`** | **FC < Actual** | metric | is-flagged | Exceptions `buildFA` (fclt) |
| **`metric.fgtr`** | **FC > Run-rate** | metric | is-flagged | Exceptions `buildFA` (fgtr) |
| **`metric.sellnofc`** | **Selling, no forecast** | metric | is-flagged | Exceptions `buildSellNoFc` |
| *(future)* | stock-cover wks, growth-vs-LY, on-hand, … | numeric | ≥ / ≤ / between | — |

Metric fields carry `severity` (Red only vs Red+Amber). The three metric evaluators are **factored out of
`renderExceptionsView`** into standalone `excClass<X>(sku,co,ch)` → `'' | 'AMBER' | 'RED'`, reused by both the
report and the engine (single source of truth — the report and the filter can never diverge).

## Evaluator
`filterMatch(sku, co, ch, rule)` → bool. Iterates `rule.conditions`; every condition must pass (AND).
Attribute conditions read SKUM; metric conditions call the shared `excClass*` and compare severity.
`co/ch` = the demand plan's current market/channel (decision 3). Same function later drives Complex-Rules scope.

## UI
- **Pop-down builder** (mirror `#cr-panel`): list of saved filters (enable/edit/delete); each opens condition
  rows (field ▸ op ▸ value ▸ severity), an **Add condition** button, the **Show sub-cats** toggle, Save/Delete.
- **Demand plan**: a "Filters ▸ Saved filter" control (dropdown of saved + "New…") applies a filter → plan shows
  only matching SKUs; `show_subcats` decides whether empty sub-cats are hidden or shown as headers. Also selectable
  as removable chips (like tier/category chips today).
- **Complex Rules (later)**: a rule's scope can be "= saved filter <name>" in addition to today's sku/cat/tier/season.

## Phasing
- **P1** — registry + `excClass*` factoring + evaluator + pop-down builder (ad-hoc, in-memory) + demand-plan apply with `show_subcats`. Delivers the FC<Act / FC>Run-rate / Selling-no-fc filters immediately.
- **P2** — `filter_rules` table + endpoints + injection → save/load named global filters.
- **P3** — Complex-Rules scope-by-saved-filter.
- **P4** — extra numeric metric fields (cover, growth…), OR-groups.
- **(standalone)** — Exceptions report UI fix: drop product-name, un-cut the SKU column (independent of the engine).

## Non-goals / open for later
OR / nested groups; per-user filters; sharing filters into non-plan views (samples, supply); scheduling/alerts off a filter.
