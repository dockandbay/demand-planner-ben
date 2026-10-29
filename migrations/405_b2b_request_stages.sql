-- 405_b2b_request_stages.sql (v28.593, Ben 30-Oct-26, Kathryn's "B2B allocation requests: suggested improvements" 8 and 11):
-- what happens AFTER approval (offered to the customer, accepted, declined, shipped + the Fulfil sales order number), and the chaser
-- for requests left open (last_chased_at, so each open request is chased at most once a day). Additive (nullable columns).
ALTER TABLE planner.b2b_requests ADD COLUMN IF NOT EXISTS stage          text CHECK (stage IS NULL OR stage IN ('offered','accepted','declined','shipped'));
ALTER TABLE planner.b2b_requests ADD COLUMN IF NOT EXISTS stage_at       timestamptz;
ALTER TABLE planner.b2b_requests ADD COLUMN IF NOT EXISTS stage_by       text;
ALTER TABLE planner.b2b_requests ADD COLUMN IF NOT EXISTS stage_log      jsonb;   -- [{stage, at, by, note, so}] newest last
ALTER TABLE planner.b2b_requests ADD COLUMN IF NOT EXISTS fulfil_so      text CHECK (fulfil_so IS NULL OR length(fulfil_so) <= 60);
ALTER TABLE planner.b2b_requests ADD COLUMN IF NOT EXISTS last_chased_at timestamptz;
