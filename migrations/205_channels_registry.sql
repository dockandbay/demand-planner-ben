-- 205_channels_registry.sql
-- Modular channels — Phase 1: the config registry. Countries + channels + assignment as first-class tables so a
-- new channel (and its country scope + stock source) can be managed from CONFIG▸Admin. Seeds the 4 existing
-- channels / 5 countries to mirror today's behaviour EXACTLY. Nothing in the app reads these yet (P1 is inert);
-- P2 flips the hardcoded enumerations to read them. See Claude Analyses/MODULAR_CHANNELS_ANALYSIS.md.

CREATE TABLE IF NOT EXISTS planner.countries (
  code       text PRIMARY KEY,
  label      text NOT NULL,
  sort       int DEFAULT 0,
  active     boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS planner.channels (
  code          text PRIMARY KEY,
  label         text NOT NULL,
  stock_source  text NOT NULL DEFAULT '3PL' CHECK (stock_source IN ('3PL','FBA')),   -- where stock is drawn from (buy pool)
  forecast_mode text NOT NULL DEFAULT 'ly-growth' CHECK (forecast_mode IN ('ly-growth','absolute')),
  cover_months  numeric,            -- buy cover-target override (null = use the standard 3PL/FBA default)
  ext_stock_source text,            -- optional external stock pool to net demand against (e.g. 'zalando_stock')
  sku_scope     text DEFAULT 'country-avail',   -- 'country-avail' | 'upload:<table>' | 'manual'
  rt_factor     numeric,            -- reporting/target realisation factor (B2B=0.5; null → default 0.95)
  no_urgent     boolean DEFAULT false,          -- skip the urgent/rush buy scan (B2B = lumpy)
  sort          int DEFAULT 0,
  active        boolean DEFAULT true,
  updated_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS planner.channel_countries (
  channel_code text NOT NULL REFERENCES planner.channels(code) ON DELETE CASCADE,
  country_code text NOT NULL REFERENCES planner.countries(code) ON DELETE CASCADE,
  PRIMARY KEY (channel_code, country_code)
);

-- seed countries (UK/US/EU/AU/CA)
INSERT INTO planner.countries (code,label,sort) VALUES
  ('UK','United Kingdom',1),('US','United States',2),('EU','Europe',3),('AU','Australia',4),('CA','Canada',5)
ON CONFLICT (code) DO NOTHING;

-- seed channels — mirrors current behaviour: DTC/B2B/ZAL draw 3PL, FBA draws FBA; B2B rt 0.5 + no-urgent;
-- ZAL absolute forecast + nets vs zalando_stock + 2-month cover.
INSERT INTO planner.channels (code,label,stock_source,forecast_mode,cover_months,ext_stock_source,sku_scope,rt_factor,no_urgent,sort) VALUES
  ('DTC','Direct to Consumer','3PL','ly-growth',NULL,NULL,'country-avail',NULL,false,1),
  ('FBA','Amazon FBA','FBA','ly-growth',NULL,NULL,'country-avail',NULL,false,2),
  ('B2B','Wholesale / B2B','3PL','ly-growth',NULL,NULL,'country-avail',0.5,true,3),
  ('ZAL','Zalando','3PL','absolute',2,'zalando_stock','upload:zalando_stock',NULL,false,4)
ON CONFLICT (code) DO NOTHING;

-- seed assignments — the current country×channel superset (AU has no B2B; CA is FBA-only; ZAL is EU-only)
INSERT INTO planner.channel_countries (channel_code,country_code) VALUES
  ('DTC','UK'),('DTC','US'),('DTC','EU'),('DTC','AU'),
  ('FBA','UK'),('FBA','US'),('FBA','EU'),('FBA','AU'),('FBA','CA'),
  ('B2B','UK'),('B2B','US'),('B2B','EU'),
  ('ZAL','EU')
ON CONFLICT DO NOTHING;
