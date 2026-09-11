-- 170: BUY ▸ Complex Rules — cover-target override rules for the buy engine (replaces First Buy).
-- A rule = SCOPE (who, optional filters AND'd) × WINDOW (when) × COVERAGE (how much), grouped by country.
-- Effect: for matched SKUs during the window, override the 3PL cover target (the normal buy engine still
-- sizes the order to hit it — NOT a forced fixed buy). Precedence: highest coverage / longest window wins.
CREATE TABLE IF NOT EXISTS planner.buy_complex_rules (
  id           bigserial PRIMARY KEY,
  country      text NOT NULL,                 -- 'UK' | 'US' | 'EU' | 'AU' | 'CA'
  name         text,                          -- optional human label
  -- SCOPE (all optional; when set they are AND'd — a rule with no scope matches every SKU in the country)
  sku          text,                          -- exact SKU match
  category     text,                          -- product category (SL.c)
  tier         text,                          -- marketing tier 'A' | 'B' | 'C'
  season       text,                          -- release window / season
  -- WINDOW (when the rule is active)
  window_from  date,                          -- active from this date; NULL = always on
  window_to    date,                          -- active until this date; NULL = open-ended
  -- COVERAGE (how much cover to guarantee)
  coverage_type text NOT NULL DEFAULT 'months', -- 'months' (XX months of cover) | 'range' (cover a fixed month span)
  cover_months  numeric,                       -- when coverage_type='months'
  range_from    text,                          -- when coverage_type='range'; 'YYYY_MM'
  range_to      text,                          -- when coverage_type='range'; 'YYYY_MM'
  enabled      boolean NOT NULL DEFAULT true,
  updated_by   text,
  updated_at   timestamptz DEFAULT now(),
  created_at   timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS buy_complex_rules_country_idx ON planner.buy_complex_rules (country) WHERE enabled;
