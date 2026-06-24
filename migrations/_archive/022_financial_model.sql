-- 022_financial_model.sql — persisted Financial Forecast Model + per-unit weight (v20.32)
--
-- SCENARIO ▸ Financial Forecast Model: a quarterly (FY Mar–Feb) plan per product category × market.
-- For each FY we hold, per category × country × quarter, the % growth applied to last year's actuals
-- and any % price change (lifts revenue/unit). Units & revenue roll up from last-year actuals
-- (planner.category_sales_summary) × these overrides. This table persists the planning inputs so the
-- model is a living record.
CREATE TABLE IF NOT EXISTS planner.financial_model (
  fy               text,        -- 'FY26' (Mar25–Feb26) | 'FY27' (Mar26–Feb27)
  category         text,
  country          text,        -- UK/US/EU/AU/CA
  quarter          int,         -- 1=Mar–May 2=Jun–Aug 3=Sep–Nov 4=Dec–Feb
  growth_pct       numeric,     -- % growth on last year's actual units for this quarter
  price_change_pct numeric,     -- % change to revenue/unit vs last year
  notes            text,
  updated_at       timestamptz DEFAULT now(),
  PRIMARY KEY (fy, category, country, quarter)
);

-- Per-unit weight (kg) from the SKU_CHILD export — used by the B2B Allocation airfreight costing.
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS prod_weight_uk numeric;
