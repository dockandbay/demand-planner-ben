-- v28.469 (Ben 23-Oct-26, "7. Yes": Draft -> Sent also for SUPPLY sample requests SR-n). A new request is DRAFT (D&B only);
-- SENT shows it on the supplier portal and posts an in-app note. Additive, idempotent.
-- Existing requests: FUTURE ones become draft (they were already hidden from the supplier); every other request is SENT,
-- so suppliers keep seeing the requests they already work on (live 23-Oct-26: 9 requests, all Shipped / Completed).
ALTER TABLE planner.sample_requests ADD COLUMN IF NOT EXISTS send_status text;
ALTER TABLE planner.sample_requests ADD COLUMN IF NOT EXISTS sent_at timestamptz;
ALTER TABLE planner.sample_requests ADD COLUMN IF NOT EXISTS sent_by text;
UPDATE planner.sample_requests SET send_status = CASE WHEN upper(coalesce(status,'')) = 'FUTURE' THEN 'draft' ELSE 'sent' END,
       sent_at = CASE WHEN upper(coalesce(status,'')) = 'FUTURE' THEN NULL ELSE coalesce(accepted_at, created_at) END
 WHERE send_status IS NULL;
ALTER TABLE planner.sample_requests ALTER COLUMN send_status SET DEFAULT 'draft';
ALTER TABLE planner.sample_requests ALTER COLUMN send_status SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sample_requests_send_status_chk') THEN
    ALTER TABLE planner.sample_requests ADD CONSTRAINT sample_requests_send_status_chk CHECK (send_status IN ('draft','sent'));
  END IF;
END $$;
