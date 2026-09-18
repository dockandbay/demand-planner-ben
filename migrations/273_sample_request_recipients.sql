-- 273: multiple free-text recipients on a sample request (Ben #2)
-- Each entry is a plain multi-line text block (name · international phone · full address). The existing single
-- structured recipient (recipient_company/first_name/address_line1…) and the shared `country` are unchanged;
-- this adds the ability to record several recipients under the recipient country. Additive, nullable-safe.
ALTER TABLE planner.sample_requests
  ADD COLUMN IF NOT EXISTS recipients jsonb NOT NULL DEFAULT '[]'::jsonb;
