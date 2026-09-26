-- 169: DEMAND ▸ Revenue — definitive price changes that lift the revenue forecast (ASP uplift) from an effective
-- month. Scope: country (required) + optional channel + optional subcategory. Multiple changes COMPOUND (both a
-- country-wide and a subcategory change apply). Units are unaffected (revenue-only, no elasticity in v1).
CREATE TABLE IF NOT EXISTS planner.price_changes (
  id          bigserial PRIMARY KEY,
  country     text NOT NULL,
  channel     text,                   -- NULL = all channels
  subcategory text,                   -- NULL = all subcategories in the country
  effective_month text NOT NULL,      -- 'YYYY-MM' — uplift applies from this month forward
  uplift_pct  numeric NOT NULL,
  note        text,
  created_by  text,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS price_changes_country_idx ON planner.price_changes(country);
