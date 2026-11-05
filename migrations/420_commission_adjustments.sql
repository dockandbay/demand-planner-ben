-- migration 420
-- v28.710 (Ben 05-Nov-26: "issues happen like we pay out a commission to the wrong rep group, or we pay the wrong amount. in paid history ...
-- 'adjustment' where we can adjust the rep group for that order or the commissionable amount / commission amount (with adjustment reason).
-- this creates an adjustment which automatically flows into the next monthly run (this month's if still in draft). then have a log called
-- 'Adjustments' to show any changes made, who made them and when and the impacts. if changing rep group then a negative adjustment with
-- reason on rep 1 and positive adjustment commission payout on rep 2"):
-- one row per agent impact (an agent change = two rows sharing batch_id); run_id / row_id = the run row it went into.
CREATE TABLE IF NOT EXISTS planner.commission_adjustments (
  id bigserial PRIMARY KEY,
  batch_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  history_id bigint,
  order_ref text,
  invoice_ref text,
  customer text,
  kind text NOT NULL,                 -- 'amount' | 'agent_from' | 'agent_to'
  rep_group_id integer NOT NULL,      -- the agent this impact lands on
  from_rep_group_id integer,
  to_rep_group_id integer,
  old_commissionable numeric,
  new_commissionable numeric,
  old_commission numeric,
  new_commission numeric,
  delta_commissionable numeric NOT NULL DEFAULT 0,
  delta_commission numeric NOT NULL DEFAULT 0,
  rate numeric,
  currency text,
  reason text NOT NULL,
  run_id bigint,
  row_id bigint,
  run_month text,
  status text NOT NULL DEFAULT 'applied',   -- 'applied' | 'cancelled'
  cancelled_at timestamptz,
  cancelled_by text
);
CREATE INDEX IF NOT EXISTS commission_adjustments_history_idx ON planner.commission_adjustments (history_id);
CREATE INDEX IF NOT EXISTS commission_adjustments_run_idx ON planner.commission_adjustments (run_id);
