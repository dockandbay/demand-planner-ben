-- 333_shipment_note_reads.sql  (v28.189, Ben): per-supplier read state for Dock & Bay's messages on a shipment (deep dive M2 / M9).
-- A shipment can carry POs of several suppliers (master + riders). planner.shipment_notes.read_at is ONE flag, so one supplier opening
-- the Shipment Plan cleared the unread badge for every supplier on that shipment. Now a supplier's view adds a row here per note and
-- per supplier id; a note is unread for a supplier until it has a row for that supplier (or the supplier_id 0 row, below).
-- read_at on shipment_notes keeps its meaning for Dock & Bay ("a supplier has read it": first reader), unchanged.
-- Backfill: every internal note already read before this migration gets ONE row with supplier_id 0 = "read for every supplier", so no
-- badge comes back. It runs only while the table is empty, so re-running this file never marks later notes read for everyone.
-- Additive only (new table). Safe to re-run. Until it is applied the server keeps the old shared read_at behaviour (it checks for the table).
CREATE TABLE IF NOT EXISTS planner.shipment_note_reads (
  note_id     bigint NOT NULL REFERENCES planner.shipment_notes(id) ON DELETE CASCADE,
  supplier_id bigint NOT NULL,              -- planner.suppliers.id of the reader; 0 = read for every supplier (pre-v28.189 backfill)
  read_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (note_id, supplier_id)
);
INSERT INTO planner.shipment_note_reads (note_id, supplier_id, read_at)
  SELECT n.id, 0, n.read_at FROM planner.shipment_notes n
  WHERE n.author_kind = 'internal' AND n.read_at IS NOT NULL AND NOT EXISTS (SELECT 1 FROM planner.shipment_note_reads LIMIT 1)
  ON CONFLICT DO NOTHING;
