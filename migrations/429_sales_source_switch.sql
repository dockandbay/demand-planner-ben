-- migration 429
-- v28.759 (Ben 10-Nov-26): the sales actuals SOURCE switch. One setting (app_settings 'sales_actuals_source') picks what every HORIZON
-- screen reads as monthly sales actuals, through the FINAL view planner.sales_actuals_final (Ben 10-Nov-26: readers point at the final data,
-- never the source tables). The Fulfil sources already have the excluded anomaly orders taken out (planner.order_exclusions, applied when
-- sales_actuals_fulfil / _weekly are built); the Cin7 sheet has no order detail, so nothing can be excluded from it.
--   'sheet'          Cin7 historical + Fulfil current (today: planner.sales_actuals, the Google Sheet import). Default.
--   'fulfil_monthly' Fulfil history, monthly (planner.sales_actuals_fulfil) from each market x channel's cut-over month; the sheet before it.
--   'fulfil_weekly'  Fulfil history, weekly (planner.sales_actuals_fulfil_weekly); for monthly screens each ISO week is split over its
--                    days (Ben 10-Nov-26: a straddling week gives each month days/7), the sheet before the cut-over month.
-- Each branch is gated by an uncorrelated sub-select, so Postgres skips the branches that are not selected (one-time filter).
-- Rollback = set the setting back to 'sheet'. Additive: planner.sales_actuals and its n8n feed are unchanged.

-- Fulfil weekly actuals over the whole history (same demand rules as sales_actuals_fulfil; rebuilt by the import).
CREATE TABLE IF NOT EXISTS planner.sales_actuals_fulfil_weekly (
  sku           text NOT NULL,
  country       text NOT NULL,
  channel       text NOT NULL,
  iso_week      date NOT NULL,                -- Monday
  units         numeric NOT NULL DEFAULT 0,
  revenue       numeric,                      -- GBP, ex tax
  revenue_local numeric,
  local_ccy     text,
  units_free    numeric NOT NULL DEFAULT 0,
  loaded_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (sku, country, channel, iso_week)
);
CREATE INDEX IF NOT EXISTS sales_actuals_fulfil_weekly_week_idx ON planner.sales_actuals_fulfil_weekly (iso_week);

-- Per market x channel: the first month the Fulfil sources are used (earlier months stay on the sheet). auto = worked out by the import
-- (first full month of real Fulfil volume); a hand-set row (auto=false) is never overwritten.
CREATE TABLE IF NOT EXISTS planner.sales_source_cuts (
  country     text NOT NULL,
  channel     text NOT NULL,
  fulfil_from date NOT NULL,
  auto        boolean NOT NULL DEFAULT true,
  note        text,
  updated_by  text,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (country, channel)
);

INSERT INTO planner.app_settings (key, value) VALUES ('sales_actuals_source', 'sheet') ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE VIEW planner.sales_actuals_final AS
  -- the sheet: everything when the source is 'sheet', else only the months before each market x channel's cut-over
  SELECT s.sku, s.country, s.channel, s.month, s.units, s.revenue, s.source, s.loaded_at, 0::numeric AS units_free
  FROM planner.sales_actuals s
  WHERE (SELECT value FROM planner.app_settings WHERE key = 'sales_actuals_source') IS DISTINCT FROM 'fulfil_monthly'
    AND (SELECT value FROM planner.app_settings WHERE key = 'sales_actuals_source') IS DISTINCT FROM 'fulfil_weekly'
UNION ALL
  SELECT s.sku, s.country, s.channel, s.month, s.units, s.revenue, s.source, s.loaded_at, 0::numeric
  FROM planner.sales_actuals s
  WHERE (SELECT value FROM planner.app_settings WHERE key = 'sales_actuals_source') IN ('fulfil_monthly', 'fulfil_weekly')
    AND NOT EXISTS (SELECT 1 FROM planner.sales_source_cuts c WHERE c.country = s.country AND c.channel = s.channel AND s.month >= c.fulfil_from)
UNION ALL
  SELECT f.sku, f.country, f.channel, f.month, f.units, f.revenue, 'fulfil_monthly', f.loaded_at, f.units_free
  FROM planner.sales_actuals_fulfil f JOIN planner.sales_source_cuts c ON c.country = f.country AND c.channel = f.channel AND f.month >= c.fulfil_from
  WHERE (SELECT value FROM planner.app_settings WHERE key = 'sales_actuals_source') = 'fulfil_monthly'
UNION ALL
  -- weeks to months split by days (Ben 10-Nov-26): a week straddling two months gives each month its days / 7 of the week
  SELECT w.sku, w.country, w.channel, date_trunc('month', d.d)::date, round(sum(w.units / 7.0), 4), round(sum(w.revenue / 7.0), 2), 'fulfil_weekly', max(w.loaded_at), round(sum(w.units_free / 7.0), 4)
  FROM planner.sales_actuals_fulfil_weekly w
  CROSS JOIN LATERAL generate_series(w.iso_week, w.iso_week + 6, interval '1 day') d(d)
  JOIN planner.sales_source_cuts c ON c.country = w.country AND c.channel = w.channel AND date_trunc('month', d.d)::date >= c.fulfil_from
  WHERE (SELECT value FROM planner.app_settings WHERE key = 'sales_actuals_source') = 'fulfil_weekly'
  GROUP BY 1,2,3,4;
