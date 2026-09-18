-- 127_dtc_shipment_details.sql — Direct-to-Client (DTC) shipment details entered by the supplier in the portal.
-- DTC = PO branch in (Direct to Client / B2B JLEW / B2B NEXT) or a sales_order_ref is set (see ppIsDtc/poIsDtc).
-- Totals-only model (Ben's decision): carton count, cargo volume (CBM), gross weight, and a free-text dimensions
-- field. Displayed admin-side in the PO ▸ CLIENT/FBA tab; add/update posts a supplier timeline note (→ ✉ bell);
-- a DTC PO gains a supplier action once its production-end date has passed with this data still empty.

create table if not exists planner.dtc_shipment_details (
  po               text primary key,
  cartons          integer,
  cbm              numeric,        -- total cargo volume, m³
  gross_weight_kg  numeric,        -- total gross weight, kg
  dimensions       text,           -- free text, e.g. "per carton 60x40x40cm"
  entered_by       text,
  entered_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
