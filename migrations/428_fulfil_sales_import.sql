-- migration 428
-- v28.757 (Ben 10-Nov-26): Fulfil sales import, TEST build (spec docs/specs/FULFIL_SALES_IMPORT_SPEC_2026-11-10.md).
-- Additive only. Nothing existing reads these yet: sales_actuals (Google Sheet) keeps driving every screen and the buy plan.

-- 1. Fulfil sales channel -> HORIZON market + channel (replaces the hard-coded map; editable later in CONFIG).
--    kind: dtc | fba | b2b (wholesale / distributor / Faire) | key (key account, excluded) | custom (co-brand, excluded unless agent-tagged)
--          | tik | zal | mkt (old marketplaces, held out of demand until Ben decides) | ignore
--    dtc_ref_pattern: on a DTC channel, orders whose reference does not match are dropped (Ben 10-Nov-26: the historical Shopify
--    channels carry Cin7 key-account orders such as UDIS17187-18 / DILL-3119392704; Shopify orders look like US-2157236).
CREATE TABLE IF NOT EXISTS planner.fulfil_channel_map (
  channel_name    text PRIMARY KEY,
  country         text,
  channel         text,
  kind            text NOT NULL,
  dtc_ref_pattern text,
  is_historical   boolean NOT NULL DEFAULT false,
  note            text,
  updated_by      text,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fulfil_channel_map_kind_check CHECK (kind IN ('dtc','fba','b2b','key','custom','tik','zal','mkt','ignore'))
);
INSERT INTO planner.fulfil_channel_map (channel_name, country, channel, kind, dtc_ref_pattern, is_historical) VALUES
  ('dockandbay-uk','UK','DTC','dtc',NULL,false), ('dockandbay-us','US','DTC','dtc',NULL,false), ('dockandbay-eu','EU','DTC','dtc',NULL,false), ('dockandbay-au','AU','DTC','dtc',NULL,false),
  ('dockandbay-uk-ws','UK','B2B','b2b',NULL,false), ('dockandbay-us-ws','US','B2B','b2b',NULL,false), ('dockandbay-eu-ws','EU','B2B','b2b',NULL,false),
  ('Faire UK','UK','B2B','b2b',NULL,false), ('Faire US','US','B2B','b2b',NULL,false), ('eZComm','US','B2B','b2b',NULL,false), ('Markettime US','US','B2B','b2b',NULL,false),
  ('UK - Wholesale & Distributor','UK','B2B','b2b',NULL,false), ('AU - Wholesale','AU','B2B','b2b',NULL,false),
  ('International Distributor (UK entity)','UK','B2B','b2b',NULL,false), ('International Distributor (AU entity)','AU','B2B','b2b',NULL,false), ('EU - International Distributor','EU','B2B','b2b',NULL,false),
  ('UK - Key Accounts','UK','B2B','key',NULL,false), ('US - Key Accounts','US','B2B','key',NULL,false), ('EU - Key Accounts','EU','B2B','key',NULL,false),
  ('UK - Custom/Co-Brand','UK','B2B','custom',NULL,false), ('US - Custom/Co-Brand','US','B2B','custom',NULL,false), ('EU - Custom/Co-Brand','EU','B2B','custom',NULL,false), ('AU - Custom/Co-Brand','AU','B2B','custom',NULL,false),
  ('International Distributor (Co Brand - UK entity)','UK','B2B','custom',NULL,false),
  ('TikTok UK','UK','TIK','tik',NULL,false), ('TikTok US','US','TIK','tik',NULL,false),
  ('Amazon.co.uk','UK','FBA','fba',NULL,false), ('Amazon.com','US','FBA','fba',NULL,false), ('Amazon.com.au','AU','FBA','fba',NULL,false), ('Amazon.ca','CA','FBA','fba',NULL,false),
  ('Amazon.de','EU','FBA','fba',NULL,false), ('Amazon.es','EU','FBA','fba',NULL,false), ('Amazon.fr','EU','FBA','fba',NULL,false), ('Amazon.it','EU','FBA','fba',NULL,false),
  ('Amazon.ie','EU','FBA','fba',NULL,false), ('Amazon.pl','EU','FBA','fba',NULL,false), ('Amazon.se','EU','FBA','fba',NULL,false), ('Amazon.com.be','EU','FBA','fba',NULL,false), ('Amazon.nl','EU','FBA','fba',NULL,false),
  ('dock-bay-gma',NULL,NULL,'mkt',NULL,false), ('Manual Testing',NULL,NULL,'ignore',NULL,false),
  ('HISTORICAL dockandbay-us','US','DTC','dtc','^(US|AU|EU|CA|UK)-?[0-9]+[A-Z]{0,2}$|^#?[0-9]+$',true),
  ('HISTORICAL dockandbay-eu','EU','DTC','dtc','^(US|AU|EU|CA|UK)-?[0-9]+[A-Z]{0,2}$|^#?[0-9]+$',true),
  ('HISTORICAL dockandbay-au','AU','DTC','dtc','^(US|AU|EU|CA|UK)-?[0-9]+[A-Z]{0,2}$|^#?[0-9]+$',true),
  ('HISTORICAL dockandbay-ca','CA','DTC','dtc','^(US|AU|EU|CA|UK)-?[0-9]+[A-Z]{0,2}$|^#?[0-9]+$',true),
  ('HISTORICAL dockandbay-us-ws','US','B2B','b2b',NULL,true), ('HISTORICAL dockandbay-eu-ws','EU','B2B','b2b',NULL,true), ('HISTORICAL dockandbay-ca-ws','CA','B2B','b2b',NULL,true),
  ('HISTORICAL Amazon.com','US','FBA','fba',NULL,true), ('HISTORICAL Amazon.com.au','AU','FBA','fba',NULL,true), ('HISTORICAL Amazon.ca','CA','FBA','fba',NULL,true),
  ('HISTORICAL Amazon.de','EU','FBA','fba',NULL,true), ('HISTORICAL Amazon.it','EU','FBA','fba',NULL,true), ('HISTORICAL Amazon.es','EU','FBA','fba',NULL,true), ('HISTORICAL Amazon.fr','EU','FBA','fba',NULL,true),
  ('HISTORICAL dock-bay-gma',NULL,NULL,'mkt',NULL,true), ('HISTORICAL TheView',NULL,NULL,'mkt',NULL,true)
