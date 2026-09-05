# HORIZON on the phone: review of every view (06-Sep-26)

Method: static audit of the phone media rules, fixed pixel widths, type sizes, tap targets and card fallbacks across
artifact_v16.7.html (DEMAND / BUY & MOVE / REPORTS), supply/inject.html (SUPPLY / PRODUCT / CONFIG) and supply/portal-view.js.
No screenshots (rule: no headless Chrome). Figures below are counts from the code.

## Coverage: which views have any phone-specific treatment
| Area | Phone rules | Card fallback | Verdict |
|---|---|---|---|
| DEMAND plan | none | no | 156px sticky name col + 74px cells x ~60 columns, 4-line 10-12px cells: side-scroll only |
| DEMAND targets, exceptions, actions, trends | none | no | tables scroll sideways |
| BUY | 24 rules | n/a | usable: filters collapse, grid scrolls, PLAN = "P" |
| FBA / Transfer / Inventory / Zalando | none | no | FBA shares the BUY scaffold partly; others side-scroll |
| REPORTS exec summary | 8 rules | no | ok |
| REPORTS performance, slow moving, 3PL invoicing | none | no | side-scroll; 3PL upload form has wide inputs |
| SUPPLY POs, shipments, samples, actions, payments | 28 / 20 / 22 / 49 / 3 | yes (mobCards) | good |
| SUPPLY cash flow, deposits, manufacturing, barcodes, quality | none | no | dense matrices side-scroll |
| CONFIG | 3 rules | no | forms with fixed-width inputs overflow |
| PRODUCT grid + detail | 95 / 21 | yes (pgm cards, sheet) | good; Size & variants matrix and Specs side-scroll |
| SCENARIO | 11 rules | no | ok |
| PORTAL PO grid, expanded card, samples | 22 / 7 / 22 | partly | good |
| PORTAL deposits, payments, shipment plan, productions, specs, price list | none | no | table-only; price list has no phone rules |

## Cross-cutting findings
1. **Wide inline inputs and selects.** 40 in SUPPLY/PRODUCT, 10 in the portal, 8 in DEMAND carry fixed widths of 260 to 820px. On a 375px phone they overflow their row and force the page sideways. One theme rule caps them at 100% on phones.
2. **Type floor.** The DEMAND/BUY grids use 5-8px text in 152 places and 9px in 168. Below 10px is unreadable on a phone. The cells are dense by design, so the fix is a phone mode, not a blanket bump.
3. **Tap targets.** 73 buttons in the artifact and 33 in SUPPLY have 0-2px padding (cell-level controls). Toolbar and card buttons should meet 36px; in-cell controls stay small but need spacing.
4. **Three phone definitions.** isPhone() = 640, actMob() = 700, media queries at 640/700/900. Unify on one breakpoint so behaviour and styling flip together.
5. **Reach.** The hamburger drawer mirrors the L2 menus but not every L3, so some pages are reachable on a phone only by URL.
6. **Zoom.** Both pages set maximum-scale=1, so 11-12px inputs do not trigger the iOS focus zoom. Keep it.

## Proposed slices (in value order)
- **M1 Global quick wins (small):** phone cap `max-width:100%` on inputs/selects/textareas in app and portal; unified breakpoint token; 36px min-height for toolbar/card buttons and pills on phones; DEMAND filter rows behind the existing Filters button; drawer mirrors all L3 rows.
- **M2 Portal tables to cards (medium, highest user value: suppliers are the phone users):** Deposits, Payments, Shipment plan, Productions, Specs and Price list get the same card layout the PO grid already has under 640px; bilingual labels checked for wrap.
- **M3 SUPPLY matrices to cards (medium):** Cash flow (one card per month with the itemised lines), Deposits, Manufacturing, Quality; Barcodes stays a download tool.
- **M4 DEMAND "Plan lite" phone mode (medium-large, needs Ben's steer):** current FY only by default (other years collapsed), 2-line cells (forecast + growth; LY and revenue on tap), 120px name column, no Quarter/H columns, exceptions and actions as cards. Question: what does a phone user need from the plan: read and approve, or edit?
- **M5 BUY & MOVE + REPORTS (medium):** Transfer, Inventory, Zalando, Performance, Slow moving, 3PL invoicing onto the BUY scaffold rules (collapsible filters, scrolling grid, pinned first column) and card fallbacks where rows are few.
