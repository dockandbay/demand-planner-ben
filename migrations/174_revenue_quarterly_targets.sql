-- 174_revenue_quarterly_targets.sql
-- Quarterly growth-% revenue targets on DEMAND > Inputs > Revenue > Targets & tracking.
-- Adds four nullable growth-% columns to planner.demand_revenue_targets. Each is a growth %
-- vs last-year the SAME quarter; the quarter/FY target £ is computed client-side.
-- target_type gains a new value 'quarterly' (target_type is free text, no CHECK to alter).
-- FY quarters (FY starts March): Q1 Mar-May, Q2 Jun-Aug, Q3 Sep-Nov, Q4 Dec-Feb.
--
-- RUN BY: Diviyaj on production (and Ben on the sandbox before testing). Backward-compatible:
-- existing 'pct'/'value' rows keep working; a row converts to 'quarterly' on first quarterly save.

ALTER TABLE planner.demand_revenue_targets
  ADD COLUMN IF NOT EXISTS target_q1_pct numeric,
  ADD COLUMN IF NOT EXISTS target_q2_pct numeric,
  ADD COLUMN IF NOT EXISTS target_q3_pct numeric,
  ADD COLUMN IF NOT EXISTS target_q4_pct numeric;
