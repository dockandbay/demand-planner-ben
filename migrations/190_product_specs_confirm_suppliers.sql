-- SUG-0019: which suppliers a "Require Supplier Confirmation" spec is directed to (CSV of supplier names, derived from the products in scope).
ALTER TABLE planner.product_specs ADD COLUMN IF NOT EXISTS confirm_suppliers text;
