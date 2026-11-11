-- migration 438
-- v28.788 (Ben 11-Nov-26): BUY & MOVE > Inventory > Amazon fees. Checks that Fulfil books the fees Amazon actually charged.
-- One run per month: Amazon finance events (read only, via the n8n SP-API finances proxy) and Fulfil's Amazon fee journal lines (read only)
-- are copied here as one row per order x fee type, then compared by marketplace x fee type with a drill-down to orders.
-- HORIZON only reads Amazon and Fulfil for this; nothing is written to either. Safe to re-run.
CREATE TABLE IF NOT EXISTS planner.amz_fee_runs (
  month       date PRIMARY KEY,                 -- first day of the month checked
  status      text NOT NULL DEFAULT 'running',  -- running / done / error
  cursor      jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_by  text,
  started_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  error       text
);
CREATE TABLE IF NOT EXISTS planner.amz_fee_lines (
  id          bigserial PRIMARY KEY,
  month       date NOT NULL,
  source      text NOT NULL CHECK (source IN ('amazon','fulfil')),
  marketplace text NOT NULL,                    -- Amazon.co.uk, Amazon.com, Amazon.ca, Amazon.de/.fr/.it/.es, Amazon.com.au, or 'Unassigned'
  order_id    text,                             -- Amazon order id when the fee belongs to one order
  fee_type    text NOT NULL,                    -- Commission, FBAPerUnitFulfillmentFee, Refund AmazonFees, Service <type>, Advertising ...
  amount      numeric(14,2) NOT NULL,           -- the fee as a cost (positive = charged), in the marketplace currency
  currency    text,
  posted      date,
  ref         text                              -- Fulfil move line id / Amazon event kind
);
CREATE INDEX IF NOT EXISTS amz_fee_lines_month_idx ON planner.amz_fee_lines (month, marketplace, fee_type);
CREATE INDEX IF NOT EXISTS amz_fee_lines_order_idx ON planner.amz_fee_lines (month, order_id);
-- Read back: SELECT to_regclass('planner.amz_fee_runs'), to_regclass('planner.amz_fee_lines');   -- expect both non-null
