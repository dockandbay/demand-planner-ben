# Spec — New-category revenue targets smoothed to monthly units on a grouping seasonality curve

**Problem.** A brand-new category (e.g. **Lanyard** — category+subcat "Lanyard", 4 SKUs, zero history) has no last-year base, so the target recommendations (which grow LY) produce nothing. Ben enters a **revenue target** (GBP) in Edit Targets for a month/quarter/half/year; we need to turn that into a **monthly unit forecast**.

**Agreed approach (Ben, 2026-08-12).**
1. **Seasonality curve** — no manual nomination. Use the **other (sub)categories in the SAME `grouping`** (from `planner.categories.grouping`). For Lanyard the grouping is **"Beach"** (siblings: Towel-Beach, Poncho-Kids/Adults, Cooling, Bag-Beach, Beach Pillow). Curve = each calendar month's **% of the siblings' combined annual sales**, per country×channel (fallback: grouping-blended, then flat) — excludes the new category itself.
2. **Category ASP (GBP)** — average of the category's SKUs' retail price `<co>_rt` per market (Lanyard: UK £16 / US $22 / EU €18 / AU $30 / CA null), each **converted to GBP** via the Exchange-rates config (`app_settings.fx_rates`). A market with no price → **no units for that market** (Ben's rule: no ASP ⇒ can't compute units).
3. **Smoothing** — the Edit-Targets **GBP revenue** for a period is spread across that period's months on the curve: `monthRev = periodTargetGBP × curve%(month within the period)`. Then `monthUnits = monthRev ÷ aspGBP(co)`. Those monthly units become an applyable **target recommendation**, filling the plan and cascading to SKUs via the usual tier-weighted contribution.

**Where it plugs in.**
- Input already exists: `demand_revenue_target_periods.target_gbp` per subcategory × period (month/quarter/half/year).
- `computeTargetRecs`: add a branch — when a subcat has **no LY base** but **has a GBP period target** and a derivable **grouping curve + GBP ASP**, produce rows from `revenue × curve ÷ ASP` instead of `grow LY`.
- New helpers: `groupingSeasonalCurve(subcatOrCat, co, ch)` and `categoryAspGBP(cat, co)`.
- Edit Targets surfaces the resulting monthly split (and flags a market with no ASP as "no unit target — set a price").

**Build steps.**
1. Server/client: `categoryAspGBP` (SKU `<co>_rt` → GBP via fx_rates) + `groupingSeasonalCurve` (same-grouping siblings' monthly %).
2. `computeTargetRecs` new-category branch (revenue×curve÷ASP) — no LY required.
3. Edit-Targets display of the smoothed monthly units + the "no ASP → no units" flag.
4. Verify with Lanyard (Beach curve, £16/$22/€18/A$30 ASPs) across UK/US/EU/AU; CA shows no units.

**Open/confirm before build:** none — currency (local→GBP) and reference (grouping siblings) both settled.
