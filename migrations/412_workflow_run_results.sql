-- v28.653 (Ben 04-Nov-26: "can log just be this table but expandable to show the results"): each workflow run keeps the list of changes
-- it found and what happened to each (dry / waiting / applied / failed + the result or error), so the Log tab can expand a run.
ALTER TABLE planner.workflow_runs ADD COLUMN IF NOT EXISTS results jsonb;
