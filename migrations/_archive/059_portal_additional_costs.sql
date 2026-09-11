-- Supplier-entered additional cost lines on a PO (freight, tooling, surcharges, …): description / qty / price.
-- Sum into the order's total invoice cost alongside the order-plan line items.
CREATE TABLE IF NOT EXISTS planner.portal_additional_costs (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  po           text NOT NULL,
  description  text,
  qty          numeric,
  price        numeric,
  submitted_by text,
  submitted_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS portal_additional_costs_po_idx ON planner.portal_additional_costs (po);
