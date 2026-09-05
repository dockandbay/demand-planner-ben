-- 113_app_settings.sql
-- Simple key/value settings store (CONFIG ▸ General Settings). First use: escalation email recipient lists.
-- Keys: escalation_supply_chain, escalation_dtc, escalation_samples, escalation_product_dev
--       (each a comma-separated list of email addresses).

CREATE TABLE IF NOT EXISTS planner.app_settings (
  key         text PRIMARY KEY,
  value       text,
  updated_by  text,
  updated_at  timestamptz DEFAULT now()
);
