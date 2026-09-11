-- 032_demand_action_state.sql — lifecycle state for DEMAND ▸ Actions (v20.89)
--
-- Demand actions are derived each load (ST vs target, trading vs LY). This stores the user's lifecycle
-- decision against a stable action_key (type|category|market): dismiss / snooze (until a date) / done.
-- Absence of a row = open. Deleting the row restores it to open.
CREATE TABLE IF NOT EXISTS planner.demand_action_state (
  action_key   text PRIMARY KEY,
  status       text,          -- 'dismissed' | 'snoozed' | 'done'
  snooze_until date,
  note         text,
  updated_at   timestamptz DEFAULT now()
);
