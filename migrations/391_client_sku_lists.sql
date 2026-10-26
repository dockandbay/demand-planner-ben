-- 391_client_sku_lists.sql (v28.503, Ben 26-Oct-26): saved SKU lists per client account for the portal Catalogue (line sheet + images
-- for just those SKUs; Madison: "input the SKUs I need and it pulls all item info"). Any number of named lists per client. Additive.
CREATE TABLE IF NOT EXISTS planner.client_sku_lists (
  id          bigserial PRIMARY KEY,
  client_id   integer NOT NULL REFERENCES planner.clients(id) ON DELETE CASCADE,
  name        text NOT NULL,
  skus        text[] NOT NULL DEFAULT '{}',
  created_by  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS client_sku_lists_name_uq ON planner.client_sku_lists (client_id, lower(name));
REVOKE ALL ON planner.client_sku_lists FROM anon, authenticated;
