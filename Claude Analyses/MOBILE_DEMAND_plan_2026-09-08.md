# DEMAND on a phone: findings and plan (08-Sep-26)

Ben: "Demand plan cannot be accessed properly with mobile. Demand sub menu navigation not allowing user flow to all
sections. Filter button doesn't work on demand plan. Analyse and make a plan for mobile."

## What was actually wrong (fixed in v27.573)

1. **Filters button did nothing.** `mobileFilterCollapse()` wraps the DEMAND filter rows (Country / Channel / Show /
   SKU search / More filters) in a panel that should be hidden until "⚙ Filters" is tapped. The theme's phone block had
   `#app .mob-filt-panel{display:flex}` with no `.open` condition. Two ids beat the artifact's one-class rule, so the
   panel was always open and the button toggled a class nobody read. Every view that uses the shared button (reports,
   scenario, DEMAND) was affected. Fix: the flex rule now requires `.open`, and `:not(.open)` is `display:none`.
2. **Sub-menu did not reach every section.** On phones the DEMAND L2 row is hidden and the hamburger drawer mirrors it.
   The mirror copied the seven L2 buttons literally: Plan, Actions, Exceptions, Scenario planner, **Analysis, Config,
   Inputs**. The last three are groups: tapping one lands on the group's first page and shows a light-blue L3 row on the
   page for the rest, so Trends, Snapshots, Safety stock, Stock cover, Ship bags, Key accounts, Calendar, Price changes,
   Contribution model, Buy plan logic and Discontinued sub-categories were two taps away and invisible from the menu.
   Fix: the L2 builder now publishes the nav model (`window.__demandNav`) and the drawer lists every page, groups as
   headed, indented blocks, each deep-linked (`#/demand/analysis/trends` etc.).
3. **Plan table unusable.** The sticky name column is 320px on desktop; on a 390px phone it left 70px for months.
   Fix (interim): 150px, wrapping names, scroll area sized to the dynamic viewport. This is the cheap version of M4.

Not changed: the L3 rows stay on the page under the (hidden) L2 row and wrap, so they remain a second way to move
inside a group.

## What the phone DEMAND experience still lacks

- **Plan density.** Even at 150px the plan shows one or two months at a time; LY / mtd / total / growth / revenue stack
  five lines per cell; Quarter and Half-year columns add width nobody scrolls to on a phone.
- **Editing.** Cells are editable inputs; on a phone a tap zooms and the keyboard hides the row. Smoothing pop-downs
  and the strike-through preview are hover-designed.
- **Filters panel length.** Once opened, Country + Channel + Show + SKU search + More filters run a full screen tall.
  It works now, but a phone user pays for it every time.
- **Actions / Exceptions.** Tables, not cards; the SUPPLY card pattern (`hz-stack`) exists and is not applied here.
- **Summary & targets, Trends, Accuracy.** Wide tables and charts; readable with sideways scroll, not designed for it.

## Options for the plan table (pick one; mockups below)

**A. Read-only "plan lite" (recommended first step, medium).**
Phone shows one country + channel at a time (already true), current FY only, one line per cell (forecast; growth as a
small coloured tag), sub-categories as rows, SKU rows collapsed, no Q/H columns. Tap a cell → a bottom sheet with LY,
mtd, revenue, override and the smooth action for that month. No inline editing on the grid.

```
┌──────────────────────────────────────────────┐
│ ☰  HORIZON  DEMAND · Plan            v27.57x │
│ UK · DTC · FY26  ▾            ⚙ Filters ▾    │
├──────────────┬───────┬───────┬───────┬───────┤
│ Sub-category │  Sep  │  Oct  │  Nov  │  Dec →│
├──────────────┼───────┼───────┼───────┼───────┤
│ Towel Beach  │ 4,120 │ 3,880 │ 5,210 │ 7,900 │
│  ▸ 42 SKUs   │ +12%  │  +8%  │ +15%  │ +22%  │
│ Towel Hair   │   980 │   910 │ 1,240 │ 1,860 │
│              │  -3%  │  -5%  │  +4%  │ +10%  │
│ Bags         │   310 │   290 │   420 │   690 │
│ …            │       │       │       │       │
├──────────────┴───────┴───────┴───────┴───────┤
│ ▲ Sep · Towel Beach · UK DTC                 │
│ Forecast 4,120   LY 3,680  (+12%)            │
│ Actual to date 1,140 · Revenue £61.8k        │
│ [ Override… ]  [ Smooth month ]  [ Close ]   │
└──────────────────────────────────────────────┘
```
Cell = 2 lines (units, growth tag). Bottom sheet replaces hover pop-downs and inline inputs. FY switch in the header pill.

**B. Cards per sub-category (small, quickest to build, least like the desktop).**
No grid: one card per sub-category with a 12-month sparkline and the next 3 months as numbers; tap → same bottom sheet.

```
┌──────────────────────────────────────────────┐
│ Towel Beach                        UK · DTC  │
│ ▁▂▃▅▇█▆▄▂▁▂▃   FY26 48,900  (+11% vs LY)     │
│ Sep 4,120 (+12%)  Oct 3,880 (+8%)  Nov 5,210 │
├──────────────────────────────────────────────┤
│ Towel Hair                                   │
│ ▂▂▃▄▅▆▅▃▂▂▂▃   FY26 11,200  (-2% vs LY)      │
│ Sep 980 (-3%)   Oct 910 (-5%)   Nov 1,240    │
└──────────────────────────────────────────────┘
```
Good for approving and spotting shape; no editing; growth-only view.

**C. Keep the desktop grid, tuned (what v27.573 does, plus).**
Hide Q/H columns and the revenue line on phones, pin the month header, two-line cells. Cheapest, still fiddly to edit.

## Proposed build order (after Ben picks A, B or C)

1. **Phase 1 (done, v27.573):** Filters toggle, full drawer, narrower name column.
2. **Phase 2 (small):** Actions + Exceptions as phone cards via `hz-stack`; Filters panel shows Country/Channel as a
   single compact row and hides Show/More filters behind a second tap.
3. **Phase 3 (the pick above):** A ≈ 2 versions (cell renderer branch + bottom sheet + FY pill), B ≈ 1 version, C ≈ half.
4. **Phase 4:** Summary & targets and Trends read-only phone layouts (KPI tiles + one chart each).

Buy plan is untouched by all of this (display only); each step gets the before/after snapshot regardless.

## Question for Ben

What does a phone user need from the plan: **read and approve** (A or B) or **edit** (A with the bottom sheet)?
Answer that and pick a letter; I build Phase 2 immediately either way.
