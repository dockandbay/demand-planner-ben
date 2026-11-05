-- migration 421
-- v28.727 (Ben 04/05-Nov-26, docs/specs/cogs-channel-allocation.md): COGS and SALES by channel. Fulfil books every sale to generic
-- clearing accounts (9006 COGS; 9002 Revenue, 9003 Contra Revenue, 9005 Sales Discount); HORIZON journals them out to the channel
-- accounts monthly ("COGS and sales must net to zero in Xero clearing accounts"). One row per journal action (kept for ever: the
-- Journal log on BUY & MOVE > Inventory > COGS). The latest build of a month is in planner.app_settings key 'cogs_ch:<YYYY-MM>'.
CREATE TABLE IF NOT EXISTS planner.cogs_channel_runs (
  id bigserial PRIMARY KEY,
  month text NOT NULL,                 -- YYYY-MM
  org text NOT NULL,                   -- 'UK' | 'AU'
  journal text NOT NULL,               -- 'COGS' | 'SALES'
  run_kind text NOT NULL,              -- 'month_end' | 'refresh_7' | 'refresh_15' | 'manual'
  action text NOT NULL,                -- 'created' | 'rebuilt' | 'top_up' | 'no_change' | 'error'
  run_at timestamptz NOT NULL DEFAULT now(),
  run_by text,
  total numeric,                       -- journal total (sum of debits) after this run
  prev_total numeric,                  -- what Xero held before this run (all journals of the month)
  xero_id text,
  xero_status text,                    -- DRAFT | POSTED
  lines jsonb,                         -- [{code, name, amount}] amount + = debit, - = credit (the lines sent; a top-up = the difference)
  flags jsonb,
  emailed boolean NOT NULL DEFAULT false,
  error text
);
CREATE INDEX IF NOT EXISTS cogs_channel_runs_month_idx ON planner.cogs_channel_runs (month DESC, org, journal);
