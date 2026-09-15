-- 154: supplier-facing lifecycle status + shipment assignment for product sample versions.
--
-- supplier_status: what the supplier sets manually — 'in_development' (default) | 'completed' | 'cancelled'.
--   'shipped' is NOT stored; it is derived at read time when the sample is linked to a sample shipment (SR) that
--   has a tracking code. Effective status shown = cancelled > shipped(derived) > supplier_status.
-- not_shipped: supplier has explicitly declared this sample will not be shipped (suppresses the "assign to a
--   shipment" exception). Mutually exclusive with having a shipment link.
--
-- Assignment itself reuses planner.sample_request_dev_samples (dev_sample_id -> sample_request_id), so no new
-- link table is needed — this migration only adds the two status columns.
ALTER TABLE planner.product_dev_samples
  ADD COLUMN IF NOT EXISTS supplier_status text NOT NULL DEFAULT 'in_development',
  ADD COLUMN IF NOT EXISTS not_shipped     boolean NOT NULL DEFAULT false;
