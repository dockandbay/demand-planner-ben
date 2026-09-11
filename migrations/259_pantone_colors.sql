-- 259: PRODUCT timeline — Pantone colour reference cards.
--
-- An in-app searchable Pantone library so a user can type "/p <code|name>" in a product-timeline message and
-- drop an inline Pantone reference card (swatch + code + name) into the thread. Values are seeded from Dock &
-- Bay's own licensed Pantone Connect export (accurate HEX/Lab for the colours they use); the on-screen swatch is
-- an sRGB APPROXIMATION for reference only, never a colour proof (physical lab-dip/sample approval stays the
-- authority). TCX (textile) + Coated + Uncoated (print) libraries.
--
-- Cards attached to a message are stored on planner.supplier_notes.pantone (jsonb array of {code,name,hex,book}),
-- same additive pattern as the timeline `tags` column (mig 258) — only the product timeline reads/writes it.

CREATE TABLE IF NOT EXISTS planner.pantone_colors (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code       text    NOT NULL,                    -- e.g. "19-4052 TCX" or "2925 C"
  name       text    NOT NULL DEFAULT '',
  hex        text    NOT NULL,                     -- approximate sRGB, e.g. "#0F4C81"
  book       text    NOT NULL DEFAULT 'TCX',       -- TCX | Coated | Uncoated
  sort       int     NOT NULL DEFAULT 0,
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code, book)
);
CREATE INDEX IF NOT EXISTS pantone_colors_search ON planner.pantone_colors (book, code);

ALTER TABLE planner.supplier_notes
  ADD COLUMN IF NOT EXISTS pantone jsonb NOT NULL DEFAULT '[]'::jsonb;
