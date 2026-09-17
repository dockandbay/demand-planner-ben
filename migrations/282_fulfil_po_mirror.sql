-- 282: Fulfil purchase-order MIRROR (v27.738, Ben) — for ERP drift (Horizon vs Fulfil).
--
-- A cron (n8n in future; an in-app !VERCEL timer + POST /api/supply/fulfil/import-pos now) imports every Fulfil
-- purchase order into this table, so we can compare it to planner.purchase_orders. Every Horizon PO should exist
-- in Fulfil; a Horizon PO with no mirror row = missing from Fulfil (drift). A successful Horizon->Fulfil push also
-- upserts the pushed PO's row (source='push') so the mirror is fresh without waiting for the next import.
--
-- Header fields for the compare + a lines jsonb ([{sku, qty, unit_price}]) for per-line drift. Keyed on the Fulfil
-- reference = the Horizon PO number. Additive; drift is read-only reporting (never writes back to Horizon POs).

CREATE TABLE IF NOT EXISTS planner.fulfil_purchase_orders (
  po              text PRIMARY KEY,     -- Fulfil reference = Horizon PO number
  fulfil_id       bigint,
  state           text,                 -- draft | quotation | confirmed | processing | done | cancelled
  party_name      text,
  currency        text,
  warehouse_code  text,
  total_amount    numeric,
  line_count      integer,
  delivery_date   date,
  lines           jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{sku, qty, unit_price}]
  last_synced_at  timestamptz,
  source          text,                 -- 'cron' (import) | 'push' (Horizon push)
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fulfil_po_fulfil_id_idx ON planner.fulfil_purchase_orders (fulfil_id);
