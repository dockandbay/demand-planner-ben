-- 132_product_sample_shipments.sql — Phase B: product-sample SHIPMENTS created by the supplier in the portal.
-- A supplier bundles one or more product sample versions (planner.product_dev_samples) onto a shipment with a
-- carrier + tracking. A given sample can be added to a shipment only ONCE (product_dev_samples.sample_shipment_id,
-- migration 130, is set once and then read-only). Dynamic carrier tracking link built client-side (DHL/FedEx/UPS/SF).

create sequence if not exists planner.product_sample_shipment_ref_seq;
create table if not exists planner.product_sample_shipments (
  id            bigint generated always as identity primary key,
  ref           text unique not null default 'SSHIP-'||lpad(nextval('planner.product_sample_shipment_ref_seq')::text,4,'0'),
  supplier      text,
  carrier       text,
  tracking_code text,
  created_by    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
