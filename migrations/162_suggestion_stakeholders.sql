-- 162_suggestion_stakeholders.sql
-- Per-suggestion stakeholders (SUG-0003): a comma/space-separated list of emails to notify on THIS
-- suggestion's status changes, IN ADDITION to the global app_settings 'suggestion_stakeholders' list
-- (who are emailed on every suggestion). Editable per row in CONFIG ▸ Suggestions. Read defensively so the
-- app works before this is applied.
ALTER TABLE planner.suggestions ADD COLUMN IF NOT EXISTS stakeholders text;
