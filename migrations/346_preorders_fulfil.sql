-- v28.241 (Ben 09-Oct-26): preorders come from Fulfil, not Airtable.
-- Future-dated, ship-from-stock sales order lines that are not yet assigned are summed per SKU x 3PL x ship date into
-- planner.preorders (source = 'fulfil'); the line detail behind them lives in planner.preorder_lines for DEMAND > Inputs > Preorders.
-- Additive and idempotent. Until this is applied the app keeps reading planner.preorders as before.

ALTER TABLE planner.preorders ADD COLUMN IF NOT EXISTS source text;      -- 'fulfil' = written by the Fulfil sync; null = old Airtable/n8n rows
ALTER TABLE planner.preorders ADD COLUMN IF NOT EXISTS customers text;   -- customers behind a summed row (display only)

CREATE TABLE IF NOT EXISTS planner.preorder_lines (
  line_id bigint PRIMARY KEY,            -- Fulfil sale.line id
  sale_id bigint,
  sale_number text,
  sale_reference text,
  customer text,
  channel text,
  sale_state text,
  sku text,
  product_name text,
  fulfil_warehouse text,                 -- Fulfil warehouse code (UKILG, USGENEVA_STD, ...)
  warehouse text,                        -- HORIZON 3PL (uk_3pl, us_3pl, eu_3pl, au_3pl); null when excluded
  ship_date date,
  quantity numeric,
  move_state text,                       -- stock move state(s); 'none' when Fulfil has not created moves yet
  included boolean NOT NULL DEFAULT true,
  exclude_reason text,                   -- why a line does not feed the buy plan (China stock, key account forecast, ...)
  synced_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS preorder_lines_sale_idx ON planner.preorder_lines (sale_number);

CREATE TABLE IF NOT EXISTS planner.preorder_syncs (
  id bigserial PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  orders integer,
  lines integer,
  units numeric,
  skus integer,
  stats jsonb,
  note text
);
