-- 050_portal_line_costs.sql — supplier-submitted actual cost prices per PO line (portal) (v20.235)
-- Estimated cost = purchase_order_lines.cost_price; supplier submits their ACTUAL cost per SKU in the portal.
-- Flows to SUPPLY ▸ Purchase Orders ▸ Order Plan with a discrepancy tag (future), then accept → push to ERP.
CREATE TABLE IF NOT EXISTS planner.portal_line_costs (
  po           text NOT NULL,
  sku          text NOT NULL,
  actual_cost  numeric,
  submitted_by text,
  submitted_at timestamptz DEFAULT now(),
  PRIMARY KEY (po, sku)
);
