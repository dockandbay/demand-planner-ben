-- migration 440
-- v28.795 (Ben 12-Nov-26): packing requirements checklist (admin PO + supplier portal). The packing notes are typed in English; the
-- checklist shows a Chinese machine translation under each one. Each distinct English text is translated once (Claude Haiku) and kept here,
-- so a key account's repeated notes cost nothing after the first checklist. Safe to re-run.
CREATE TABLE IF NOT EXISTS planner.zh_translations (
  src_hash   text PRIMARY KEY,                  -- sha256 of the trimmed English text
  src        text NOT NULL,
  zh         text NOT NULL,
  model      text,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Read back: SELECT to_regclass('planner.zh_translations');   -- non-null
