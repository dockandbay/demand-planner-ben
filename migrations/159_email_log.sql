-- 159_email_log.sql
-- Email log: every email the app sends via Resend is recorded here (mentions, escalations, magic links,
-- payment reminders, report exports, etc.), so CONFIG ▸ Email log (admin-only) can show what went out,
-- with per-month counts, a date range (default last 7 days) and search. Captures sends from deploy forward.
CREATE TABLE IF NOT EXISTS planner.email_log (
  id          bigserial PRIMARY KEY,
  resend_id   text,          -- Resend's message id (when the send succeeded)
  recipients  text,          -- comma-joined to + cc
  subject     text,
  kind        text,          -- mention | escalation | magic-link | invoice-notify | suggestion | portal-remind | report-export | other
  ref         text,          -- context (PO / shipment / supplier / country)
  status      text,          -- sent | sandbox | error
  error       text,
  sent_by     text,          -- app user that triggered it (when known)
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_log_created_idx ON planner.email_log (created_at DESC);
