-- v28.332 (Ben 13-Oct-26): commissions stage 2, the per-agent monthly calculation. Additive and idempotent.
-- A run row is one PAYMENT of one order that earns in the run's month: cash received (ex tax) for a shipped order, converted into the
-- agent's currency at the payment date (Fulfil daily rates); a deposit paid before shipping earns in the month the order ships (invoice).
ALTER TABLE planner.commission_rows ADD COLUMN IF NOT EXISTS currency text;        -- the agent's currency (commissionable / commission)
ALTER TABLE planner.commission_rows ADD COLUMN IF NOT EXISTS currency_src text;    -- the invoice currency
ALTER TABLE planner.commission_rows ADD COLUMN IF NOT EXISTS amount_src numeric(14,2);   -- payment ex tax, invoice currency
ALTER TABLE planner.commission_rows ADD COLUMN IF NOT EXISTS fx_rate numeric(14,6);      -- agent currency per invoice currency on the payment date
ALTER TABLE planner.commission_rows ADD COLUMN IF NOT EXISTS invoice_date date;           -- Fulfil invoice = shipped
ALTER TABLE planner.commission_rows ADD COLUMN IF NOT EXISTS earn_date date;              -- later of payment and invoice date
ALTER TABLE planner.commission_rows ADD COLUMN IF NOT EXISTS rate_source text;            -- override | customer | agent
ALTER TABLE planner.commission_rows ADD COLUMN IF NOT EXISTS agent_source text;           -- override | fulfil code | customer list | xero group
ALTER TABLE planner.commission_runs ADD COLUMN IF NOT EXISTS currency text;
ALTER TABLE planner.commission_runs ADD COLUMN IF NOT EXISTS built_at timestamptz;
