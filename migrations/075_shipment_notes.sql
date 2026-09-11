-- 075: Shipment Plan timeline — per-shipment notes/timeline, written from both the admin (SUPPLY ▸ Shipments
-- ▸ Shipment Plan) and the supplier portal (SHIPMENT PLAN tab). Keyed on the master shipment ref.

CREATE TABLE IF NOT EXISTS planner.shipment_notes (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  shipment_ref text NOT NULL,
  author_kind  text NOT NULL DEFAULT 'internal',   -- 'internal' (D&B) | 'supplier'
  author_email text,
  body         text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shipment_notes_ref_idx ON planner.shipment_notes (shipment_ref, created_at);
