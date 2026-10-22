-- 383 (v28.460, Ben 22-Oct-26): PRODUCT development (sample) requests start as DRAFT and only reach the supplier when set to SENT.
-- Draft (orange) = internal only: the supplier portal does not list it, cannot open / accept it and gets no inbox note.
-- Sent (green) = visible on the portal; switching to Sent posts a D&B note on the product timeline (supplier-scoped), which is the
-- supplier's in-app notification. Ben: "default all current to DRAFT", so every existing request becomes draft (the column default),
-- which hides them from suppliers until someone sets them to Sent. Additive and idempotent.
ALTER TABLE planner.product_dev_requests ADD COLUMN IF NOT EXISTS send_status text NOT NULL DEFAULT 'draft';
ALTER TABLE planner.product_dev_requests ADD COLUMN IF NOT EXISTS sent_at timestamptz;
ALTER TABLE planner.product_dev_requests ADD COLUMN IF NOT EXISTS sent_by text;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_dev_requests_send_status_chk') THEN
    ALTER TABLE planner.product_dev_requests ADD CONSTRAINT product_dev_requests_send_status_chk CHECK (send_status IN ('draft','sent'));
  END IF;
END $$;
