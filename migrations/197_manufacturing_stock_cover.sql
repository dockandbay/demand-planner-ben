-- 197: SUPPLY ▸ Manufacturing — manual "covered by existing stock" entry.
-- Per (production, component SKU): a qty already covered by on-hand stock, added to a
-- component's total coverage in the Manufacturing tab so it stops flagging short.
-- Keyed by (prod_no, component_sku) so the figure is scoped to the production it belongs to
-- (a component row on the tab is already per-production).
CREATE TABLE IF NOT EXISTS planner.manufacturing_stock_cover (
  prod_no       text        NOT NULL,
  component_sku text        NOT NULL,
  qty           numeric     NOT NULL DEFAULT 0,
  updated_by    text,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (prod_no, component_sku)
);
