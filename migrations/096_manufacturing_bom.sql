-- 096_manufacturing_bom.sql
-- Manufacturing / bundle BOM: a finished (parent) SKU is assembled from component SKUs at a per-unit qty.
-- Source config: Airtable "Manufacturing bundle BOM" (WORKING - Sheet310.csv). Consumed by SUPPLY ▸ PURCHASE
-- ORDERS ▸ Manufacturing (matches manufacturing-branch POs' finished products to component PO supply) and the
-- CONFIG ▸ Manufacturing BOM tab.
CREATE TABLE IF NOT EXISTS planner.manufacturing_bom (
  parent_sku    text NOT NULL,
  component_sku text NOT NULL,
  qty           numeric NOT NULL DEFAULT 1,
  updated_at    timestamptz DEFAULT now(),
  PRIMARY KEY (parent_sku, component_sku)
);

-- A PO is treated as a "manufacturing PO" when its branch is set to Manufacturing. Add the branch:
INSERT INTO planner.branches (name, country_code)
  VALUES ('Manufacturing', 'UK')
  ON CONFLICT (name) DO NOTHING;

-- One-off BOM seed is in 096_manufacturing_bom_seed.sql (generated from the CSV).
