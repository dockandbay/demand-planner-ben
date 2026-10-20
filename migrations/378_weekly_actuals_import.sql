-- v28.417 (Ben 20-Oct-26): real weekly actuals back-dated per channel later (once loaded) override both the Fulfil order lines and the
-- monthly spread in planner.sales_actuals_weekly, per market x channel x ISO week. Additive only; empty until history is loaded.
CREATE TABLE IF NOT EXISTS planner.sales_actuals_weekly_import (
  sku        text NOT NULL,
  country    text NOT NULL,
  channel    text NOT NULL,
  iso_week   date NOT NULL,              -- Monday of the ISO week
  units      numeric NOT NULL DEFAULT 0,
  revenue    numeric,
  source     text,                       -- where the history came from (e.g. 'cin7_orders', 'shopify')
  loaded_by  text,
  loaded_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (sku, country, channel, iso_week)
);
CREATE INDEX IF NOT EXISTS sales_actuals_weekly_import_week_idx ON planner.sales_actuals_weekly_import (country, channel, iso_week);
