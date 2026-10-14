-- v28.374 (Ben 15-Oct-26, Dillard's): ONE HORIZON client PO (Direct to Client / B2B JLEW / B2B NEXT / key account) can stand for MANY Fulfil
-- client POs (Fulfil makes one PO per client order from each sales order). Each Fulfil PO belongs to at most one HORIZON PO. Linked from the
-- PO drawer > Master & Docs > Linked records (bulk paste of Fulfil PO numbers, client refs or SO numbers). Lines are a read-only copy of
-- Fulfil, refreshed by the Fulfil PO import; the HORIZON PO is compared against the SUM of its group (ERP qty, DTC mismatch 2.0). Additive.
CREATE TABLE IF NOT EXISTS planner.po_fulfil_group (
  fulfil_id   bigint PRIMARY KEY,
  po          text NOT NULL,
  number      text,
  reference   text,
  sale_number text,
  supplier    text,
  state       text,
  lines       jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{sku, qty}]
  units       numeric,
  added_by    text,
  added_at    timestamptz NOT NULL DEFAULT now(),
  synced_at   timestamptz
);
CREATE INDEX IF NOT EXISTS po_fulfil_group_po_idx ON planner.po_fulfil_group (po);
