-- 311_po_links.sql  (v28.029, Ben)
-- Linked Records: one persisted row per (PO, external system) recording how a Horizon PO
-- maps to Xero (bill), Fulfil (PO), Flexport (shipment) and DHL (tracking). Resolved on demand
-- (GET /api/supply/po/:po/links?refresh=1) and cached here so linkages survive and can be listed.
--   status:  'linked'   — a direct link + id was found
--            'unknown'  — nothing resolved yet (a "find" candidate)
--            'action'   — a rule is breached (e.g. SHIPPED PO with no Xero bill)
--   found_by: 'auto' (resolver) | 'manual' (user pasted/overrode)
CREATE TABLE IF NOT EXISTS planner.po_links (
  po           text NOT NULL,
  system       text NOT NULL,                 -- 'xero' | 'fulfil' | 'flexport' | 'dhl'
  external_id  text,                           -- Xero InvoiceID / Fulfil id / Flexport flex_id / DHL tracking no.
  external_ref text,                           -- human ref: bill number, PO name, shipment name, carrier ref
  url          text,                           -- direct deep link
  status       text NOT NULL DEFAULT 'linked',
  note         text,
  found_by     text NOT NULL DEFAULT 'auto',
  found_at     timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (po, system)
);
CREATE INDEX IF NOT EXISTS po_links_system_idx ON planner.po_links (system);
CREATE INDEX IF NOT EXISTS po_links_status_idx ON planner.po_links (status);
