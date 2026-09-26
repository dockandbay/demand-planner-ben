-- 303_tpl_fulfil_shipments.sql  (Diviyaj, 25-Sep-2026) — Fulfil CUSTOMER-SHIPMENT feed for the 3PL invoice module.
-- ALREADY APPLIED ON LIVE by Diviyaj (his sync fills it; Horizon only READS it). Recorded here so the sandbox can be
-- built to match and so the repo carries the full schema. Numbered 303 in this repo: 301 = supplier onboarding and
-- 302 = Fulfil internal-shipment mirror were already taken (Diviyaj's own copy is named 301_tpl_fulfil_shipments.sql).
-- DDL transcribed from the live table (information_schema + pg_indexes, 25-Sep-2026). Idempotent, additive.
--
-- One row per Fulfil stock.shipment.out. Horizon (v27.905) resolves a 3PL invoice reference against
-- order_reference | shipment_number | sale_number, maps channel_name -> cost centre through
-- tpl_account_map.fulfil_channel, and takes ship_date as the order's month for the cross-month journal.
-- order_reference / sale_number can hold several values joined by ' | ' when one shipment covers several sales.
CREATE TABLE IF NOT EXISTS planner.tpl_fulfil_shipments (
  shipment_id        bigint PRIMARY KEY,          -- stock.shipment.out id
  shipment_number    text,                        -- CS46529
  order_reference    text,                        -- AU-142382 (channel order ref; 'A | B' when multi-sale)
  sale_number        text,                        -- SO53221 ('A | B' when multi-sale)
  sale_ids           text[],
  tpl_reference      text,                        -- the 3PL's own reference where Fulfil carries one
  channel_id         bigint,
  channel_name       text,                        -- dockandbay-au, Amazon.com, Faire US, ...
  company            text,
  warehouse_id       bigint,
  warehouse_code     text,                        -- AUCOGHLANS, EUIFUL, USGENEVA_STD, AMZ_FBA_US, ...
  warehouse_name     text,
  ship_date          date,                        -- effective ship date (the order's month for accounting)
  planned_date       date,
  carrier            text,
  carrier_service    text,
  tracking_number    text,
  units              numeric,
  weight             numeric,
  ship_cost          numeric,
  ship_cost_currency text,
  sale_total         numeric,
  sale_currency      text,
  country_code       text,
  fulfil_write_date  timestamptz,
  synced_at          timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tpl_fulfil_shipments_so    ON planner.tpl_fulfil_shipments (sale_number);
CREATE INDEX IF NOT EXISTS tpl_fulfil_shipments_date  ON planner.tpl_fulfil_shipments (ship_date);
CREATE INDEX IF NOT EXISTS tpl_fulfil_shipments_wh    ON planner.tpl_fulfil_shipments (warehouse_code, ship_date);
CREATE INDEX IF NOT EXISTS tpl_fulfil_shipments_wdate ON planner.tpl_fulfil_shipments (fulfil_write_date);
CREATE INDEX IF NOT EXISTS tpl_fulfil_shipments_ref   ON planner.tpl_fulfil_shipments (order_reference);
CREATE INDEX IF NOT EXISTS tpl_fulfil_shipments_num   ON planner.tpl_fulfil_shipments (shipment_number);
