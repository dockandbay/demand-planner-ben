-- 084_samples.sql — Samples feature
-- New: sample requests (+ SKU lines), a shared timeline (sample_notes), and a generic supplier_charges
-- table that covers BOTH sample and shipment charges. Accepting a charge posts an Other Payment
-- (planner.deposits with is_deposit=false) against the supplier. Idempotent.

-- ── Sample requests ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS planner.sample_requests (
  id                bigserial PRIMARY KEY,
  ref               text UNIQUE,                          -- human ref, e.g. SR-1043 (server sets on create)
  supplier_id       bigint REFERENCES planner.suppliers(id),
  supplier_name     text,
  recipient_company text,
  first_name        text,
  last_name         text,
  address_line1     text,
  address_line2     text,
  city              text,
  region            text,
  postcode          text,
  country           text,
  phone             text,
  completion_date_required     date,
  purpose           text[],                               -- sales | product | photography | marketing | operations
  notes             text,
  status            text NOT NULL DEFAULT 'open',         -- open | complete | cancelled
  accepted_at       timestamptz,                          -- supplier accepted the request
  supplier_expected_completion date,                      -- supplier's expected completion date
  tracking_code     text,
  carrier           text,
  created_by        text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sample_requests_supplier ON planner.sample_requests(supplier_id);
CREATE INDEX IF NOT EXISTS idx_sample_requests_status   ON planner.sample_requests(status);

-- ── Sample SKU lines ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS planner.sample_request_lines (
  id          bigserial PRIMARY KEY,
  sample_id   bigint NOT NULL REFERENCES planner.sample_requests(id) ON DELETE CASCADE,
  sku         text NOT NULL,
  qty         integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sample_lines_sample ON planner.sample_request_lines(sample_id);

-- ── Timeline notes (mirrors planner.shipment_notes) ──────────────────────────────
CREATE TABLE IF NOT EXISTS planner.sample_notes (
  id           bigserial PRIMARY KEY,
  sample_id    bigint NOT NULL REFERENCES planner.sample_requests(id) ON DELETE CASCADE,
  author_kind  text NOT NULL DEFAULT 'internal',          -- internal | supplier
  author_email text,
  body         text NOT NULL,
  read_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sample_notes_sample ON planner.sample_notes(sample_id);

-- ── Supplier charges (samples + shipments) → Other Payments on accept ────────────
CREATE TABLE IF NOT EXISTS planner.supplier_charges (
  id               bigserial PRIMARY KEY,
  source_type      text NOT NULL,                         -- 'sample' | 'shipment'
  source_ref       text NOT NULL,                         -- sample_requests.ref OR shipments.shipment_ref
  supplier_name    text,
  freight_cost     numeric DEFAULT 0,
  product_cost     numeric DEFAULT 0,
  description      text,
  status           text NOT NULL DEFAULT 'pending',       -- pending | accepted | rejected
  other_payment_id bigint,                                -- planner.deposits.id created on accept (is_deposit=false)
  created_by       text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  accepted_at      timestamptz
);
CREATE INDEX IF NOT EXISTS idx_supplier_charges_src    ON planner.supplier_charges(source_type, source_ref);
CREATE INDEX IF NOT EXISTS idx_supplier_charges_status ON planner.supplier_charges(status);
