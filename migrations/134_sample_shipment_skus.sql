-- 134: sample shipments can also carry BULK SKUs (from planner.products), not just
-- product-development samples. A shipment's contents are now mixed: dev samples
-- (product_sample_shipment_links, mig 133) + bulk SKUs (this table), each with a quantity.

create table if not exists planner.product_sample_shipment_skus (
  id          bigint generated always as identity primary key,
  shipment_id bigint not null references planner.product_sample_shipments(id) on delete cascade,
  sku         text not null,
  qty         integer,
  created_by  text,
  created_at  timestamptz not null default now(),
  unique (shipment_id, sku)
);
create index if not exists product_sample_shipment_skus_ship_idx on planner.product_sample_shipment_skus(shipment_id);
