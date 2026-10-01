-- 233_prepack_map.sql — Prepack set mapping: a physical pre-assembled "prepack" SKU (PP-…) maps to the
-- build-on-fly SET SKU whose demand it fulfils. The prepack's on-hand stock is drawn down against the mapped
-- set's monthly demand (carried forward); only the uncovered demand explodes into set_bom component buys.
-- Prepack SKUs are EXCLUDED from the demand plan as their own lines and from the buy plan (pure supply pool);
-- searching a prepack SKU in the demand plan resolves to its mapped set SKU. CONFIG ▸ BOM ▸ Prepack sets.
-- Distinct from planner.set_bom (that is the SET → component recipe).
CREATE TABLE IF NOT EXISTS planner.prepack_map (
  prepack_sku text        NOT NULL,   -- the PP- prepack SKU (physical stock; hidden from demand lines + buy)
  set_sku     text        NOT NULL,   -- the build-on-fly SET SKU whose demand this prepack fulfils
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (prepack_sku)
);
CREATE INDEX IF NOT EXISTS prepack_map_set_idx ON planner.prepack_map (set_sku);
