-- 143: supplier-initiated "draft submitted for approval" workflow on PO documents.
-- The supplier submits a document for approval in the portal; D&B approves/rejects (with notes) on the
-- admin PO ▸ Documents tab. Rejection returns the doc to draft (supplier can revise & re-submit); the
-- rejection notes are kept so the portal can show why. Timeline notes on both sides carry the messages.
--   approval_status: NULL/'draft' (initial) | 'submitted' | 'approved' | 'rejected'
ALTER TABLE planner.portal_attachments
  ADD COLUMN IF NOT EXISTS approval_status text,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS submitted_by text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by text,
  ADD COLUMN IF NOT EXISTS review_notes text;
