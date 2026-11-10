-- migration 431
-- v28.761 (Ben 10-Nov-26): efficient storage for Fulfil sales. planner.order_lines keeps LINE DETAIL only where it is needed (Ben: order
-- level only for anomalies in history and the current month, which is not a full aggregate yet): the current month (app_settings
-- sales_detail_months = extra months, default 0), every order flagged as an anomaly or with an exclusion decision, custom / co-brand orders
-- (whether they count depends on an agent tag that often arrives later; about 30 a year), and future-dated lines. Older demand lines are rolled up here, one row per Fulfil channel x SKU x market x
-- channel x ISO week x calendar month (a week straddling two months gives two rows, so weekly AND monthly totals stay exact), and their
-- lines are deleted. Lines that never count as demand (no market / channel, not a HORIZON product) are deleted without a roll-up.
-- A re-import of a channel x months replaces that range's roll-up rows. Additive.
CREATE TABLE IF NOT EXISTS planner.sales_rollup (
  fulfil_channel text NOT NULL,
  sku            text NOT NULL,             -- HORIZON SKU (AU-/UK-/US- prefix already mapped)
  country        text NOT NULL,
  channel        text NOT NULL,
  iso_week       date NOT NULL,             -- Monday
  month          date NOT NULL,             -- calendar month of the demand dates
  units          numeric NOT NULL DEFAULT 0,
  units_free     numeric NOT NULL DEFAULT 0,
  revenue_gbp    numeric NOT NULL DEFAULT 0,
  revenue_local  numeric NOT NULL DEFAULT 0,
  local_ccy      text,
  lines          int NOT NULL DEFAULT 0,
  orders         int NOT NULL DEFAULT 0,
  is_historical  boolean NOT NULL DEFAULT false,
  rolled_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (fulfil_channel, sku, country, channel, iso_week, month)
);
CREATE INDEX IF NOT EXISTS sales_rollup_month_idx ON planner.sales_rollup (month);
CREATE INDEX IF NOT EXISTS sales_rollup_week_idx ON planner.sales_rollup (iso_week);
INSERT INTO planner.app_settings (key, value) VALUES ('sales_detail_months', '0') ON CONFLICT (key) DO NOTHING;
