-- 402_b2b_requests.sql (v28.585, Ben 29-Oct-26): B2B allocation REQUESTS. Submitted from SCENARIO ▸ B2B Allocation (client, market,
-- required-by date, SKU lines, notes); approvers (app_settings b2b_request_approvers + admins) approve or reject, the creator can cancel.
-- Every analysis run against a request (submit, re-analyse, decision) is kept in b2b_request_analyses so the numbers at each step stay
-- visible. Notify list = app_settings b2b_request_notify. Additive.
CREATE TABLE IF NOT EXISTS planner.b2b_requests (
  id             bigserial   PRIMARY KEY,
  ref            text        UNIQUE,                    -- B2B-0001
  client         text,
  market         text        NOT NULL,                  -- UK / US / EU / AU / CA
  required_by    date,
  lines          jsonb       NOT NULL,                  -- [{sku, qty}]
  notes          text        CHECK (notes IS NULL OR length(notes) <= 4000),
  status         text        NOT NULL DEFAULT 'open' CHECK (status IN ('open','approved','rejected','cancelled')),
  created_by     text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  decided_by     text,
  decided_at     timestamptz,
  decision_note  text        CHECK (decision_note IS NULL OR length(decision_note) <= 2000)
);
CREATE INDEX IF NOT EXISTS b2b_requests_status_idx ON planner.b2b_requests (status, created_at DESC);
CREATE TABLE IF NOT EXISTS planner.b2b_request_analyses (
  id          bigserial   PRIMARY KEY,
  request_id  bigint      NOT NULL REFERENCES planner.b2b_requests(id) ON DELETE CASCADE,
  kind        text        NOT NULL,                     -- submitted / reanalysed / approved / rejected / cancelled
  summary     jsonb,                                    -- totals: requested, can_allocate, short, skus_short
  rows        jsonb,                                    -- per SKU: on hand, inbound by date, forecast, cover after, verdict
  created_by  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS b2b_request_analyses_req_idx ON planner.b2b_request_analyses (request_id, created_at);
REVOKE ALL ON planner.b2b_requests FROM anon, authenticated;
REVOKE ALL ON planner.b2b_request_analyses FROM anon, authenticated;
