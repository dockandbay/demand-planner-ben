-- 177_tpl_cin7_imports.sql
-- Logs each Cin7 sales-order import run so we can (a) show a per-month summary (orders + date range +
-- runs), (b) skip re-importing already-covered dates (incremental), and (c) run an end-of-month "sweep up"
-- that re-fetches the whole month to catch late/missed invoices. Orders themselves live in tpl_cin7_orders.

CREATE TABLE IF NOT EXISTS planner.tpl_cin7_imports (
  id        serial PRIMARY KEY,
  tpl       text,
  period    text NOT NULL,           -- YYYY-MM
  from_date date,
  to_date   date,
  orders    int,
  kind      text,                    -- 'incremental' | 'sweep' | 'range'
  ran_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tpl_cin7_imports_period_idx ON planner.tpl_cin7_imports (period);
