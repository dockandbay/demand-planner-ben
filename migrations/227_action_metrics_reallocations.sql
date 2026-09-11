-- 227_action_metrics_reallocations.sql
-- Add a `reallocations` count to the weekly open-actions scoreboard (SUPPLY ▸ Reports ▸ Metrics). This is the number of
-- OPEN reallocation options (zero-cost order-plan moves surfaced on the REALLOCATE report, snooze/dismiss-excluded).
-- Tracked as its own metric — it is NOT folded into total_our (those are mandatory actions; reallocations are optional).
ALTER TABLE planner.action_metrics_snapshot
  ADD COLUMN IF NOT EXISTS reallocations int NOT NULL DEFAULT 0;
