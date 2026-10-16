-- v28.396 (Ben 16-Oct-26): ACCOUNTS > Reconcile > Flexport AU.
-- Flexport is always paid from Bank of America (UK org, USD). When the bill is for the AU business, Fulfil puts it in Xero AU, so
-- HORIZON (a) pays the AU bill in Xero AU from 901 Loan - Dock & Bay Ltd (UK) and (b) creates a Spend Money in Bank of America in
-- Xero UK for the same amount, coded to 901 Loan - Dock & Bay PTY LTD (Australia). One row per Bank of America statement line.
CREATE TABLE IF NOT EXISTS planner.flexport_au_settlements (
  id            bigserial PRIMARY KEY,
  line_date     date NOT NULL,                 -- the Bank of America statement line (planner.accounts_stmt_lines, org uk)
  line_amount   numeric(14,2) NOT NULL,        -- positive USD paid out
  line_ref      text NOT NULL,
  account_id    text,                          -- Xero UK bank AccountID (Bank of America)
  bills         jsonb NOT NULL DEFAULT '[]',   -- [{ invoice_id, number, amount, payment_id }] Xero AU bills paid from 901
  amount        numeric(14,2) NOT NULL,        -- USD total of the AU bills = the Spend Money amount
  au_done       boolean NOT NULL DEFAULT false,
  uk_txn_id     text,                          -- Xero UK Spend Money (BankTransactionID)
  status        text NOT NULL DEFAULT 'creating',   -- creating | partial (AU paid, UK spend money failed) | created | error
  error         text,
  created_by    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
-- one live settlement per statement line (an error row can be retried)
CREATE UNIQUE INDEX IF NOT EXISTS flexport_au_settlements_line_uq ON planner.flexport_au_settlements (line_date, line_amount, line_ref) WHERE status <> 'error';
