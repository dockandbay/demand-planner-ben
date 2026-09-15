-- 241_price_list_excluded_skus.sql — SKUs to hide from the Price Lists feature (user-managed copy/paste list).
CREATE TABLE IF NOT EXISTS planner.price_list_excluded_skus (
  sku      text        NOT NULL PRIMARY KEY,
  added_at timestamptz NOT NULL DEFAULT now()
);
