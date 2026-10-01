-- 306_client_portal.sql  (v28.008, Ben, 28-Sep-2026) — CLIENT PORTAL foundation: Horizon CLIENT tab + client-facing portal.
-- Spec: docs "Dock & Bay Client Portal — Build Spec" (28-Sep-2026). One shell for key accounts, distributors, agents and
-- direct wholesale, differentiated by config (visibility + feature toggles). Additive, idempotent.

-- ── permissions: two new grants on the existing per-email row (CONFIG ▸ Admin ▸ Permissions) ──────────────────────────
ALTER TABLE planner.app_permissions
  ADD COLUMN IF NOT EXISTS client_access boolean NOT NULL DEFAULT false,   -- see the CLIENT tab, manage clients/users/orders/messages
  ADD COLUMN IF NOT EXISTS commissions   boolean NOT NULL DEFAULT false;   -- see + run the commission engine (contracted rates are sensitive)

-- ── client (company) records ──────────────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS planner.clients (
  id               serial PRIMARY KEY,
  name             text NOT NULL,
  code             text UNIQUE,                        -- URL slug
  type             text NOT NULL DEFAULT 'key_account', -- key_account | distributor | agent | direct_wholesale
  owner_email      text,                               -- which of Ben's team manages it
  market           text NOT NULL DEFAULT 'UK',         -- UK | US | EU | AU | CA — drives currency, dims, HS code, default warehouse
  currency         text NOT NULL DEFAULT 'GBP',
  price_list       text,                               -- planner.client_price_lists.code
  warehouse_code   text,                               -- default stock view: one warehouse (uk_3pl | us_3pl | eu_3pl | au_3pl | *_fba)
  visibility       jsonb NOT NULL DEFAULT '{"modes":["company_email"],"tag":"","channels":[],"companies":[],"emails":[]}'::jsonb,
  stock_scope      jsonb NOT NULL DEFAULT '{"mode":"default"}'::jsonb,   -- {mode:'default'} | {mode:'custom', region:'us_all'|'warehouse', sku_list:[...], exact:true}
  features         jsonb NOT NULL DEFAULT '{"order_placement":true,"sample_requests":true,"view_stock":true,"view_line_sheet":true,"view_commission":false,"messaging":true}'::jsonb,
  rep_group_id     integer,                            -- agents: planner.rep_groups
  key_account_id   integer,                            -- key accounts: link to planner.key_accounts (packing / consignee live there)
  fulfil_party_id  bigint,                             -- party.party id used when a portal order is created as a Fulfil draft
  fulfil_channel   text,                               -- sale.channel name for portal orders (e.g. dockandbay-eu-ws)
  notes            text,
  active           boolean NOT NULL DEFAULT true,
  created_by       text, created_at timestamptz NOT NULL DEFAULT now(),
  updated_by       text, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS clients_type_idx ON planner.clients(type);

CREATE TABLE IF NOT EXISTS planner.client_users (
  id             serial PRIMARY KEY,
  client_id      integer NOT NULL REFERENCES planner.clients(id) ON DELETE CASCADE,
  name           text,
  email          text NOT NULL,
  scope          text NOT NULL DEFAULT 'client',      -- client (whole client) | self (rep: own customers only)
  active         boolean NOT NULL DEFAULT true,
  invited_at     timestamptz,
  last_login_at  timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS client_users_email_idx ON planner.client_users(lower(email));

CREATE TABLE IF NOT EXISTS planner.client_magic_tokens (
  token       text PRIMARY KEY,
  user_id     integer NOT NULL REFERENCES planner.client_users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz
);
CREATE TABLE IF NOT EXISTS planner.client_sessions (
  token       text PRIMARY KEY,
  user_id     integer NOT NULL REFERENCES planner.client_users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS planner.client_audit (
  id          bigserial PRIMARY KEY,
  client_id   integer,
  event       text NOT NULL,
  detail      text,
  changed_by  text,
  changed_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS client_audit_client_idx ON planner.client_audit(client_id, changed_at DESC);

-- ── Fulfil SALES mirror (sale.sale + lines + customer shipments) — the Orders view reads this, never Fulfil live ──────
CREATE TABLE IF NOT EXISTS planner.fulfil_sales (
  fulfil_id        bigint PRIMARY KEY,
  number           text,                -- SO53953
  reference        text,                -- channel order ref (EU-50898, EUWS-19317, Amazon id)
  state            text,                -- draft | quotation | confirmed | processing | done | cancel
  party_name       text, party_email text,
  ship_name        text, invoice_name text,
  channel          text, channel_source text,
  warehouse_code   text, country_code text,
  currency         text, total numeric, untaxed numeric,
  invoice_state    text, shipment_state text,
  sale_date        date, fulfil_created timestamptz,
  carrier          text,
  shipments        jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{number, tracking, carrier, date, state}]
  lines            jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{sku, qty, price, amount}]
  metadata         jsonb,
  tags             text[] NOT NULL DEFAULT '{}',          -- derived from metadata (agent_* / rep_* / metadata.tags)
  comment          text,
  last_synced_at   timestamptz NOT NULL DEFAULT now(),
  source           text
);
CREATE INDEX IF NOT EXISTS fulfil_sales_ref_idx     ON planner.fulfil_sales(reference);
CREATE INDEX IF NOT EXISTS fulfil_sales_date_idx    ON planner.fulfil_sales(sale_date DESC);
CREATE INDEX IF NOT EXISTS fulfil_sales_channel_idx ON planner.fulfil_sales(channel, country_code);
CREATE INDEX IF NOT EXISTS fulfil_sales_party_idx   ON planner.fulfil_sales(lower(party_name));
CREATE INDEX IF NOT EXISTS fulfil_sales_tags_idx    ON planner.fulfil_sales USING gin(tags);

-- the 7–30 September grey window: order refs KNOWN to be Cin7 (imported list); anything else in the window is Fulfil
CREATE TABLE IF NOT EXISTS planner.client_cin7_refs (
  order_ref   text PRIMARY KEY,
  note        text,
  imported_at timestamptz NOT NULL DEFAULT now()
);

-- ── portal-submitted orders (the record Horizon keeps; Fulfil holds the draft order itself) ────────────────────────
CREATE TABLE IF NOT EXISTS planner.client_orders (
  id             bigserial PRIMARY KEY,
  client_id      integer NOT NULL REFERENCES planner.clients(id) ON DELETE CASCADE,
  user_id        integer,
  order_type     text NOT NULL DEFAULT 'standard',     -- standard | sample
  status         text NOT NULL DEFAULT 'submitted',    -- submitted | fulfil_draft | error
  customer_po    text,
  ship_to        jsonb,                                -- {company, contact, address, phone, email}
  requested_date date,
  ship_from      text,                                 -- warehouse code
  method         text,
  notes          text,
  lines          jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{sku, qty, cartons, price, amount, flags:[]}]
  units          integer NOT NULL DEFAULT 0,
  total          numeric,
  currency       text,
  fulfil_id      bigint, fulfil_number text,
  error          text,
  submitted_by   text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS client_orders_client_idx ON planner.client_orders(client_id, created_at DESC);

-- wholesale / distributor sell prices per SKU (Horizon's price_list_* tables are SUPPLIER cost prices — different thing)
CREATE TABLE IF NOT EXISTS planner.client_price_lists (
  id          bigserial PRIMARY KEY,
  code        text NOT NULL,                          -- e.g. UK-WS, US-WS, EU-WS, AU-WS, DIST-FOB, DIST-EXW
  label       text,
  market      text, currency text,
  sku         text NOT NULL,
  price       numeric NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code, sku)
);

-- ── commission engine ─────────────────────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS planner.rep_groups (
  id                serial PRIMARY KEY,
  name              text NOT NULL UNIQUE,              -- "Agent - Schauben"
  default_rate      numeric NOT NULL DEFAULT 0,        -- percent
  xero_contact      text, xero_account_code text,
  active            boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS planner.commission_overrides (
  id            bigserial PRIMARY KEY,
  order_ref     text NOT NULL,
  rep_group_id  integer REFERENCES planner.rep_groups(id) ON DELETE CASCADE,
  rate          numeric NOT NULL,
  reason        text,
  created_by    text, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_ref, rep_group_id)
);
CREATE TABLE IF NOT EXISTS planner.commission_runs (
  id            bigserial PRIMARY KEY,
  month         text NOT NULL,                        -- YYYY-MM, by PAYMENT date
  rep_group_id  integer NOT NULL REFERENCES planner.rep_groups(id) ON DELETE CASCADE,
  status        text NOT NULL DEFAULT 'open',         -- open | finalised | paid
  total         numeric NOT NULL DEFAULT 0,
  finalised_at  timestamptz, finalised_by text,
  paid_at       timestamptz, paid_ref text,
  xero_bill_ref text, fulfil_push_status text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (month, rep_group_id)
);
CREATE TABLE IF NOT EXISTS planner.commission_rows (
  id               bigserial PRIMARY KEY,
  run_id           bigint NOT NULL REFERENCES planner.commission_runs(id) ON DELETE CASCADE,
  order_ref        text, invoice_ref text, customer text,
  paid_date        date,
  commissionable   numeric NOT NULL DEFAULT 0,        -- sales value ex tax, ex shipping
  rate             numeric NOT NULL DEFAULT 0,
  commission       numeric NOT NULL DEFAULT 0,
  credit_note_ref  text, credit_adj numeric NOT NULL DEFAULT 0,
  net              numeric NOT NULL DEFAULT 0,
  payment_code     text,                              -- "Sep-26 Agent - Schauben"
  status           text NOT NULL DEFAULT 'pending',   -- pending | paid | exception
  note             text,
  source           text                               -- fulfil | xero_csv | manual
);
CREATE INDEX IF NOT EXISTS commission_rows_run_idx ON planner.commission_rows(run_id);

-- ── messaging ─────────────────────────────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS planner.client_threads (
  id            bigserial PRIMARY KEY,
  client_id     integer NOT NULL REFERENCES planner.clients(id) ON DELETE CASCADE,
  subject       text,
  context       text,                                 -- free text: order ref / SKU / "line sheet"
  created_by    text, created_at timestamptz NOT NULL DEFAULT now(),
  last_at       timestamptz NOT NULL DEFAULT now(),
  last_sender   text                                  -- client | ops
);
CREATE TABLE IF NOT EXISTS planner.client_messages (
  id            bigserial PRIMARY KEY,
  thread_id     bigint NOT NULL REFERENCES planner.client_threads(id) ON DELETE CASCADE,
  sender_kind   text NOT NULL,                        -- client | ops
  sender        text,
  body          text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  read_by_ops_at timestamptz, read_by_client_at timestamptz
);
CREATE INDEX IF NOT EXISTS client_messages_thread_idx ON planner.client_messages(thread_id, created_at);
CREATE TABLE IF NOT EXISTS planner.client_message_files (
  id          bigserial PRIMARY KEY,
  message_id  bigint NOT NULL REFERENCES planner.client_messages(id) ON DELETE CASCADE,
  filename    text, mime text, byte_size integer,
  data        bytea, storage_path text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
