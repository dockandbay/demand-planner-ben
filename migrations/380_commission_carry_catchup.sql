-- v28.430 (Ben 21-Oct-26): commission runs. Additive only.
-- 1. client_po: the customer's own PO number on each run row ("an important field they like to show").
-- 2. carried_from: a row DEFERRED in an earlier run (the run's remove button now defers) is carried into the agent's next run as a new row
--    pointing at the deferred one, until a run pays it.
-- 3. sort_order: the order agents show in the monthly run tabs (CLIENT > Config, drag and drop).
-- 4. commission_catchup: earlier commission found earned but never paid (not in the paid history, not in any run) by Import data >
--    Find unpaid earlier commission (the 6 months before the run month); Build adds them to that month's runs as catch-up rows.
ALTER TABLE planner.commission_rows ADD COLUMN IF NOT EXISTS client_po text;
ALTER TABLE planner.commission_rows ADD COLUMN IF NOT EXISTS carried_from bigint;
CREATE INDEX IF NOT EXISTS commission_rows_carried_from_idx ON planner.commission_rows (carried_from) WHERE carried_from IS NOT NULL;
ALTER TABLE planner.rep_groups ADD COLUMN IF NOT EXISTS sort_order integer;
CREATE TABLE IF NOT EXISTS planner.commission_catchup (
  id             bigserial PRIMARY KEY,
  run_month      text NOT NULL,          -- the run month the item is for (YYYY-MM)
  earned_month   text NOT NULL,          -- the month it was earned (YYYY-MM)
  rep_group_id   integer NOT NULL,
  order_ref      text,
  invoice_ref    text,
  client_po      text,
  customer       text,
  invoice_date   date,
  pay_date       date,
  currency       text,
  currency_src   text,
  amount_src     numeric,
  fx_rate        numeric,
  commissionable numeric,
  rate           numeric,
  commission     numeric,
  rate_source    text,
  agent_source   text,
  source         text,
  note           text,
  found_at       timestamptz NOT NULL DEFAULT now(),
  found_by       text
);
CREATE INDEX IF NOT EXISTS commission_catchup_run_idx ON planner.commission_catchup (run_month, rep_group_id);
