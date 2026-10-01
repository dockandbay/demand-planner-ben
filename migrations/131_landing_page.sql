-- 131_landing_page.sql — per-user default landing page (slug) on app load.
-- Null → 'supply/purchase-orders'. Set per user in CONFIG ▸ Permissions.
alter table planner.app_permissions add column if not exists landing_page text;
