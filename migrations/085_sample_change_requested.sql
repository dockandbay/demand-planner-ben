-- 085_sample_change_requested.sql — Samples: "Change requested" workflow.
-- When a sample's SKUs/quantities change AFTER the supplier accepted it, the request is flagged so it must be
-- re-accepted (treated like not-yet-accepted). Cleared on (re-)accept. Idempotent.
ALTER TABLE planner.sample_requests ADD COLUMN IF NOT EXISTS change_requested boolean NOT NULL DEFAULT false;
