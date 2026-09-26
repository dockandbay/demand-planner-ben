-- 198: DEMAND Summary ▸ Set targets — allow an ABSOLUTE £ revenue target per period, not just a growth %.
-- When a target is entered as a £ figure (vs a % growth), target_gbp holds the absolute revenue target.
-- growth_pct is still stored alongside (the £ converted to % vs last-year revenue) so the existing summary
-- math keeps working for categories with history; for a NEW category (no last-year revenue) growth_pct is
-- null and target_gbp is the source of truth.
ALTER TABLE planner.demand_revenue_target_periods
  ADD COLUMN IF NOT EXISTS target_gbp numeric;
