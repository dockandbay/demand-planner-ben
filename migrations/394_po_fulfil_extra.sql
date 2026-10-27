-- 394_po_fulfil_extra.sql (v28.522, Ben 28-Oct-26): "i want to be able to add multiple fulfil po links not just change" (PO-57UKBL1 = Fulfil
-- PO226 + PO474 / PO-57UKBL1-2). The main Fulfil link (po_links, system 'fulfil') stays the push / sync target; these are EXTRA Fulfil POs on the
-- same HORIZON PO: shown and searchable under Linked records and used to match Fulfil bills to the PO in Xero. Each Fulfil PO is an extra on one
-- HORIZON PO at most. Nothing is written to Fulfil. Additive.
CREATE TABLE IF NOT EXISTS planner.po_fulfil_extra (
  fulfil_id   bigint PRIMARY KEY,
  po          text NOT NULL,
  number      text,
  reference   text,
  supplier    text,
  state       text,
  url         text,
  added_by    text,
  added_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS po_fulfil_extra_po_idx ON planner.po_fulfil_extra (po);
REVOKE ALL ON planner.po_fulfil_extra FROM anon, authenticated;
