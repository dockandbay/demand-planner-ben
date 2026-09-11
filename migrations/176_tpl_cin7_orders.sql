-- 176_tpl_cin7_orders.sql
-- Local cache of Cin7 sales orders for 3PL invoice Cost-Centre mapping. Populated by a MANUAL fetch
-- (POST /api/supply/tpl/cin7-import) for the previous month, filtered by the order's InvoiceDate.
-- The 3PL "Map to Cost Centres" step then resolves Reference -> CostCenter against this table (offline,
-- no live Cin7 call at analyse time).

CREATE TABLE IF NOT EXISTS planner.tpl_cin7_orders (
  cin7_id            bigint PRIMARY KEY,
  reference          text,
  customer_order_no  text,
  cost_center        text,
  member_cost_center text,
  invoice_date       date,
  branch_id          bigint,
  total              numeric,
  freight_total      numeric,
  period             text,          -- YYYY-MM the import was run for
  imported_at        timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tpl_cin7_orders_ref_idx ON planner.tpl_cin7_orders (reference);
CREATE INDEX IF NOT EXISTS tpl_cin7_orders_con_idx ON planner.tpl_cin7_orders (customer_order_no);
