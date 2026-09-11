# Last-year scope check: UK DTC Towel - Beach SEASONAL, Mar to Aug (LIVE data, 05-Sep-26)

## What the plan showed vs what the data says
| Figure | Value | Basis |
|---|---|---|
| Plan "Sum FC" Mar-Aug 2026 | 41,326 | EXPLODED actuals (sets x BOM) |
| Plan "Sum LY" Mar-Aug 2025 | 22,816 | RAW boxes, FULL sub-cat incl. closed SKUs (category_sales_summary) |
| Same-basis growth, raw | 22,816 -> 28,490 | +25% |
| Same-basis growth, exploded | 29,343 -> 41,326 | +41% |
| 3-sub-cat seasonal family (SEASONAL + SEASONAL SUM + BRIGHTS), raw | 44,701 -> 46,788 | +5% |

- The +81% was exploded FC against raw LY (mixed basis). Fixed in v27.470: Sum LY is now exploded too.
- 22,816 is NOT understated: it equals in-scope 21,041 + closed 1,775 raw boxes. The plan's sub-cat LY comes from category_sales_summary, which includes closed SKUs.
- 44,701 is the whole seasonal family (3 sub-categories), not this sub-category.

## What IS missing: closed SKUs are not shipped to the plan
SKUs with last-year sales but `in_planning_scope = false` are not in the plan's SKU master (`_SKU_RAW.p`). Their raw boxes are already inside the sub-cat total, but:
1. they have no SKU row (SKU rows do not reconcile to the sub-cat total), and
2. their SET explosion is missing from the exploded display (uplift is computed from in-scope set SKUs only). For this sub-cat that is 1,775 boxes = 6,213 exploded units of LY (mostly closed 4-set / 6-set towels discontinued 01-Jan-26).

### Missing SKUs, this sub-cat (UK DTC, Mar-Aug 2025 units)
| SKU | Status | Type | Disc | LY units |
|---|---|---|---|---|
| TOWLB-DES-LG-4SET-TANGGRN | CLOSED | SET | 01-Jan-26 | 313 |
| TOWLB-DES-LG-4SET-SUNBLVD | CLOSED | SET | 01-Jan-26 | 261 |
| TOWLB-DES-XL-4SET-HAVANA | CLOSED | SET | 01-Jan-26 | 244 |
| TOWLB-DES-XL-4SET-TANGGRN | CLOSED | SET | 01-Jan-26 | 173 |
| TOWLB-DES-LG-4SET-CHCKSEA | CLOSED | SET | 01-Jan-26 | 110 |
| TOWLB-DES-LG-6SET-SUMSUGA | CLOSED | SET | 01-Jan-26 | 106 |
| TOWLB-DES-XL-6SET-TROPICAN | CLOSED | SET | 01-Jan-26 | 94 |
| TOWLB-DES-XL-6SET-SUMSUGA | CLOSED | SET | 01-Jan-26 | 92 |
| TOWLB-DES-LG-6SET-WILDVIBE | CLOSED | SET | 01-Jan-26 | 64 |
| TOWLB-KID-LG-DOODMOOD | CLOSED | MASTER | 01-Aug-24 | 51 |
| TOWLB-DES-XL-6SET-WILDVIBE | CLOSED | SET | 01-Jan-26 | 48 |
| TOWLB-KID-MD-DOODMOOD | CLOSED | MASTER | 01-Aug-24 | 45 |
| TOWLB-DES-XL-4SET-CHCKSEA | CLOSED | SET | 01-Jan-26 | 44 |
| TOWLB-DES-LG-6SET-TROPICAN | CLOSED | SET | 01-Jan-26 | 44 |
| TOWLB-KID-MD-FIVEDAY | CLOSED | MASTER | 01-Aug-24 | 36 |
| TOWLB-KID-LG-FIVEDAY | CLOSED | MASTER | 01-Aug-24 | 32 |
| TOWLB-DOB-XL-STONEWALL | CLOSED | MASTER | 01-Aug-24 | 7 |
| TOWLB-KID-MD-4SETK | CLOSED | SET | 01-Sep-23 | 4 |
| TOWLB-KID-LG-6SET-SPLASH | CLOSED | SET | 01-Sep-25 | 2 |
| TOWLB-DES-LG-PALMBCH | CLOSED | MASTER | 01-Aug-24 | 2 |
| TOWLB-DES-XL-PALMBCH | CLOSED | MASTER | 01-Aug-24 | 1 |
| TOWLB-KID-MD-6SET-SPLASH | CLOSED | SET | 01-Sep-25 | 1 |
| TOWLB-DES-XL-LIFELEM | CLOSED | MASTER | 01-Aug-24 | 1 |

### Missing SKUs, all markets and channels, Mar-Aug 2025 (top sub-cats)
| Sub-category | Missing SKUs | LY units |
|---|---|---|
| (no sub-category on product) | 35 | 13,831 |
| Towel - Beach SEASONAL SUM | 9 | 12,842 |
| Towel - Beach CORE | 78 | 9,219 |
| Towel - Beach SEASONAL | 35 | 4,835 |
| Tea Towel | 24 | 4,603 |
| Hair Wrap SEASONAL | 36 | 4,372 |
| Towel - Home | 65 | 4,284 |
| Makeup Remover | 11 | 4,009 |
| Bag - Foldable | 4 | 3,439 |
| Poncho - Kids | 28 | 2,669 |
| Picnic Blanket | 11 | 1,471 |
| Kids Towel - Home | 9 | 1,164 |
| Hair Wrap CORE | 14 | 1,017 |
| Cooling | 9 | 947 |
| Poncho - Adults | 25 | 838 |
| Bundle Mixed | 86 | 356 |
| others (Gift Box, Towel - Dog, Bath Robe, Shorts, Non Core, Water Bottle) | 55 | 840 |
| **Total** | **534** | **~70,700** |

## Proposed build (v27.473)
Ship closed SKUs that sold inside the displayed window to the plan as LAST-YEAR-ONLY rows: tagged `lyo:true`, no availability (`av:{}`), so every buy / smoothing / availability path ignores them. Then (1) include them in the set-explosion uplift so exploded LY is complete, (2) show them as read-only rows (LY populated, forecast blank, "closed" badge) under their sub-cat when the plan is in "All" mode, so SKU rows reconcile to the sub-cat total. Buy plan snapshot before/after.
