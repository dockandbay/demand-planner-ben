-- 240_price_type_meta.sql — per-price_type metadata for the Price Lists feature (currently just an editable "size"
-- label shown against each price type in the grid). Keyed by price_type.
CREATE TABLE IF NOT EXISTS planner.price_type_meta (
  price_type text        NOT NULL PRIMARY KEY,
  size       text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
