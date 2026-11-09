-- migration 423
-- v28.744 (Ben 09-Nov-26, SUG-0047): BUY & MOVE > Inventory > Adjustments. Every large Fulfil stock adjustment (a done move to or from
-- Lost and Found: 3PL / Amazon cycle counts, HORIZON ILG / Geneva rebaselines, manual counts) is synced here so the team can record a
-- reason and tags per adjustment. Amazon adjustments reversed soon after are flagged as timing.
CREATE TABLE IF NOT EXISTS planner.stock_adjustments (
  move_id             bigint PRIMARY KEY,            -- Fulfil stock.move id
  effective_date      date NOT NULL,
  sku                 text,
  product_id          bigint,
  qty                 numeric NOT NULL,              -- signed: + found (into stock), - lost (out to Lost and Found)
  location_id         bigint,
  location_name       text,
  kind                text NOT NULL DEFAULT '3pl',   -- 'amazon' | '3pl'
  cost_price          numeric,
  value               numeric,                       -- qty x cost price (signed)
  origin              text,
  count_id            bigint,                        -- Fulfil stock.inventory id
  count_number        text,
  count_reason        text,                          -- the Fulfil count's own reason text
  fulfil_user         text,
  rebaseline_batch_id bigint,                        -- planner.ilg_rebaseline_batches.id when HORIZON made the count
  reason              text,
  tags                text[] NOT NULL DEFAULT '{}',
  reason_by           text,
  reason_at           timestamptz,
  reversed_qty        numeric,                       -- opposite moves found within the reversal window
  reversed_at         date,
  reversed_by         text,                          -- the Fulfil move ids that reverse it
  reversal_checked_at timestamptz,
  synced_at           timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS stock_adjustments_date_idx ON planner.stock_adjustments (effective_date DESC);
CREATE INDEX IF NOT EXISTS stock_adjustments_loc_idx ON planner.stock_adjustments (location_name);
CREATE INDEX IF NOT EXISTS stock_adjustments_sku_idx ON planner.stock_adjustments (sku);

CREATE TABLE IF NOT EXISTS planner.stock_adjustment_tags (
  tag        text PRIMARY KEY,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO planner.stock_adjustment_tags (tag, created_by) VALUES
  ('reason unknown', 'system'), ('supplier labelling', 'system'), ('timing (reversed)', 'system')
ON CONFLICT (tag) DO NOTHING;

-- a reason / tags typed when a rebaseline is sent; copied onto its adjustments when they sync
ALTER TABLE planner.ilg_rebaseline_batches ADD COLUMN IF NOT EXISTS reason text;
ALTER TABLE planner.ilg_rebaseline_batches ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
