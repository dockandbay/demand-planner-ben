-- 172_sample_change_log.sql — Samples: "record of change" audit trail (mirrors po_change_log, migration 158).
-- Captures edits from BOTH sides: Dock & Bay admin AND the supplier portal (changed_by = admin user or supplier
-- email). Displayed on the ADMIN sample view only (NOT in the supplier portal), with a per-sample "hide record of
-- change" toggle like Purchase Orders. Idempotent.
CREATE TABLE IF NOT EXISTS planner.sample_change_log (
  id          bigserial PRIMARY KEY,
  sample_id   bigint NOT NULL,
  event       text NOT NULL,
  detail      text,
  changed_by  text,
  changed_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sample_change_log_sample ON planner.sample_change_log (sample_id, changed_at DESC);
