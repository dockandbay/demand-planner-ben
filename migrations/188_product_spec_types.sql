-- Managed list of spec document types (SUG-0019, PRODUCT ▸ Specifications). Editable in the Specifications tab.
CREATE TABLE IF NOT EXISTS planner.product_spec_types (
  id serial PRIMARY KEY, name text UNIQUE NOT NULL, sort integer NOT NULL DEFAULT 0, active boolean NOT NULL DEFAULT true
);
INSERT INTO planner.product_spec_types (name, sort) VALUES
  ('Hang tag',1),('Wrap tag',2),('Box',3),('Polybag',4),('Care tag',5)
ON CONFLICT (name) DO NOTHING;
