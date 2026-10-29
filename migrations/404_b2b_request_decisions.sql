-- 404_b2b_request_decisions.sql (v28.590, Ben 30-Oct-26, Kathryn's "B2B allocation requests: suggested improvements" 1, 4, 9):
-- approvers decide each LINE of a B2B request (approve, reduce or reject, with the approved qty and a reason code), and approved
-- lines HOLD stock: later analyses of the same market take the held units off stock on the date until hold_until (required-by date
-- + 14 days) or until an approver releases the hold. A request with any approved units is 'approved'; all lines at 0 is 'rejected'.
-- Additive (nullable columns; requests decided before this keep decisions NULL and hold nothing).
ALTER TABLE planner.b2b_requests ADD COLUMN IF NOT EXISTS decisions  jsonb;   -- [{sku, qty, approved_qty, reason}] set on the decision
ALTER TABLE planner.b2b_requests ADD COLUMN IF NOT EXISTS hold_until date;    -- approved units are held until this date; NULL = not holding
ALTER TABLE planner.b2b_requests ADD COLUMN IF NOT EXISTS reason     text;    -- request-level reason code (no_stock, timing, margin, customer_declined, substitute, other)
CREATE INDEX IF NOT EXISTS b2b_requests_hold_idx ON planner.b2b_requests (market, hold_until) WHERE status = 'approved' AND hold_until IS NOT NULL;
