-- SUG-0019: approval state for a "Require Supplier Confirmation" spec — pending | approved (P3 supplier flow will drive this; admin can toggle now).
ALTER TABLE planner.product_specs ADD COLUMN IF NOT EXISTS approval_status text;
