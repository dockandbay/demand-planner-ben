-- 165: Record-of-change log for shipments (mirrors po_change_log). Field edits on a shipment (carrier, status,
-- mode, freight cost, dates) are logged here and shown on the shipment timeline (admin only — not exposed to
-- the supplier portal, which reads shipment_notes separately).
CREATE TABLE IF NOT EXISTS planner.shipment_change_log (
  id           bigserial PRIMARY KEY,
  shipment_ref text NOT NULL,
  event        text,
  detail       text,
  changed_by   text,
  changed_at   timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shipment_change_log_ref_idx ON planner.shipment_change_log(shipment_ref, changed_at);
