-- 149: track who uploaded a portal attachment (Dock & Bay vs supplier), so the PRODUCT Documents tab can split into
-- "Uploaded by Dock & Bay" and "Uploaded by supplier". NULL is treated as 'internal' (D&B) for all existing rows.
ALTER TABLE planner.portal_attachments ADD COLUMN IF NOT EXISTS uploader_kind text;   -- 'internal' | 'supplier'
