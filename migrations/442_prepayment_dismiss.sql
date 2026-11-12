-- migration 442
-- v28.798 (Ben 12-Nov-26): ACCOUNTS > Prepayments: a prepayment can be dismissed (e.g. an old residual or one that will be refunded); it moves
-- to Done and the hourly allocation skips it. Restore puts it back. Safe to re-run.
ALTER TABLE planner.prepayments ADD COLUMN IF NOT EXISTS dismissed_at timestamptz;
ALTER TABLE planner.prepayments ADD COLUMN IF NOT EXISTS dismissed_by text;
ALTER TABLE planner.prepayments ADD COLUMN IF NOT EXISTS dismiss_note text;
-- Read back: SELECT count(*) FROM information_schema.columns WHERE table_schema='planner' AND table_name='prepayments' AND column_name LIKE 'dismiss%';   -- 3
