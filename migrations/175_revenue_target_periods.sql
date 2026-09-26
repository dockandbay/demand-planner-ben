-- 175_revenue_target_periods.sql
-- Per-subcategory revenue growth-% targets at month / quarter / half granularity, with
-- inheritance (month falls back to its quarter, then its half). Powers DEMAND ▸ Summary
-- "ADD TARGETS" editor + "Revenue with targets" view. Growth % is vs last-year same period.
--
-- Grain: country × channel × fy × subcategory × level × idx.
--   subcategory = '' reserved for the market/channel TOTAL (keeps this reconcilable with the
--   existing total-level quarterly targets in demand_revenue_targets).
--   level = 'half' (idx 1-2) | 'quarter' (idx 1-4) | 'month' (idx 1-12), FY order (Mar = 1).
--
-- RUN BY: Diviyaj on prod; Ben on sandbox before testing.

CREATE TABLE IF NOT EXISTS planner.demand_revenue_target_periods (
  country     text NOT NULL,
  channel     text NOT NULL,
  fy          int  NOT NULL,
  subcategory text NOT NULL DEFAULT '',
  level       text NOT NULL,
  idx         int  NOT NULL,
  growth_pct  numeric,
  updated_by  text,
  updated_at  timestamptz DEFAULT now(),
  PRIMARY KEY (country, channel, fy, subcategory, level, idx)
);
