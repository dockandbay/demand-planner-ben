-- 219: track how each PO's delivery (into-stock landing) date moves over time, so we can DETECT slips and assess impact.
-- The delivery date = coalesce(shipment arrival/delivery/landing, PO landing override, prod_end + 7 ship + branch sea lead)
-- — the same "goods land" basis the SUPPLY PO view / buy plan use. We record each DISTINCT date a PO has shown, with the
-- timestamp we first saw it (PK dedupes, so a stable date is stored once). Baseline = earliest recorded_at; current = latest.
-- current > baseline ⇒ the PO has slipped. Feeds SUG-0024 Inventory Status Report §6 (PO inbound delays + impacted products).
-- Detection starts from first run: slips that happened before today aren't known (we have no prior snapshot).
CREATE TABLE IF NOT EXISTS planner.po_delivery_history (
  po            text        NOT NULL,
  delivery_date date        NOT NULL,
  recorded_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (po, delivery_date)
);
CREATE INDEX IF NOT EXISTS po_delivery_history_po_idx ON planner.po_delivery_history (po, recorded_at);
