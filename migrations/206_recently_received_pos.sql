-- 206_recently_received_pos.sql
-- "Recently received POs" feed — populated by n8n (po + received_date). HORIZON's processor (POST
-- /api/supply/received-pos/process, called by n8n after it upserts) marks any not-yet-COMPLETE PO as COMPLETE,
-- adds a timeline note, and emails the supply planner (CONFIG ▸ Admin ▸ General ▸ supply_planner_email).
-- Idempotent: each row is processed once (processed_at stamped); already-COMPLETE / PO-not-found → no action.
CREATE TABLE IF NOT EXISTS planner.recently_received_pos (
  id            serial PRIMARY KEY,
  po            text NOT NULL,
  received_date date,
  created_at    timestamptz DEFAULT now(),   -- when n8n inserted the row
  processed_at  timestamptz,                 -- null until HORIZON has handled it
  note          text                         -- outcome / skip reason
);
CREATE INDEX IF NOT EXISTS recently_received_pos_unprocessed
  ON planner.recently_received_pos (processed_at) WHERE processed_at IS NULL;
