-- 101_sample_production_status.sql
-- Supplier-set production status on sample requests (not_started / in_production / ready_to_ship / shipped),
-- mirroring the PO production status. Free text (no constraint), same as purchase_orders.production_status.
ALTER TABLE planner.sample_requests ADD COLUMN IF NOT EXISTS production_status text;
