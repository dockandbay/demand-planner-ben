-- 301_supplier_onboarding.sql  (v27.895, Ben) — supplier self-service onboarding + approval gate, 25-Sep-2026
-- Suppliers complete / update their own profile in the portal (company, contacts, logistics & terms, certificates with
-- files, warehouse-requirements acknowledgement, product & packaging dimensions). Each submission is a request that
-- Dock & Bay approves section by section; approval writes the supplier record, contacts, certificates and queues the
-- product data as pending PIM changes. Idempotent, additive, no data changes to existing rows. Safe to re-run.

-- (1) extra profile fields on the supplier record
ALTER TABLE planner.suppliers
  ADD COLUMN IF NOT EXISTS registration_no   text,
  ADD COLUMN IF NOT EXISTS vat_id            text,
  ADD COLUMN IF NOT EXISTS website           text,
  ADD COLUMN IF NOT EXISTS trading_since     text,
  ADD COLUMN IF NOT EXISTS employees         text,
  ADD COLUMN IF NOT EXISTS capabilities      text,     -- "what you make for us"
  ADD COLUMN IF NOT EXISTS pickup_address    text,     -- EXW / FCA collection address + hours
  ADD COLUMN IF NOT EXISTS moq               text,
  ADD COLUMN IF NOT EXISTS sample_lead_days  integer,
  ADD COLUMN IF NOT EXISTS payment_terms_text text,    -- the supplier's own wording; the % / credit-day columns stay the modelled truth
  ADD COLUMN IF NOT EXISTS bank_doc_attachment_id bigint,   -- portal_attachments.id of the bank confirmation letter (category onboarding_bank; Finance-only)
  ADD COLUMN IF NOT EXISTS profile_approved_at timestamptz;

