-- 345_cogs_values.sql (v28.235, Ben 09-Oct-26)
-- BUY & MOVE > Inventory > COGS: per-unit cost per SKU per warehouse column, sent to the Airtable "cogs-up" table by email.
-- Fulfil only values stock that is on hand, so a SKU that sells out shows 0 there. The LAST KNOWN value is kept here and
-- only replaced when Fulfil has stock (and a cost) again. Additive and idempotent.
CREATE TABLE IF NOT EXISTS planner.cogs_values (
  sku         text        NOT NULL,
  col         text        NOT NULL,              -- Airtable column, e.g. 'UK ILG', 'AU Coghlans'
  value       numeric(14,4),                      -- per unit, in the column's local currency
  ccy         text,                               -- GBP / AUD / USD / EUR / CAD
  source      text        NOT NULL,              -- fulfil | supplier_cost | airtable_csv
  qty         numeric,                            -- Fulfil on-hand when valued from Fulfil
  unit_cost_company numeric(14,5),               -- Fulfil unit cost in the company currency (GBP for UK, AUD for AU)
  fx          numeric(14,6),                      -- rate applied (1 = none)
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  text,
  PRIMARY KEY (sku, col)
);
CREATE TABLE IF NOT EXISTS planner.cogs_uploads (
  id          bigserial PRIMARY KEY,
  kind        text        NOT NULL,              -- email | baseline
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  text,
  recipient   text,
  rows        int,
  changed     int,
  fx          jsonb,
  stats       jsonb,
  sent        boolean,
  note        text
);
CREATE INDEX IF NOT EXISTS cogs_uploads_created_idx ON planner.cogs_uploads (created_at DESC);
