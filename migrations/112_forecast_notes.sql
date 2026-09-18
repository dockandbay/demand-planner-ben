-- 112_forecast_notes.sql
-- Per-cell notes on the demand PLAN grid. A note is tied to one forecast cell:
-- level (sku|subcat) × item (the SKU or subcategory) × country × channel × month — matching the forecast
-- override key. Multiple notes per cell; each records the note, who made it and when. Notes are permanent
-- unless edited/deleted by a user with DEMAND edit rights.

CREATE TABLE IF NOT EXISTS planner.forecast_notes (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  level       text NOT NULL,          -- 'sku' | 'subcat'
  item        text NOT NULL,          -- the SKU code or subcategory name
  country     text NOT NULL,
  channel     text NOT NULL,
  month       text NOT NULL,          -- grid month key (e.g. '2026_09'), as used by the forecast override key
  note        text NOT NULL,
  created_by  text,
  created_at  timestamptz DEFAULT now(),
  updated_by  text,
  updated_at  timestamptz
);
CREATE INDEX IF NOT EXISTS forecast_notes_cell ON planner.forecast_notes (level, item, country, channel, month);
