-- 371_dtc2_mismatch.sql (v28.364, Ben 14-Oct-26): SUPPLY > Reports > DTC MISMATCH 2.0 (from Fulfil).
-- dtc2_snapshot: the last read of open Fulfil sales orders with dropship / backorder lines and their Fulfil POs (one row, key 'fulfil').
-- dtc2_review: Accept / note per Fulfil sales order number (SO56618). Additive, idempotent.
CREATE TABLE IF NOT EXISTS planner.dtc2_snapshot (
  key text PRIMARY KEY,
  data jsonb NOT NULL,
  synced_at timestamptz NOT NULL DEFAULT now(),
  synced_by text
);
CREATE TABLE IF NOT EXISTS planner.dtc2_review (
  so_number text PRIMARY KEY,
  note text,
  accepted boolean NOT NULL DEFAULT false,
  accepted_by text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
