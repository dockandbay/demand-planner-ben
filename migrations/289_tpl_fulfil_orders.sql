-- 289: 3PL invoice — Fulfil sales-order side (Ben 21-Sep). As we migrate off Cin7, the 3PL-invoice cost-centre mapping
-- must resolve order references against FULFIL sales orders too. Fulfil has no cost-centre field — it has a CHANNEL —
-- so tpl_account_map gains a `fulfil_channel` column mapping a Fulfil channel name (e.g. 'dockandbay-eu') to that
-- region/channel account row. Fulfil orders land in their OWN table (not mixed with tpl_cin7_orders); the map step joins
-- both and picks the source of truth per order (Cin7 invoice date wins; else Fulfil, esp. if shipped).
CREATE TABLE IF NOT EXISTS planner.tpl_fulfil_orders (
  reference text PRIMARY KEY,            -- customer order ref (EU-42609 / AU-141419) — the join key to a 3PL invoice line
  fulfil_id bigint,
  number text,                           -- Fulfil sale number (SO…), when assigned
  channel_name text,                     -- e.g. dockandbay-eu / dockandbay-au / dockandbay-uk-ws
  channel_id bigint,
  shipment_state text,                   -- none | waiting | packed | sent | done …
  invoice_state text,
  total numeric,
  company text,                          -- [UK]/[AU] Dock & Bay …
  warehouse_code text,                   -- 3PL warehouse (AUCOGHLANS, …)
  period text,                           -- the invoice period this order was imported for (YYYY-MM)
  imported_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tpl_fulfil_orders_period ON planner.tpl_fulfil_orders (period);
CREATE INDEX IF NOT EXISTS tpl_fulfil_orders_channel ON planner.tpl_fulfil_orders (channel_name);

ALTER TABLE planner.tpl_account_map ADD COLUMN IF NOT EXISTS fulfil_channel text;
