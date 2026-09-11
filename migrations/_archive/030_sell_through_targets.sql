-- 030_sell_through_targets.sql — sell-through % targets by category × market (v20.82)
--
-- The merchandising target sell-through for a category in a market (e.g. Cabana 70% UK / 65% US). Drives
-- the "are we trading to plan" view and (later) the buy/markdown signals. Editable in DEMAND ▸ TARGETS.
CREATE TABLE IF NOT EXISTS planner.sell_through_targets (
  category   text NOT NULL,
  market     text NOT NULL,          -- 'UK' | 'US' | 'EU' | 'AU'
  target_pct numeric,                -- 0–100
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (category, market)
);
