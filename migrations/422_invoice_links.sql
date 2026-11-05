-- migration 422
-- 422_invoice_links.sql (v28.730, Ben 05-Nov-26): permanent PUBLIC links to a wholesale order's proforma (sale) or tax invoice
-- (latest posted Fulfil customer invoice). HORIZON renders the page live from Fulfil at /invoice/<token>; n8n asks for links via
-- POST /api/invoice-links/ensure and writes them to Fulfil + Shopify. A revoked token is never reused: ensure issues a new one.
CREATE TABLE IF NOT EXISTS planner.invoice_links (
  id                bigserial PRIMARY KEY,
  token             text NOT NULL UNIQUE,                 -- 192-bit random, base64url
  kind              text NOT NULL CHECK (kind IN ('proforma', 'tax')),
  fulfil_sale_id    bigint NOT NULL,
  fulfil_invoice_id bigint,                               -- null for proforma
  sale_number       text,
  invoice_number    text,
  channel           text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  revoked_at        timestamptz,
  revoked_by        text,
  views             integer NOT NULL DEFAULT 0,
  last_viewed_at    timestamptz
);
-- one live link per (kind, sale, invoice)
CREATE UNIQUE INDEX IF NOT EXISTS invoice_links_live_uq ON planner.invoice_links (kind, fulfil_sale_id, (coalesce(fulfil_invoice_id, 0))) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS invoice_links_sale_idx ON planner.invoice_links (fulfil_sale_id);
