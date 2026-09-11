-- 133: product samples ↔ sample shipments become MANY-TO-MANY.
-- A product sample version can ride on multiple sample shipments, and a shipment
-- can carry many samples (multi-select add). Replaces the single
-- product_dev_samples.sample_shipment_id link (kept, but no longer authoritative).

create table if not exists planner.product_sample_shipment_links (
  shipment_id bigint not null references planner.product_sample_shipments(id) on delete cascade,
  sample_id   bigint not null references planner.product_dev_samples(id)      on delete cascade,
  created_by  text,
  created_at  timestamptz not null default now(),
  primary key (shipment_id, sample_id)
);
create index if not exists product_sample_shipment_links_sample_idx on planner.product_sample_shipment_links(sample_id);

-- migrate the existing single links into the join table
insert into planner.product_sample_shipment_links (shipment_id, sample_id)
  select sample_shipment_id, id from planner.product_dev_samples where sample_shipment_id is not null
  on conflict do nothing;
