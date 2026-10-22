-- v28.468 (Ben 23-Oct-26: "statement needs a draft send as well, draft review is with the agency"):
-- when the draft statement of an In review run was last emailed to the agent, to whom and by whom. Additive, idempotent.
ALTER TABLE planner.commission_runs ADD COLUMN IF NOT EXISTS draft_sent_at timestamptz;
ALTER TABLE planner.commission_runs ADD COLUMN IF NOT EXISTS draft_sent_to text;
ALTER TABLE planner.commission_runs ADD COLUMN IF NOT EXISTS draft_sent_by text;
