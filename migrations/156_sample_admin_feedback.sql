-- Admin-authored feedback on a product dev sample version.
-- Editable in HORIZON (PRODUCT ▸ product ▸ Samples tab); shown read-only to the
-- supplier in the portal against the matching sample version.
ALTER TABLE planner.product_dev_samples ADD COLUMN IF NOT EXISTS admin_feedback text;
