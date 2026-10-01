-- 302_fulfil_internal_shipments_mirror.sql  (v27.901, Ben) — Fulfil INTERNAL SHIPMENT mirror, 25-Sep-2026
-- Sister of planner.fulfil_purchase_orders (mig 282). One row per Fulfil internal shipment (IS…), refreshed by the same
-- cron as the PO mirror (POST /api/supply/fulfil/import-pos) and after Horizon writes a planned date. Lines = the
-- shipment's INCOMING moves only (sku, qty) — an IS carries 4 legs of moves per SKU (storage→output→transit→input→
-- storage), so summing every move quadruples quantities. Idempotent, additive.
CREATE TABLE IF NOT EXISTS planner.fulfil_internal_shipments (
  fulfil_id        bigint PRIMARY KEY,          -- stock.shipment.internal id
  number           text NOT NULL,               -- IS134
  reference        text,                        -- what the team typed: master PO, FBA shipment id, …
  state            text,                        -- draft | waiting | assigned | packed | shipped | received | done | cancel
  planned_date     date,
  effective_date   date,
  from_location    text,
  to_location      text,
  company          integer,
  line_count       integer NOT NULL DEFAULT 0,
  lines            jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{sku, qty}] from incoming moves
  fulfil_created   timestamptz,
  fulfil_written   timestamptz,
  last_synced_at   timestamptz NOT NULL DEFAULT now(),
  source           text,                        -- cron | write
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fulfil_internal_shipments_number_idx    ON planner.fulfil_internal_shipments(number);
CREATE INDEX IF NOT EXISTS fulfil_internal_shipments_reference_idx ON planner.fulfil_internal_shipments(reference);
CREATE INDEX IF NOT EXISTS fulfil_internal_shipments_state_idx     ON planner.fulfil_internal_shipments(state);
