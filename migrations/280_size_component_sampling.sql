-- 280: PRODUCT development — sampling vs spec-linked is decided per SIZE × COMPONENT (v27.713, Ben).
--
-- Before: planner.product_dev_components.sampling_mode / spec_id were per component (all sizes alike).
-- After:  each size×component row (planner.product_dev_size_dimensions) carries its own mode + spec link,
--         so one size can be spec-linked while another size of the same component is sampled.
--
--   sampling_mode  — 'sampled' | 'spec_linked' | NULL. NULL = inherit the component's default
--                    (product_dev_components.sampling_mode, itself seeded from the catalogue type), so
--                    existing rows keep their current behaviour without a backfill.
--   spec_id        — the linked planner.product_specs row when spec_linked (NULL = "link a spec" action pending).
--
-- product_dev_components.supplier stays for now: the supplier portal's component ownership (mig 262) still
-- reads it. It is no longer shown or set in the admin UI (a component can be sampled by several suppliers via
-- development requests, mig 278); it goes when portal ownership is re-scoped to requests (P5).

ALTER TABLE planner.product_dev_size_dimensions ADD COLUMN IF NOT EXISTS sampling_mode text;
ALTER TABLE planner.product_dev_size_dimensions ADD COLUMN IF NOT EXISTS spec_id bigint;
ALTER TABLE planner.product_dev_size_dimensions DROP CONSTRAINT IF EXISTS pdsd_sampling_mode_chk;
ALTER TABLE planner.product_dev_size_dimensions ADD CONSTRAINT pdsd_sampling_mode_chk CHECK (sampling_mode IS NULL OR sampling_mode IN ('sampled','spec_linked'));
