-- 258: PRODUCT timeline — tags/badges + quick phrases (snippets), and per-message tagging.
--
-- The PRODUCT ▸ Timeline gains three capabilities (all managed in PRODUCT ▸ Config):
--   1. Tags/badges — a small library of named, colour-coded tags. Every timeline message can carry one or
--      more tags; the timeline can be filtered by the tags actually used on a product.
--   2. Quick phrases — a library of reusable message snippets. Typing "/" in a timeline compose box raises a
--      picker of these phrases to insert (plain text; no variable substitution in v1).
--   3. Message tagging — timeline messages are planner.supplier_notes rows keyed by the product ref; we add a
--      jsonb array of tag ids to each note. Additive + nullable → safe for the shared notes table (only the
--      product timeline reads/writes it).

CREATE TABLE IF NOT EXISTS planner.product_timeline_tags (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       text   NOT NULL,
  colour     text   NOT NULL DEFAULT '#64748b',   -- hex, drives the badge background
  sort       int    NOT NULL DEFAULT 0,
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS planner.product_timeline_snippets (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  body       text   NOT NULL,
  sort       int    NOT NULL DEFAULT 0,
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Per-message tags: array of product_timeline_tags.id values. Only the PRODUCT timeline uses this column.
ALTER TABLE planner.supplier_notes
  ADD COLUMN IF NOT EXISTS tags jsonb NOT NULL DEFAULT '[]'::jsonb;
