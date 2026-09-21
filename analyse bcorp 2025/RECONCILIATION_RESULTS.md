# B Corp 2025 — Imports vs Sales, corrected (Direction B: physical pieces)

**Date:** 17 Sep 2026 · **BOM authority:** Horizon `planner.set_bom` (live, read-only) — 287 sets → 453 components, saved as `set_bom_horizon_live.csv`.
**Basis chosen (Ben, 17 Sep):** Purchased is taken **as booked from the Import Report (`PO_ALL`) = 1,154,367 — fixed, not recomputed.** Sales are put on a physical-pieces basis (Direction B: every set exploded into component items via the Horizon BOM) so the inflated sales figure is corrected.

## Method (deterministic — no string heuristics)
1. Load `set_bom` (kit SKU → component SKUs × qty).
2. Normalise each SKU by stripping channel/region prefixes (`PP-`, `UK-`, `US-`, `AU-`, `CA-`, `EU-`, `FAIRE-`…) so channel-tagged set SKUs match the canonical Horizon keys.
3. Group sales lines by order `id`. Where a set master + its component lines both appear (source BOM explosion), keep components / drop the master. Where a bare kit line appears, explode it via the map.
4. Apply the same explode convention to imports (`PO_ALL`).
5. Makeup `nPAK` packs are single manufactured products — **not** in the BOM, so correctly left as single units.

## Result

| | Imports | Ecom | DTC | **Total sales** | Net (imp − sold) |
|---|--:|--:|--:|--:|--:|
| **B — physical pieces** | **1,233,859** | 1,137,569 | 111,259 | **1,248,828** | **−14,969** (sold ~1.2% more) |

- Imports: raw as-booked 1,154,367; of which 23,152 qty are kit SKUs → explode to 102,644 pieces → **1,233,859**.
- Purchased ≈ sold, within ~1.2%. **We did not sell 430k more than we imported.**
- **1,584,777 ("1.58M") is not reproducible** from any source file — every clean method lands 1.09M–1.25M. Likely a gross/over-count (sets exploded on top of already-exploded lines, or pre-refund dashboard units).

## For reference — Direction A (retail units, set = 1)
Imports 1,154,367 / Sales 1,091,992 → imported +62,375 (~5.7% net stock build). Not chosen.

## Known residual gaps (small)
- **~9k qty** of genuine sets appear in sales but have **no BOM row in Horizon** (e.g. `TEATWL-MD-3SET-ZESTCHK`, `TOWLB-SUM-XL-6SETA`). Under-exploded in B by ~0.7%. Fix = add them to `set_bom` (Horizon write → via Diviyaj).
- Makeup packs (~7k qty) intentionally not exploded.
- DTC contains no set/kit SKUs (already booked as individual items).

## Downstream Transport — regenerated (product + packaging)
The downstream weight is **computed** as Σ(item qty × product weight), confirmed empirically (order weight ≈ Σ qty×product_weight, ratio 0.99). So it inherited the same item undercount and was regenerated on the corrected basis, now including packaging (tag + poly bag + box + paper).

| | kg | legs |
|---|--:|--:|
| Original (as submitted) | 408,111 | 359,490 |
| **Rebuilt (corrected items, product+packaging)** | **463,575** | 358,621 |

One leg per order rebuilt from source (origin = `shipped from facility`, destination = `delivery post city/code`, date = order date). Product weights + packaging parsed from `SKU_DATA.MERGE_bcorp`. DTC/distributor legs (~42,489 kg) remain **excluded** (ecom scope unchanged) — open scope question for Josh. Note: the rebuilt files retain the original helper `Sheet1` (stale monthly counts, unused by Zevero).

## Reproduce
`recon.py` (scratchpad) reads the 4 regional sales files + DTC + `PO_ALL`, joins to `set_bom_horizon_live.csv`. Read-only, `openpyxl`.
