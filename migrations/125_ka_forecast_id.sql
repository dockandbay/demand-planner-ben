-- 125: give planner.key_account_forecasts a stable primary key so the new DEMAND inline editor can
-- update/delete individual rows (the table was n8n-populated with no id). Adds id + a source tag
-- ('manual' for UI-entered rows vs 'n8n'/existing). Non-breaking for the existing n8n upsert (id auto-fills).
ALTER TABLE planner.key_account_forecasts ADD COLUMN IF NOT EXISTS id bigint GENERATED ALWAYS AS IDENTITY;
ALTER TABLE planner.key_account_forecasts ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='key_account_forecasts_pkey') THEN
    ALTER TABLE planner.key_account_forecasts ADD PRIMARY KEY (id);
  END IF;
END $$;
