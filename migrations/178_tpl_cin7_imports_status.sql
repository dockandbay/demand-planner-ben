-- 178_tpl_cin7_imports_status.sql
-- Extend the Cin7 import run-log to a full audit: outcome status, any error, and Cin7 call count.
-- Powers the "Import log" tab (every import documented: range, kind, orders, status, errors).

ALTER TABLE planner.tpl_cin7_imports
  ADD COLUMN IF NOT EXISTS status     text,   -- 'ok' | 'skipped' | 'error'
  ADD COLUMN IF NOT EXISTS error      text,
  ADD COLUMN IF NOT EXISTS cin7_calls int;
