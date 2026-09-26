-- 274: internal stakeholders on a sample request (Ben) — Horizon users who want to follow a sample.
-- Array of Horizon user emails (planner.app_permissions). Powers the "My samples" pill filter (samples where
-- the logged-in user is a stakeholder). Additive, nullable-safe.
ALTER TABLE planner.sample_requests
  ADD COLUMN IF NOT EXISTS internal_stakeholders jsonb NOT NULL DEFAULT '[]'::jsonb;
