-- Migration 009 — payment_run_meta (Payments engine, spec B8.5)
-- A "payment run" = all payment transactions sharing a date (derived). The run-level bank /
-- paid-currency / bank-amount / FX (→ USD equivalent for the Xero upload) are entered here.
-- Keyed by run date. HOW TO APPLY: tested on sandbox; BEN runs on live.
create table if not exists planner.payment_run_meta (
  run_date       date primary key,
  bank           text,
  paid_currency  text,
  bank_amount    numeric(14,2),
  fx_rate        numeric(12,5),
  updated_at     timestamptz not null default now()
);
comment on table planner.payment_run_meta is 'Run-level bank/FX header for date-grouped payment runs (spec B8.5).';
