-- 037_supply_action_state.sql — lifecycle state for SUPPLY ▸ Actions (v20.111)
--
-- SUPPLY actions are derived each load (date conflicts, unassigned shipments, production/ship check-ins, …).
-- This stores the user's lifecycle decision against a stable action_key (type|target_key): dismiss / snooze
-- (until a date) / done. Absence of a row = open; deleting the row restores it to open. Mirrors
-- demand_action_state (032).
CREATE TABLE IF NOT EXISTS planner.supply_action_state (
  action_key   text PRIMARY KEY,
  status       text,          -- 'dismissed' | 'snoozed' | 'done'
  snooze_until date,
  note         text,
  updated_at   timestamptz DEFAULT now()
);
