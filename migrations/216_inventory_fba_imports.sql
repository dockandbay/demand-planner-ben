-- 216: persist the last manually-uploaded Amazon FBA inventory report per market (INVENTORY ▸ Manage FBA / FBA Aged).
-- Stores who/when + parsed per-SKU { available, fc-transfer, aged buckets 91-180/181-270/271-365/366-455/456+ }.
-- Manage FBA compares (available + fc-transfer) vs planner.products.inventory_<mkt>_fba; FBA Aged shows the aged buckets.
CREATE TABLE IF NOT EXISTS planner.inventory_fba_imports (
  market      text PRIMARY KEY,          -- US | UK | AU | EU | CA
  imported_by text,
  imported_at timestamptz DEFAULT now(),
  report      jsonb                       -- { "<sku>": {"av":n,"fc":n,"a1":n,"a2":n,"a3":n,"a4":n,"a5":n}, ... }
);