ON CONFLICT (channel_name) DO NOTHING;

-- 2. Order lines: the extra facts the import needs (company, warehouse, line amount in the sale currency, GBP, local currency, free lines,
--    why the line's channel was set).
ALTER TABLE planner.order_lines ADD COLUMN IF NOT EXISTS company        text;          -- Fulfil company code (UK / AU / DBA)
ALTER TABLE planner.order_lines ADD COLUMN IF NOT EXISTS warehouse_code text;
ALTER TABLE planner.order_lines ADD COLUMN IF NOT EXISTS is_historical  boolean NOT NULL DEFAULT false;
ALTER TABLE planner.order_lines ADD COLUMN IF NOT EXISTS line_amount    numeric;       -- untaxed line amount, sale currency
ALTER TABLE planner.order_lines ADD COLUMN IF NOT EXISTS amount_company numeric;       -- untaxed line amount, company currency (GBP for UK, AUD for AU)
ALTER TABLE planner.order_lines ADD COLUMN IF NOT EXISTS local_ccy      text;          -- the market's currency (UK GBP, US USD, EU EUR, AU AUD, CA CAD)
ALTER TABLE planner.order_lines ADD COLUMN IF NOT EXISTS revenue_local  numeric;       -- line amount in the market's currency
ALTER TABLE planner.order_lines ADD COLUMN IF NOT EXISTS revenue_gbp    numeric;       -- UK entity: Fulfil's GBP; AU entity: AUD / CONFIG FY rate
ALTER TABLE planner.order_lines ADD COLUMN IF NOT EXISTS is_free        boolean NOT NULL DEFAULT false;   -- zero-price line: demand yes, ASP no
ALTER TABLE planner.order_lines ADD COLUMN IF NOT EXISTS class_rule     text;          -- e.g. 'dtc_non_shopify_ref' (dropped), 'unmapped_channel'
ALTER TABLE planner.order_lines ADD COLUMN IF NOT EXISTS product_category text;        -- Fulfil account category (Shipping = not merch)
ALTER TABLE planner.order_lines ADD COLUMN IF NOT EXISTS fulfil_write_at timestamptz;
CREATE INDEX IF NOT EXISTS order_lines_ref_idx ON planner.order_lines (reference);
CREATE INDEX IF NOT EXISTS order_lines_demand_idx ON planner.order_lines (demand_date);

-- 3. Anomaly orders surfaced for exclusion (rebuilt by the import; Ben's decisions stay in planner.order_exclusions).
CREATE TABLE IF NOT EXISTS planner.order_anomalies (
  sale_id     bigint NOT NULL,
  rule        text NOT NULL,      -- line_over_threshold | order_over_p999 | duplicate_reference | zero_price
  so_number   text,
  reference   text,
  fulfil_channel text,
  country     text,
  channel     text,
  customer    text,
  order_date  date,
  units       numeric,
  detail      text,
  detected_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (sale_id, rule)
);

-- 4. Monthly actuals built from Fulfil, same shape as planner.sales_actuals (+ local currency, free units) so the switch is a setting.
CREATE TABLE IF NOT EXISTS planner.sales_actuals_fulfil (
  sku           text NOT NULL,
  country       text NOT NULL,
  channel       text NOT NULL,
  month         date NOT NULL,
  units         numeric NOT NULL DEFAULT 0,   -- incl. free units (demand)
  revenue       numeric,                      -- GBP, ex tax (as sales_actuals)
  revenue_local numeric,                      -- market currency, ex tax
  local_ccy     text,
  units_free    numeric NOT NULL DEFAULT 0,   -- zero-price units: leave out of ASP (units - units_free)
  source        text NOT NULL DEFAULT 'fulfil',
  loaded_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (sku, country, channel, month)
);
ALTER TABLE planner.sales_actuals_weekly ADD COLUMN IF NOT EXISTS revenue_local numeric;
ALTER TABLE planner.sales_actuals_weekly ADD COLUMN IF NOT EXISTS units_free numeric;

-- 5. Run log.
CREATE TABLE IF NOT EXISTS planner.sales_import_runs (
  id          bigserial PRIMARY KEY,
  started_at  timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  mode        text,                -- inc | range | build
  scope       text,
  lines_read  int,
  lines_saved int,
  orders_read int,
  more        boolean,
  ms          int,
  error       text,
  run_by      text
);
