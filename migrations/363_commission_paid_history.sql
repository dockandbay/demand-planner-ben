-- v28.322 (Ben 13-Oct-26): full history of commissions paid to agents ("lets put this into a database table, after we pay commissions we record
-- them here"). Seeded once from the PAID_HISTORY sheet (Jan-22 onward, scripts/import_commission_history.cjs); from then on every HORIZON
-- commission run marked Paid appends its rows here (run_id). Also the check that an invoice has already earned commission. Additive.
CREATE TABLE IF NOT EXISTS planner.commission_paid_history (
  id bigserial PRIMARY KEY,
  period date,                      -- month the commission was paid (first of month); sheet column A "Jan-22"
  period_label text,                -- as written in the sheet
  rep_group text,                   -- e.g. "Agent - Schauben"
  customer text,
  city text, state text, zip text,  -- as in the sheet (columns are not reliably in this order there)
  invoice_no text,                  -- e.g. USWS-8897
  po_no text,
  invoice_date date,
  currency text,                    -- EUR when the sheet shows €, else NULL (sheet currency per rep group)
  commissionable numeric,           -- invoice amount (commissionable)
  rate_pct numeric,                 -- 15 = 15%
  commission_due numeric,
  credit_note text,
  status text,                      -- paid | duplicate | not_paid | cancelled | (blank)
  paid_amount numeric,              -- "Amount" actually paid
  notes text,
  shopify_po text,
  notes2 text,
  difficulty text,                  -- "Easy / Hard"
  payment_code text,                -- e.g. "Jan-24 Agent - Harper Group"
  past_payment_codes text,
  past_payment_agency text,
  different_agency boolean,
  source text NOT NULL DEFAULT 'horizon',   -- 'sheet' (import) | 'horizon' (a paid run)
  run_id bigint,                    -- planner.commission_runs.id when written by HORIZON
  raw jsonb,                        -- the original sheet row (import only)
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text
);
CREATE INDEX IF NOT EXISTS commission_paid_history_invoice_idx ON planner.commission_paid_history (upper(invoice_no));
CREATE INDEX IF NOT EXISTS commission_paid_history_group_period_idx ON planner.commission_paid_history (rep_group, period);
CREATE INDEX IF NOT EXISTS commission_paid_history_run_idx ON planner.commission_paid_history (run_id) WHERE run_id IS NOT NULL;
