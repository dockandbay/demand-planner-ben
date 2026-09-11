-- Migration 003 — purchase_order_lines (Production Planner, spec B8.3 + partial-carton feature)
-- From ORDER_PLAN-Input SKU QTY.csv. One row per PO×SKU with ordered qty, case-pack size,
-- cost, and the partial-carton approval flag.
--
-- `full_carton_check` in the source is DERIVED, not stored — recomputed by the app/view below:
--   qty % carton_qty = 0                  -> '✅ Full Cartons'
--   else if partial_carton_approved       -> 'OK Partial'
--   else                                  -> '⚠️ Partial Carton - up to <next carton multiple>'
--
-- NOTE: the supplied ORDER_PLAN export is a PARTIAL sample (few POs). Seed covers what's given;
-- send the full export to load all lines. `po` FK is deferred-safe (text + optional FK).
--
-- HOW TO APPLY: tested on Ben's sandbox; BEN runs on live himself.

create table if not exists planner.purchase_order_lines (
  id                       bigint generated always as identity primary key,
  po_sku                   text unique not null,          -- "PO|SKU" composite key from source
  po                       text not null,                 -- -> purchase_orders.po
  sku                      text not null,                 -- -> products.sku (not FK'd; partial data)
  qty                      int,
  carton_qty               int,                           -- units per carton (case pack)
  partial_carton_approved  boolean not null default false,-- source 'checked' -> true
  cost_price               numeric(12,4),
  po_status                text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists po_lines_po_idx  on planner.purchase_order_lines(po);
create index if not exists po_lines_sku_idx on planner.purchase_order_lines(sku);

comment on table planner.purchase_order_lines is 'PO line items (PO×SKU) from ORDER_PLAN; full_carton_check derived in v_purchase_order_lines.';

-- Derived carton-status view (matches the source full_carton_check formula)
create or replace view planner.v_purchase_order_lines as
select l.*,
  case
    when l.carton_qty is null or l.carton_qty = 0 then null
    when l.qty % l.carton_qty = 0                  then '✅ Full Cartons'
    when l.partial_carton_approved                 then 'OK Partial'
    else '⚠️ Partial Carton - up to ' || (ceil(l.qty::numeric / l.carton_qty) * l.carton_qty)::int
  end as full_carton_check
from planner.purchase_order_lines l;

-- ── Seed (generated from ORDER_PLAN; 'checked' -> true; full_carton_check dropped/derived) ──
insert into planner.purchase_order_lines (po_sku,po,sku,qty,carton_qty,partial_carton_approved,cost_price,po_status) values
('PO-55UKXR2|TOWLB-DES-LG-PNKPARA','PO-55UKXR2','TOWLB-DES-LG-PNKPARA',841,40,true,5.2,'FUTURE'),
('PO-55UKXR2|TOWLB-SUM-LG-MIAMI','PO-55UKXR2','TOWLB-SUM-LG-MIAMI',601,40,false,5.2,'FUTURE'),
('PO-55UKXR2|TOWLB-SUM-XL-COLAGN','PO-55UKXR2','TOWLB-SUM-XL-COLAGN',240,30,false,6.15,'FUTURE'),
('PO-55UKXR2|TOWLB-DES-LG-BLUSKY','PO-55UKXR2','TOWLB-DES-LG-BLUSKY',1240,40,false,5.2,'FUTURE'),
('PO-55UKXR2|HAIRW-WAF-CHRYBMB','PO-55UKXR2','HAIRW-WAF-CHRYBMB',1080,60,false,2.03,'FUTURE'),
('PO-55UKXR2|TOWLB-DES-LG-GRECSHR','PO-55UKXR2','TOWLB-DES-LG-GRECSHR',680,40,false,5.2,'FUTURE'),
('PO-55UKXR2|TOWLB-DES-LG-WTRSUG','PO-55UKXR2','TOWLB-DES-LG-WTRSUG',920,40,false,5.2,'FUTURE'),
('PO-55UKXR2|TOWLB-DES-XL-OCETRES','PO-55UKXR2','TOWLB-DES-XL-OCETRES',30,30,false,6.15,'FUTURE'),
('PO-55UKXR2|TOWLB-DES-LG-MELLOW','PO-55UKXR2','TOWLB-DES-LG-MELLOW',80,40,false,5.2,'FUTURE'),
('PO-55UKXR2|PONCHK-KID-MD-INTOWILD','PO-55UKXR2','PONCHK-KID-MD-INTOWILD',60,30,false,4.21,'FUTURE'),
('PO-55UKXR2|PONCHK-KID-SM-INTOWILD','PO-55UKXR2','PONCHK-KID-SM-INTOWILD',150,30,false,3.87,'FUTURE'),
('PO-55UKXR2|TOWLF-ESS-XL-PINK-R','PO-55UKXR2','TOWLF-ESS-XL-PINK-R',120,30,false,4.59,'FUTURE'),
('PO-55UKXR2|HAIRW-WAF-TIGPALM','PO-55UKXR2','HAIRW-WAF-TIGPALM',1020,60,false,2.03,'FUTURE'),
('PO-55UKXR2|HAIRW-SUE-IBZAGLW','PO-55UKXR2','HAIRW-SUE-IBZAGLW',420,60,false,1.71,'FUTURE'),
('PO-55UKXR2|TOWLB-SUM-LG-CSTCANDY','PO-55UKXR2','TOWLB-SUM-LG-CSTCANDY',760,40,false,5.2,'FUTURE'),
('PO-55UKXR2|TOWLB-DES-LG-RSPROAD','PO-55UKXR2','TOWLB-DES-LG-RSPROAD',200,40,false,5.2,'FUTURE'),
('PO-55UKXR2|TOWLH-CLB-LG-PEPPNCH','PO-55UKXR2','TOWLH-CLB-LG-PEPPNCH',40,20,false,5.5,'FUTURE'),
('PO-55UKXR2|TOWLB-DES-XL-BLUSKY','PO-55UKXR2','TOWLB-DES-XL-BLUSKY',540,30,false,6.15,'FUTURE'),
('PO-55UKXR2|TOWLF-ESS-LG-DKBLU','PO-55UKXR2','TOWLF-ESS-LG-DKBLU',40,40,false,4.04,'FUTURE'),
('PO-55UKXR2|PONCHK-SUM-MD-CSTCANDY','PO-55UKXR2','PONCHK-SUM-MD-CSTCANDY',90,30,false,4.21,'FUTURE'),
('PO-55UKXR2|TOWLB-SUM-XL-CSTCANDY','PO-55UKXR2','TOWLB-SUM-XL-CSTCANDY',810,30,false,6.15,'FUTURE'),
('PO-55UKXR2|TOWLB-DES-LG-PSTPIER','PO-55UKXR2','TOWLB-DES-LG-PSTPIER',440,40,false,5.2,'FUTURE'),
('PO-55UKXR2|TOWLB-DES-XL-GRECSHR','PO-55UKXR2','TOWLB-DES-XL-GRECSHR',690,30,false,6.15,'FUTURE'),
('PO-55UKXR2|TOWLF-ESS-LG-GREEN-R','PO-55UKXR2','TOWLF-ESS-LG-GREEN-R',80,40,false,4.04,'FUTURE'),
('PO-55UKXR2|TOWLB-DES-XL-WTRSUG','PO-55UKXR2','TOWLB-DES-XL-WTRSUG',540,30,false,6.15,'FUTURE'),
('PO-55UKXR2|PONCHK-KID-MD-CHECKOUT','PO-55UKXR2','PONCHK-KID-MD-CHECKOUT',60,30,false,4.21,'FUTURE'),
('PO-55UKXR2|HAIRW-SUE-MIAMI','PO-55UKXR2','HAIRW-SUE-MIAMI',720,60,false,1.71,'FUTURE'),
('PO-55UKXR2|TEATWL-MD-CTCHDAY','PO-55UKXR2','TEATWL-MD-CTCHDAY',200,50,false,1.95,'FUTURE'),
('PO-55UKXR2|PICNIC-DES-XL-STRIPLIFE','PO-55UKXR2','PICNIC-DES-XL-STRIPLIFE',36,12,false,14.62,'FUTURE'),
('PO-55UKXR2|PONCHK-KID-SM-CHECKOUT','PO-55UKXR2','PONCHK-KID-SM-CHECKOUT',150,30,false,3.87,'FUTURE'),
('PO-55UKXR2|HAIRW-SUE-OCETRES','PO-55UKXR2','HAIRW-SUE-OCETRES',780,60,false,1.71,'FUTURE'),
('PO-55UKXR2|TOWLB-SUM-XL-MIAMI','PO-55UKXR2','TOWLB-SUM-XL-MIAMI',510,30,false,6.15,'FUTURE'),
('PO-55UKXR2|TOWLB-DES-XL-PNKPARA','PO-55UKXR2','TOWLB-DES-XL-PNKPARA',510,30,false,6.15,'FUTURE'),
('PO-55UKXR2|TOWLF-ESS-LG-PINK-R','PO-55UKXR2','TOWLF-ESS-LG-PINK-R',80,40,false,4.04,'FUTURE');
