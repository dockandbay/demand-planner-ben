-- 222: accept/note for the DTC Mismatch "open PO not mapped to a sales order" rows (the reverse view). Mirrors
-- dtc_mismatch_review (which is keyed by sales order); this one is keyed by PO. Accepting a PO clears it from the
-- open-issue count (and the top-menu badge) while keeping it visible with an "accepted" badge.
CREATE TABLE IF NOT EXISTS planner.dtc_po_review (
  po          text PRIMARY KEY,
  accepted    boolean NOT NULL DEFAULT false,
  accepted_by text,
  note        text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
