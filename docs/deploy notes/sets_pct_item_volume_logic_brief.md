# Brief: make `sets%` a share of *item-equivalent* volume (convert set forecasts by set size)

Handoff brief for the engine-wiring thread. Goal: the Contribution model's `sets%` should
represent the set share of **item-equivalent volume**, and each set SKU should be forecast in
**boxes = item-share ÷ set size**.

## Context
The contribution model (`app_settings.contrib_model`, resolved via `contribResolve`) has a
per-subcategory `sets%`. Today it sizes brand-new SET SKUs at **artifact_v16.7.html:6906**:

```
annualisedTotals[set] = (p/(1-p)) * _mastersBase / max(_newSets,1)   // p = sets%/100
```

This value is used **directly as the set SKU's forecast in *set boxes*, compared 1:1 against
master item-units.** It is never divided by the number of components in a set.

## Problem
A set is a bundle of N items. Treating "1 box = 1 unit" double-counts sets: the buy plan later
**explodes each box × components** (artifact ~15358-15406, `SET_BOM[set] = [{sku,qty}]`). So 1 set
at `sets%=40` on a 1,000 base forecasts **400 boxes → 1,600 components**, swamping the 600 masters
(~73% of items, not 40%).

## Requirement
`sets%` = set share of **item-equivalent volume**. The set SKU's own forecast must be in
**boxes = item-share ÷ set size**.
- Example: base 1,000, `sets%`=40 → masters 600 items, sets = 400 **item-equivalents**; set of 4
  → **100 boxes** (100 × 4 = 400 components). Total item volume = 1,000.

## Core change
Divide the set placeholder by that set's component count:

```
setSize_i = sum(qty) over SET_BOM[set_i]      // fallback 1 if no BOM (already flagged "Set — no BOM")
boxes_i   = ((p/(1-p)) * _mastersBase / _newSets) / setSize_i
```

`SET_BOM` global (artifact_v16.7.html:1459): `{set_sku:[{sku,qty}]}`.

## ⚠️ Non-obvious part — keep ONE unit basis, or smoothing breaks
The demand grid / Leader-smooth sums SKU forecasts as-is. If the set line is now 100 boxes, the
subcat SKU-sum = 600 + 100 = 700, so smoothing to a 1,000 **item** target would wrongly scale
everything up. Fix by making the subcat/target math **item-equivalent**: when aggregating a
subcategory (SKU-sum, target comparison, tier split), count each set line as `boxes × setSize`;
store/display the set SKU line in boxes. Convert down when writing the set line, up when aggregating.

## Entry points
- Sizing: artifact_v16.7.html:**6906** (the ÷setSize change).
- Subcat aggregation / Leader-smooth sum + target compare: wherever the subcat SKU-sum is built
  (count sets as `×setSize`).
- Explosion (artifact ~15358-15406): **no change** — it already multiplies boxes × qty; that's the round-trip.

## Guardrails
1. **Snapshot the buy plan before/after** (`BP.buyplanItems`, via `buildLiveDemand()` + overlay).
   This *reduces* set box forecasts by ~setSize → fewer component buys; confirm the delta is the
   expected ÷size and nothing else moves.
2. Today this only touches **brand-new sets** (no history). Decide whether existing sets-with-history
   should also be re-based to the item-share (separate, bigger change).
3. **Seeding basis caveat:** current `sets%` values were derived from **revenue** share, then applied
   to units. For a true item-volume share, ideally re-derive `sets%` from unit share — but the
   ÷setSize conversion is mechanically required regardless.
4. Version bump + test (a subcat with 1 new set; with 2 new sets of different sizes; a set with no BOM).

## Acceptance test
Subcat base 1,000, `sets%`=40, one new set of size 4 → set line = **100 boxes**, masters = 600,
buy-plan components from the set = 400.
