-- migration 419
-- v28.709 (Ben 05-Nov-26: "september 2026 is the cut off for the old process. rebuild the monthly runs from paid history, badge
-- 'created from paid history legacy process'"): monthly runs up to Sep-26 are rebuilt from planner.commission_paid_history.
-- commission_runs.legacy marks them (read only: no rebuild, statement email, Xero bill or Fulfil push); commission_rows.history_id
-- links each row to its paid history line (and commission_paid_history.run_id links the line back to its run).
ALTER TABLE planner.commission_runs ADD COLUMN IF NOT EXISTS legacy boolean NOT NULL DEFAULT false;
ALTER TABLE planner.commission_rows ADD COLUMN IF NOT EXISTS history_id bigint;
CREATE INDEX IF NOT EXISTS commission_rows_history_id_idx ON planner.commission_rows (history_id) WHERE history_id IS NOT NULL;
-- v28.709 (Ben 05-Nov-26): the commission statement email is sent "from" the agent's sales mailbox (sales@ default, sales-uk@, sales-us@,
-- sales-eu@, keyaccounts@). Used as Reply-To, and as the From address once dockandbay.com is verified in Resend (env EMAIL_ROOT_DOMAIN_OK=1).
ALTER TABLE planner.rep_groups ADD COLUMN IF NOT EXISTS statement_from text;
