-- 153: a sample can represent one or more size variants. Supplier multi-selects the sizes when submitting a
-- sample version in the portal. Stored as a text[] of size labels (robust against later size-row edits).
ALTER TABLE planner.product_dev_samples ADD COLUMN IF NOT EXISTS sample_sizes text[];
