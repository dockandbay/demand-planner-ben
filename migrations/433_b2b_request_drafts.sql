-- migration 433
-- v28.771 (Kathryn 10-Nov-26, B2B allocation requests: "keep my place mid-decision"): the Decide panel keeps its state as a DRAFT on the
-- request until the decision is confirmed or the draft discarded, so stepping away (closing the drawer, opening a SKU's plan, another
-- page or device) loses nothing and does not re-analyse. Multiple alternatives per line are stored in decisions[].alts (jsonb, no DDL).
-- Additive.
ALTER TABLE planner.b2b_requests ADD COLUMN IF NOT EXISTS draft    jsonb;         -- {dec:{SKU:{q,reason,route,price,alts:[...]}}, reason, note}
ALTER TABLE planner.b2b_requests ADD COLUMN IF NOT EXISTS draft_by text;
ALTER TABLE planner.b2b_requests ADD COLUMN IF NOT EXISTS draft_at timestamptz;
