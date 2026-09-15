-- 051_note_read.sql — read/unread state for supplier_notes (PO PLAN Timeline) (v20.237)
-- A supplier note is "unread" (an action for Dock & Bay) until marked read; toggled from the PO PLAN Timeline tab.
ALTER TABLE planner.supplier_notes ADD COLUMN IF NOT EXISTS read_at timestamptz;
