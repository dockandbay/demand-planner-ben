-- 229_set_bom.sql — "Build on Fly Sets" BOM: a SET output SKU explodes into component input SKUs at fulfilment.
-- Distinct from planner.manufacturing_bom (that's finished-goods manufacturing). Drives set-demand explosion into
-- the component buy plan (SETS feature). CONFIG ▸ BOM ▸ Build on Fly Sets.
CREATE TABLE IF NOT EXISTS planner.set_bom (
  output_sku      text        NOT NULL,   -- the SET SKU (variant_type='SET')
  input_sku       text        NOT NULL,   -- a component SKU it explodes into
  input_quantity  numeric     NOT NULL DEFAULT 1 CHECK (input_quantity > 0),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (output_sku, input_sku)
);
CREATE INDEX IF NOT EXISTS set_bom_input_idx ON planner.set_bom (input_sku);