-- (2) contacts (many per supplier; replaces the single contact_name/email/phone for onboarding purposes)
CREATE TABLE IF NOT EXISTS planner.supplier_contacts (
  id            bigserial PRIMARY KEY,
  supplier_id   bigint NOT NULL REFERENCES planner.suppliers(id) ON DELETE CASCADE,
  name          text NOT NULL,
  role          text,
  email         text,
  phone         text,
  portal_access boolean NOT NULL DEFAULT false,     -- "Requires access to the Horizon supplier portal" → supplier_portal_users row + invite on approval
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS supplier_contacts_supplier_idx ON planner.supplier_contacts(supplier_id);

-- (3) certificates & audits, each with its file
CREATE TABLE IF NOT EXISTS planner.supplier_certificates (
  id            bigserial PRIMARY KEY,
  supplier_id   bigint NOT NULL REFERENCES planner.suppliers(id) ON DELETE CASCADE,
  kind          text NOT NULL,                       -- grs | bsci | oeko | iso | other
  reference     text,
  valid_to      date,
  attachment_id bigint,                              -- portal_attachments.id (category onboarding_cert)
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS supplier_certificates_supplier_idx ON planner.supplier_certificates(supplier_id);

-- (4) warehouse requirements — the editable table in SUPPLY ▸ CONFIG; the portal checklist + PDF render from it
CREATE TABLE IF NOT EXISTS planner.warehouse_requirements (
  id          bigserial PRIMARY KEY,
  title       text NOT NULL,
  detail      text,
  warehouse   text NOT NULL DEFAULT 'All',            -- All | UK | US | EU | AU
  active      boolean NOT NULL DEFAULT true,
  sort        integer NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  text
);
INSERT INTO planner.warehouse_requirements (title, detail, warehouse, sort)
SELECT * FROM (VALUES
  ('Cartons: max 20 kg, max 60 × 40 × 40 cm', 'Heavier or larger cartons are refused at the 3PL. Split the pack size instead.', 'All', 1),
  ('Carton labels: SKU, barcode, quantity, carton X of Y on two adjacent sides', 'Labels are scanned on receipt; unlabelled cartons are counted by hand at your cost.', 'All', 2),
  ('Pallets: 120 × 100 cm, max 170 cm high, wrapped, no overhang', 'UK and EU 3PLs reject overhang.', 'All', 3),
  ('Every retail unit carries the EAN-13 we issue; inner and carton barcodes where we specify them', 'Barcodes are generated in Horizon and shared per PO. Never print your own.', 'All', 4),
  ('No mixed SKUs in a carton unless the PO says so', 'Mixed cartons are marked MIXED on all sides and listed on the packing list.', 'All', 5),
  ('Packing list and commercial invoice per shipment, uploaded to the portal before departure', 'Customs clearance needs HS codes per line matching the product data.', 'All', 6),
  ('Heat-treated (ISPM 15) pallets with the stamp visible', 'Australian biosecurity rejects untreated timber; use plastic or stamped pallets.', 'AU', 7)
) v(title, detail, warehouse, sort)
WHERE NOT EXISTS (SELECT 1 FROM planner.warehouse_requirements);

-- the supplier's acknowledgement of a given version of the rules (version = max(updated_at) of the active rules at ack time)
CREATE TABLE IF NOT EXISTS planner.supplier_warehouse_acks (
  id            bigserial PRIMARY KEY,
  supplier_id   bigint NOT NULL REFERENCES planner.suppliers(id) ON DELETE CASCADE,
  rules_version text NOT NULL,
  acked_by      text,
  acked_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS supplier_warehouse_acks_supplier_idx ON planner.supplier_warehouse_acks(supplier_id, acked_at DESC);

-- (5) the onboarding / change request itself — one open request per supplier at a time
CREATE TABLE IF NOT EXISTS planner.supplier_onboarding_requests (
  id            bigserial PRIMARY KEY,
  ref           text UNIQUE,                         -- ONB-0001 …
  supplier_id   bigint NOT NULL REFERENCES planner.suppliers(id) ON DELETE CASCADE,
  supplier_name text,
  type          text NOT NULL DEFAULT 'new',         -- new | change
  status        text NOT NULL DEFAULT 'draft',       -- draft | submitted | in_review | returned | approved | rejected
  form          jsonb NOT NULL DEFAULT '{}'::jsonb,  -- the supplier's entries (company, contacts, logistics, certs, warehouse, products)
  sections      jsonb NOT NULL DEFAULT '{}'::jsonb,  -- section → pending | approved | returned
  return_note   text,
  log           jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{t, m, by}]
  submitted_by  text,
  submitted_at  timestamptz,
  decided_by    text,
  decided_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS supplier_onboarding_requests_status_idx ON planner.supplier_onboarding_requests(status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS supplier_onboarding_requests_supplier_idx ON planner.supplier_onboarding_requests(supplier_id);

-- (6) product & packaging data submitted for the PIM — approval queues rows here as 'pending'; the product team applies them
CREATE TABLE IF NOT EXISTS planner.supplier_product_submissions (
  id                 bigserial PRIMARY KEY,
  request_id         bigint REFERENCES planner.supplier_onboarding_requests(id) ON DELETE SET NULL,
  supplier_id        bigint NOT NULL REFERENCES planner.suppliers(id) ON DELETE CASCADE,
  sku_name           text NOT NULL,
  hs_code            text,
  materials          text,
  units_per_carton   integer,
  cartons_per_pallet integer,
  dims               jsonb NOT NULL DEFAULT '{}'::jsonb,   -- {prod:{l,w,h,kg}, pack:{…}, carton:{…}, pallet:{…}} cm / kg
  status             text NOT NULL DEFAULT 'pending',      -- pending | applied | rejected
  created_at         timestamptz NOT NULL DEFAULT now(),
  applied_at         timestamptz,
  applied_by         text
);
CREATE INDEX IF NOT EXISTS supplier_product_submissions_status_idx ON planner.supplier_product_submissions(status, created_at DESC);

-- (7) notification recipients live in app_settings: onboarding_notify_to / onboarding_notify_cc (comma-separated) — set in CONFIG.
