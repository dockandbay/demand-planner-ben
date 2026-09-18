-- 026_deposit_status.sql — manual open/closed status on deposits (v20.43)
-- Lets a deposit be manually CLOSED (hidden from the "to assign" view once fully drawn down / done).
-- NULL/'' = open; 'closed' = closed.
ALTER TABLE planner.deposits ADD COLUMN IF NOT EXISTS status text;
