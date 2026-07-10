-- 108_action_state_snoozed_by.sql
-- Track WHO snoozed/dismissed an action and WHEN, for the "snoozed by <email> on <date/time>" label.
ALTER TABLE planner.supply_action_state
  ADD COLUMN IF NOT EXISTS snoozed_by text,
  ADD COLUMN IF NOT EXISTS snoozed_at timestamptz;
