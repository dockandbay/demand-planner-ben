-- 242_report_notes.sql — report-level internal notes (timeline) for BI/Reports pages (first use: DTC Mismatch).
-- Internal-only thread per report_key; @mentions email tagged Dock & Bay users a link to that report. Mirrors the
-- PO timeline note model (planner.supplier_notes) but scoped to a report, not a PO.
CREATE TABLE IF NOT EXISTS planner.report_notes (
  id           bigserial   PRIMARY KEY,
  report_key   text        NOT NULL,
  author_email text,
  body         text        NOT NULL,
  mentions     text[],
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS report_notes_key_idx ON planner.report_notes (report_key, created_at DESC);
