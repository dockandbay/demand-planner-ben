-- Supplier-entered shipped quantity per crossdock SKU on a PO (crossdock SKUs themselves live in
-- purchase_orders.crossdock_skus). Reflects on the PO and rolls up on the master shipment's crossdock tab.
CREATE TABLE IF NOT EXISTS planner.crossdock_shipments (
  po           text NOT NULL,
  sku          text NOT NULL,
  qty          numeric,
  submitted_by text,
  submitted_at timestamptz DEFAULT now(),
  PRIMARY KEY (po, sku)
);
