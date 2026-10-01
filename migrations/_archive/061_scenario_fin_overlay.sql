-- Financial Forecast scenario overlays: a growth % and price-change % per channel × country,
-- applied to forecast (non-actual) months in the exec-summary-style scenario planner.
CREATE TABLE IF NOT EXISTS planner.scenario_fin_overlay (
  channel    text NOT NULL,
  country    text NOT NULL,
  growth_pct numeric,
  price_pct  numeric,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (channel, country)
);
