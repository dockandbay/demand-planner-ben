-- 135: stamp when a product-development item was approved, for the PRODUCT ▸ Reports
-- "time to approve" metric (created_at → approved_at). Stamped by the app when status → 'approved'.
alter table planner.product_dev_items add column if not exists approved_at timestamptz;
-- optional manual override for when development actually STARTED (created_at may be inaccurate);
-- Reports' time-to-approve uses coalesce(dev_start_override, created_at::date).
alter table planner.product_dev_items add column if not exists dev_start_override date;
-- best-effort backfill for anything already approved (proxy = updated_at); none exist yet, harmless.
update planner.product_dev_items set approved_at = updated_at where status = 'approved' and approved_at is null;
