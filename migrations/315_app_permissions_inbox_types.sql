-- 315_app_permissions_inbox_types.sql  (v28.070, Ben)
-- Per-user inbox filter: which top-bar Inbox item types a user sees — SAMPLES / PURCHASE ORDER / PRODUCT / CLIENT.
-- JSON array of type keys (e.g. ["samples","purchase_order"]). NULL = not configured = see all types (back-compat).
ALTER TABLE planner.app_permissions ADD COLUMN IF NOT EXISTS inbox_types jsonb;
