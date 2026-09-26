-- 296_product_dev_requests_recipient_addresses.sql
-- Recipient addresses on a product development request (Ben): a JSON array of free-text delivery addresses (default one),
-- shown under Recipient country on the Requests tab. Existing requests default to an empty array.
ALTER TABLE planner.product_dev_requests
  ADD COLUMN IF NOT EXISTS recipient_addresses jsonb NOT NULL DEFAULT '[]'::jsonb;
