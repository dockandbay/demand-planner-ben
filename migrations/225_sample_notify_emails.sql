-- 225_sample_notify_emails.sql
-- Add planner.sample_requests.notify_emails: comma-separated stakeholder emails to notify when a sample is marked
-- SHIPPED (or complete). Nullable text — blank = nobody. Set in the sample detail (under Recipient & address). The
-- shipped email includes the tracking code, carrier and a direct link to the sample in HORIZON.
ALTER TABLE planner.sample_requests ADD COLUMN IF NOT EXISTS notify_emails text;
