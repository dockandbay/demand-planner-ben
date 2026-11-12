-- migration 443
-- v28.799 (Ben 12-Nov-26): SUPPLY > Samples > Requests. Anyone on the team asks for samples (SKU lines, needed-by date, purpose,
-- deliver-to); an approver with SUPPLY edit approves it and HORIZON creates one sample shipment (SR-<id>) per supplier from the lines.
-- Sample lead time is set per supplier (weeks). Safe to re-run.
ALTER TABLE planner.suppliers ADD COLUMN IF NOT EXISTS sample_lead_weeks integer;

CREATE TABLE IF NOT EXISTS planner.sample_team_requests (
  id            serial PRIMARY KEY,
  ref           text UNIQUE,                       -- 'RQ-<id>'
  requested_by  text,                              -- signed-in user email
  purpose       text[],                            -- same list as sample shipments (sales / product / photography / marketing / operations)
  needed_by     date,
  deliver_to    text,                              -- display block (company, name, address, phone)
  deliver_addr  jsonb NOT NULL DEFAULT '{}'::jsonb,-- structured address copied onto the SRs (recipient_company, first_name, ... phone)
  notes         text,
  status        text NOT NULL DEFAULT 'requested', -- requested | approved | rejected | cancelled
  approved_by   text,
  approved_at   timestamptz,
  decided_by    text,                              -- who rejected / cancelled
  decided_at    timestamptz,
  decision_note text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sample_team_requests_status_idx ON planner.sample_team_requests (status);

CREATE TABLE IF NOT EXISTS planner.sample_team_request_lines (
  id            serial PRIMARY KEY,
  request_id    integer NOT NULL REFERENCES planner.sample_team_requests(id) ON DELETE CASCADE,
  sku           text NOT NULL,
  qty           integer NOT NULL DEFAULT 1,
  supplier_id   bigint,
  supplier_name text,
  sample_id     bigint REFERENCES planner.sample_requests(id) ON DELETE SET NULL,   -- the SR made on approval
  note          text
);
CREATE INDEX IF NOT EXISTS sample_team_request_lines_req_idx ON planner.sample_team_request_lines (request_id);
CREATE INDEX IF NOT EXISTS sample_team_request_lines_sample_idx ON planner.sample_team_request_lines (sample_id);

-- An SR made from a request: which request, and when its shipped / received emails went (each sent once).
ALTER TABLE planner.sample_requests ADD COLUMN IF NOT EXISTS team_request_id integer;
ALTER TABLE planner.sample_requests ADD COLUMN IF NOT EXISTS team_shipped_emailed_at timestamptz;
ALTER TABLE planner.sample_requests ADD COLUMN IF NOT EXISTS team_received_emailed_at timestamptz;

-- Read back:
--   SELECT to_regclass('planner.sample_team_requests'), to_regclass('planner.sample_team_request_lines');   -- both non-null
--   SELECT count(*) FROM information_schema.columns WHERE table_schema='planner'
--     AND ((table_name='suppliers' AND column_name='sample_lead_weeks')
--       OR (table_name='sample_requests' AND column_name IN ('team_request_id','team_shipped_emailed_at','team_received_emailed_at')));   -- 4
