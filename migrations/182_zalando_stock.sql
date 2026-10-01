-- Zalando (Sello / Warehouse ZFS) sellable stock-on-hand, uploaded periodically from the combined Zalando stock file.
CREATE TABLE IF NOT EXISTS planner.zalando_stock (
  sku        text PRIMARY KEY,
  qty        numeric,
  updated_at timestamptz DEFAULT now()
);
