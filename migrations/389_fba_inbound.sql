-- 389_fba_inbound.sql (v28.498, Ben 26-Oct-26): Create FBA Shipment from BUY & MOVE > FBA.
-- Amazon Fulfillment Inbound API v2024-03-20, called through the n8n proxy (n8n holds the SP-API keys).
-- Additive only.

-- Ship-from addresses. One default per market (the 3PL that normally sends to Amazon) plus any others, e.g. the local
-- Flexport warehouse in China when a PO ships direct to Amazon (Ben 26-Oct-26). Amazon needs structured fields + a phone.
CREATE TABLE IF NOT EXISTS planner.fba_ship_from (
  code          text PRIMARY KEY,                 -- e.g. UK-ILG, US-GENEVA, EU-IFUL, AU-COGHLANS, CN-FLEXPORT-...
  label         text NOT NULL,                    -- shown in the picker
  default_for   text,                             -- market this is the default ship-from for (UK | US | EU | AU), else NULL
  name          text NOT NULL,                    -- contact / site name
  company_name  text,
  address_line1 text NOT NULL,
  address_line2 text,
  city          text NOT NULL,
  state_code    text,                             -- required for US (e.g. WI) and AU (e.g. NSW)
  postal_code   text NOT NULL,
  country_code  text NOT NULL,                    -- ISO 2 (GB, US, DE, AU, CN)
  phone         text,                             -- required by Amazon; filled in on first use
  email         text,
  active        boolean NOT NULL DEFAULT true,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  updated_by    text
);
CREATE UNIQUE INDEX IF NOT EXISTS fba_ship_from_default_uq ON planner.fba_ship_from (default_for) WHERE default_for IS NOT NULL;

-- Seeded from planner.invoice_consignees notify_party (the 3PL addresses already used on invoices). Phone left blank on purpose.
INSERT INTO planner.fba_ship_from (code, label, default_for, name, company_name, address_line1, address_line2, city, state_code, postal_code, country_code) VALUES
  ('UK-ILG',      'ILG Crawley (UK 3PL)',         'UK', 'ILG', 'Dock & Bay', 'Unit 2 Space Gatwick', 'Faraday Road', 'Crawley', NULL, 'RH10 9BJ', 'GB'),
  ('US-GENEVA',   'Geneva10 Delavan (US 3PL)',    'US', 'Geneva10 Fulfillment', 'Dock & Bay', '1501 E. Wisconsin Street', NULL, 'Delavan', 'WI', '53115', 'US'),
  ('EU-IFUL',     'iFulfillment Bocholt (EU 3PL)', 'EU', 'iFulfilment', 'Dock & Bay', 'Harderhook 19', NULL, 'Bocholt', NULL, '46395', 'DE'),
  ('AU-COGHLANS', 'Coghlans South Granville (AU 3PL)', 'AU', 'DOK / Coghlans', 'Dock & Bay', '4-8 Ferndell Street', NULL, 'South Granville', 'NSW', '2142', 'AU')
ON CONFLICT (code) DO NOTHING;

-- One row per shipment created from HORIZON. stage moves new -> ... -> draft_ready -> ... -> done (or cancelled).
CREATE TABLE IF NOT EXISTS planner.fba_inbound_plans (
  id                  bigserial PRIMARY KEY,
  market              text NOT NULL,              -- UK | US | EU (Amazon.de) | AU
  ship_from_code      text,
  marketplace_id      text NOT NULL,
  region              text NOT NULL,              -- n8n core region: EU | NA | AU
  name                text,
  stage               text NOT NULL DEFAULT 'new',
  op_id               text,                       -- Amazon async operation in progress
  op_next             text,                       -- stage to move to when it succeeds
  inbound_plan_id     text,                       -- Amazon wf...
  items               jsonb NOT NULL DEFAULT '[]', -- [{sku, msku, qty, cp, boxes, dims, wt, prepOwner, labelOwner}]
  loose               boolean NOT NULL DEFAULT false, -- true = some units not in full cartons: box contents finished in Seller Central
  ship_from           jsonb,
  packing_option_id   text,
  packing_groups      jsonb,
  placement_options   jsonb,
  placement_option_id text,
  shipments           jsonb,                      -- [{shipmentId, fc, city, confirmationId}]
  transport_options   jsonb,
  transport           jsonb,                      -- {ready_date, selections:{shipmentId: optionId}, windows:{shipmentId: state}}
  labels              jsonb,
  error               text,
  log                 jsonb NOT NULL DEFAULT '[]',
  created_by          text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fba_inbound_plans_market_idx ON planner.fba_inbound_plans (market, created_at DESC);

REVOKE ALL ON planner.fba_ship_from, planner.fba_inbound_plans FROM anon, authenticated;
