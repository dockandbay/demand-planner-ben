-- 231_user_favourites.sql
-- Per-user Favourites for the top menu bar. JSON array of {slug,label} objects (max 5, enforced client-side).
-- Stored on the existing per-user permissions row (email PK), same pattern as landing_page.
ALTER TABLE planner.app_permissions ADD COLUMN IF NOT EXISTS favourites text;   -- JSON: [{"slug":"reports/3pl-invoicing/us-geneva","label":"US Geneva"}, ...]
