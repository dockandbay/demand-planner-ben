-- 151: richer per-size component matrix. Each size × component (product, packaging, labels, polybag, other) carries
-- a description, required flag, approval status, packaging type, and versioned file uploads.
--
-- product_dev_size_dimensions gains description + approval_status (it already had size_id, dimension, required,
-- packaging_type). Files live in portal_attachments keyed 'PDIM-<dimension_row_id>' (category 'product_dim'), each
-- optionally carrying a version number.
ALTER TABLE planner.product_dev_size_dimensions
  ADD COLUMN IF NOT EXISTS description     text,
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending';   -- 'pending' | 'approved' | 'rejected'
ALTER TABLE planner.portal_attachments ADD COLUMN IF NOT EXISTS version integer;   -- version number a file is assigned
