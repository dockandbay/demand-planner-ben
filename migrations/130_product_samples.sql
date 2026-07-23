-- 130_product_samples.sql — product-sample VERSIONS created by the supplier in the portal (per product-dev item).
-- Each version: v1/v2/… (per item), a date (defaults today), two mandatory verification ticks (colour→Pantone,
-- quality→design), a description and photos. Photos reuse planner.portal_attachments (category='product_sample',
-- keyed by po='PSAMPLE-<id>'). sample_shipment_id links to a samples shipment in Phase B (nullable for now).

create table if not exists planner.product_dev_samples (
  id                 bigint generated always as identity primary key,
  item_ref           text not null,                 -- planner.product_dev_items.ref
  version            int not null,                  -- 1, 2, 3 …  (display ref = 'v'||version)
  sample_date        date,
  colour_verified    boolean not null default false,
  quality_verified   boolean not null default false,
  description        text,
  sample_shipment_id bigint,                         -- Phase B: link to planner.sample_requests(id)
  created_by         text,
  created_at         timestamptz not null default now()
);
create index if not exists product_dev_samples_item on planner.product_dev_samples (item_ref);
