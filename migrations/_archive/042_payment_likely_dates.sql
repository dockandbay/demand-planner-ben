-- 042_payment_likely_dates.sql — manual "likely payment date" override for overdue cash-flow lines (v20.149)
--
-- The CASH FLOW view (SUPPLY) itemises every payment: supplier-goods milestones (deposit/completion/balance),
-- referenced-deposit pools, freight (delivery +14d), and import duty/tax (landing; USA landing +7d). For an
-- overdue, still-unpaid line, Ben can set a realistic "likely payment date" — when it will actually be paid —
-- which moves the line into that month's cash flow (the original due date is kept for reference).
--
-- line_key is the stable cash-flow line id from the server (e.g. 'dep:PO-54UKXR1', 'comp:PO-…', 'bal:PO-…',
-- 'deppool:<reference>', 'freight:ship:<ref>' / 'freight:po:PO-…', 'duty:ship:<ref>', 'tax:po:PO-…').
CREATE TABLE IF NOT EXISTS planner.payment_likely_dates (
  line_key    text PRIMARY KEY,
  likely_date date,
  updated_at  timestamptz DEFAULT now()
);
