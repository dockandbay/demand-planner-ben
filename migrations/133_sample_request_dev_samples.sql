-- 133: product-development samples attach to the EXISTING sample-shipment feature
-- (planner.sample_requests), alongside bulk-SKU lines (planner.sample_request_lines).
-- Many-to-many: a dev sample version can ride multiple sample shipments.
--
-- This SUPERSEDES the short-lived v26.038 parallel "sample shipments" tables
-- (product_sample_shipments / _links / _skus), which were never deployed to live —
-- drop them so there's one sample-shipment model.

create table if not exists planner.sample_request_dev_samples (
  sample_request_id bigint not null references planner.sample_requests(id)    on delete cascade,
  dev_sample_id     bigint not null references planner.product_dev_samples(id) on delete cascade,
  qty               integer,
  created_by        text,
  created_at        timestamptz not null default now(),
  primary key (sample_request_id, dev_sample_id)
);
alter table planner.sample_request_dev_samples add column if not exists qty integer;
create index if not exists sample_request_dev_samples_dev_idx on planner.sample_request_dev_samples(dev_sample_id);

drop table if exists planner.product_sample_shipment_links;
drop table if exists planner.product_sample_shipment_skus;
drop table if exists planner.product_sample_shipments;
