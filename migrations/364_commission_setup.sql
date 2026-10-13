-- v28.326 (Ben 13-Oct-26): commissions stage 1, agent set-up. Additive and idempotent.
-- Agents (rep_groups): settings currency (payments are converted into it), Fulfil agent codes (sale.sale metafield agent_code), the Xero
-- contact group per org (the agent's customer list), statement email, portal access, and "no commission" markers (Faire: an order placed
-- through Faire earns the customer's normal agent nothing; No Agent / Agent - UK / Distributors / National Trust: 0%).
ALTER TABLE planner.rep_groups ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD';
ALTER TABLE planner.rep_groups ADD COLUMN IF NOT EXISTS currency_checked boolean NOT NULL DEFAULT false;
ALTER TABLE planner.rep_groups ADD COLUMN IF NOT EXISTS fulfil_codes text[] NOT NULL DEFAULT '{}';
ALTER TABLE planner.rep_groups ADD COLUMN IF NOT EXISTS xero_group_uk_id text;
ALTER TABLE planner.rep_groups ADD COLUMN IF NOT EXISTS xero_group_uk_name text;
ALTER TABLE planner.rep_groups ADD COLUMN IF NOT EXISTS xero_group_au_id text;
ALTER TABLE planner.rep_groups ADD COLUMN IF NOT EXISTS xero_group_au_name text;
ALTER TABLE planner.rep_groups ADD COLUMN IF NOT EXISTS statement_email text;
ALTER TABLE planner.rep_groups ADD COLUMN IF NOT EXISTS portal_on boolean NOT NULL DEFAULT false;
ALTER TABLE planner.rep_groups ADD COLUMN IF NOT EXISTS no_commission boolean NOT NULL DEFAULT false;
ALTER TABLE planner.rep_groups ADD COLUMN IF NOT EXISTS notes text;
-- Order overrides: credited agent (rep_group_id), optional % (blank = that agent's rate), optional fixed commissionable amount.
ALTER TABLE planner.commission_overrides ALTER COLUMN rate DROP NOT NULL;
ALTER TABLE planner.commission_overrides ADD COLUMN IF NOT EXISTS commissionable_amount numeric;
-- Customer rates: a customer-specific % that beats the agency rate.
CREATE TABLE IF NOT EXISTS planner.commission_customer_rates (
  id bigserial PRIMARY KEY,
  customer_name text NOT NULL,
  rep_group_id integer REFERENCES planner.rep_groups(id) ON DELETE SET NULL,
  rate numeric NOT NULL,
  xero_contact_id text, email text,
  note text, created_by text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS commission_customer_rates_name_uq ON planner.commission_customer_rates (lower(customer_name));
-- Customer -> agent list: synced from each agent's Xero contact group (source 'xero_group') or set by a person ('manual', wins).
CREATE TABLE IF NOT EXISTS planner.commission_customers (
  id bigserial PRIMARY KEY,
  org text NOT NULL DEFAULT 'uk',
  xero_contact_id text,
  customer_name text NOT NULL,
  email text,
  rep_group_id integer REFERENCES planner.rep_groups(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'xero_group',
  synced_at timestamptz, updated_by text, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS commission_customers_xero_uq ON planner.commission_customers (org, xero_contact_id) WHERE xero_contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS commission_customers_email_idx ON planner.commission_customers (lower(email));
