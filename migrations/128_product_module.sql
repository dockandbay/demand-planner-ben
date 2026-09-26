-- 128_product_module.sql — PRODUCT module (product-development management).
-- New top-level "Product" menu (Plan grid + Reports placeholder), gated by a new 'product' permission.
-- Reference = SEASON-CATEGORYCODE-NN, numbered per (season, category) group. Documents reuse
-- planner.portal_attachments (category='product', keyed by the product ref); timeline reuses the supply
-- timeline (planner.supplier_notes keyed by the product ref) + escalate (kind='product').

-- 1) new permission capability
alter table planner.app_permissions add column if not exists product_edit boolean not null default false;

-- 2) supplier flag: include this supplier for product development (drives portal visibility, phase 2)
alter table planner.suppliers add column if not exists include_product_dev boolean not null default false;

-- 3) seasons — CONFIG-maintained list; the code is used in the product reference
create table if not exists planner.seasons (
  code   text primary key,      -- e.g. SS27
  label  text,                  -- e.g. Spring/Summer 2027
  active boolean not null default true,
  sort   int
);
insert into planner.seasons (code, label, sort) values
  ('AW26','Autumn/Winter 2026',1),('SS27','Spring/Summer 2027',2),
  ('AW27','Autumn/Winter 2027',3),('SS28','Spring/Summer 2028',4)
on conflict (code) do nothing;

-- 4) category short code (used in the product reference, e.g. TOWLB). Editable in CONFIG ▸ Product.
alter table planner.categories add column if not exists code text;

-- 5) product-development items + their size variants
create table if not exists planner.product_dev_items (
  id            bigint generated always as identity primary key,
  ref           text unique not null,
  season        text,                 -- season code
  category      text,                 -- category name
  category_code text,                 -- code snapshot used when the ref was minted
  seq_in_group  int,                  -- running number within (season, category)
  colour_name   text,
  description   text,
  status        text not null default 'in_development',   -- in_development | approved | dropped
  swatch        bytea, swatch_mime text,
  created_by    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists product_dev_items_season_cat on planner.product_dev_items (season, category_code);

create table if not exists planner.product_dev_sizes (
  id              bigint generated always as identity primary key,
  item_id         bigint references planner.product_dev_items(id) on delete cascade,
  size_label      text,
  approval_status text not null default 'pending',        -- pending | approved | rejected (internal D&B sign-off)
  sort            int
);
create index if not exists product_dev_sizes_item on planner.product_dev_sizes (item_id);
