-- v28.416 (Ben 20-Oct-26): weekly demand phase 1 (spec docs/specs/WEEKLY_DEMAND_AND_ORDER_EXCLUSIONS_SPEC_2026-10-20.md).
-- Additive only: four new tables. Nothing existing is changed; the monthly sales_actuals / forecast_outputs keep driving every screen
-- and the buy plan until Ben switches after the impact report.

-- One row per Fulfil sale line (read daily from LIVE Fulfil by the order-lines sync).
CREATE TABLE IF NOT EXISTS planner.order_lines (
  line_id        bigint PRIMARY KEY,          -- Fulfil sale.line id
  sale_id        bigint NOT NULL,
  so_number      text,
  reference      text,
  fulfil_channel text,                        -- Fulfil sales channel name (dockandbay-uk, Amazon.de, ...)
  channel_segment text,
  customer       text,
  country        text,                        -- HORIZON market (UK / US / EU / AU / CA), null = unmapped channel
  channel        text,                        -- HORIZON channel (DTC / FBA / B2B / TIK / ZAL), null = unmapped
  is_wholesale   boolean NOT NULL DEFAULT false,   -- wholesale / Faire / eZComm / distributor channels
  is_key_account boolean NOT NULL DEFAULT false,
  is_custom      boolean NOT NULL DEFAULT false,   -- custom / co-brand channels
  sku            text NOT NULL,
  qty            numeric NOT NULL DEFAULT 0,       -- ordered minus cancelled
  unit_price     numeric,
  currency       text,
  order_date     date,                        -- Fulfil sale_date (NOT created_at: imported history carries the import date there)
  ship_date      date,                        -- line shipping date
  sale_state     text,
  basis          text NOT NULL DEFAULT 'order',    -- 'order' | 'ship' (wholesale / key account shipping > order + 14 days)
  demand_date    date,                        -- order_date or ship_date per basis
  iso_week       date,                        -- Monday of demand_date's ISO week
  synced_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_lines_week_idx  ON planner.order_lines (iso_week);
CREATE INDEX IF NOT EXISTS order_lines_sku_idx   ON planner.order_lines (sku);
CREATE INDEX IF NOT EXISTS order_lines_sale_idx  ON planner.order_lines (sale_id);
CREATE INDEX IF NOT EXISTS order_lines_qty_idx   ON planner.order_lines (qty) WHERE qty > 40;

-- Ben's per-order decisions on the Order exclusions page (Demand > Inputs). Candidates are computed (lines over the threshold).
CREATE TABLE IF NOT EXISTS planner.order_exclusions (
  sale_id     bigint PRIMARY KEY,
  so_number   text,
  excluded    boolean NOT NULL DEFAULT false,
  note        text,
  changed_by  text,
  changed_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS planner.order_exclusions_log (
  id          bigserial PRIMARY KEY,
  sale_id     bigint NOT NULL,
  so_number   text,
  excluded    boolean NOT NULL,
  note        text,
  changed_by  text,
  changed_at  timestamptz NOT NULL DEFAULT now()
);

-- Weekly actuals (ISO weeks, order-date basis, exclusions applied). Rebuilt from order_lines; weeks before Fulfil history are the
-- monthly ship-date actuals spread over each month's days (source 'monthly_spread').
CREATE TABLE IF NOT EXISTS planner.sales_actuals_weekly (
  sku       text NOT NULL,
  country   text NOT NULL,
  channel   text NOT NULL,
  iso_week  date NOT NULL,
  units     numeric NOT NULL DEFAULT 0,
  revenue   numeric,
  source    text NOT NULL DEFAULT 'fulfil',
  built_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (sku, country, channel, iso_week)
);
CREATE INDEX IF NOT EXISTS sales_actuals_weekly_week_idx ON planner.sales_actuals_weekly (iso_week);

-- Weekly forecast (migrated from the monthly forecast keeping each financial year's total; edited weekly or monthly in phase 2).
CREATE TABLE IF NOT EXISTS planner.forecast_weekly (
  sku         text NOT NULL,
  country     text NOT NULL,
  channel     text NOT NULL,
  iso_week    date NOT NULL,
  units       numeric NOT NULL DEFAULT 0,
  version     text NOT NULL,
  entered_as  text NOT NULL DEFAULT 'migrated',   -- 'migrated' | 'month' | 'week'
  updated_by  text,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (sku, country, channel, iso_week, version)
);
CREATE INDEX IF NOT EXISTS forecast_weekly_version_idx ON planner.forecast_weekly (version);

INSERT INTO planner.app_settings (key, value) VALUES ('order_exclusion_threshold', '40') ON CONFLICT (key) DO NOTHING;
