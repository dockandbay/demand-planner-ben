-- migration 426
-- v28.748 (Ben 10-Nov-26): weights for sample freight. Real size types (products.size, e.g. TOWLB-LG, PICNIC-LG) take their weight
-- from the PIM product weights and are not stored here. This table holds CUSTOM size types only (e.g. a mixed picnic batch), which
-- the team adds in PRODUCT > Config > Size weights.
CREATE TABLE IF NOT EXISTS planner.size_type_weights (
  code        text PRIMARY KEY,                 -- upper case; must not clash with a products.size code
  label       text NOT NULL,
  weight_kg   numeric NOT NULL CHECK (weight_kg > 0),
  created_by  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- the weight chosen for a sample-request line, keyed by request + SKU text (lines are deleted and re-inserted on every edit,
-- so this sits beside them). size_code = a products.size code or a custom code above; weight_kg = a typed kg per unit.
-- The typed kg wins, then the SKU's own product weight, then the size type.
CREATE TABLE IF NOT EXISTS planner.sample_line_weights (
  sample_id   bigint NOT NULL,
  sku         text NOT NULL,
  size_code   text,
  weight_kg   numeric CHECK (weight_kg IS NULL OR weight_kg > 0),
  updated_by  text,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (sample_id, sku)
);
