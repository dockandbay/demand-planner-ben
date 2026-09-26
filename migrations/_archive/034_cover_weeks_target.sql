-- 034_cover_weeks_target.sql — cover-weeks target alongside sell-through (v20.92)
--
-- Target weeks of stock cover for a category × market, edited in DEMAND ▸ Targets (metric toggle). Used to
-- enrich Demand Actions guidance ("X units on hand, ~Y wks cover at NN/mo — below the Zwk target").
ALTER TABLE planner.sell_through_targets ADD COLUMN IF NOT EXISTS cover_weeks_target numeric;
