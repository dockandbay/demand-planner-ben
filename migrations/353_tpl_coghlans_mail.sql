-- v28.267 (Ben 12-Oct-26): Coghlans weekly invoices imported automatically from accounts@ (Gmail, read only) into 3PL invoicing, and a
-- weekly view of processed (Xero bill exists) / unprocessed invoices. Additive and idempotent.
ALTER TABLE planner.tpl_invoice_files ADD COLUMN IF NOT EXISTS invoice_no text;        -- e.g. DOK50370 (Coghlans), from the email / filename
ALTER TABLE planner.tpl_invoice_files ADD COLUMN IF NOT EXISTS period_end date;        -- the invoice's own Period End (Settings sheet)
ALTER TABLE planner.tpl_invoice_files ADD COLUMN IF NOT EXISTS source_msg_id text;     -- Gmail message id when imported from accounts@
CREATE INDEX IF NOT EXISTS tpl_invoice_files_invno_idx ON planner.tpl_invoice_files (tpl, invoice_no);
UPDATE planner.tpl_invoice_files SET invoice_no = upper(substring(filename from '(?i)(DOK[0-9]+)')) WHERE tpl = 'au_coghlans' AND invoice_no IS NULL AND filename ~* 'DOK[0-9]+';
CREATE TABLE IF NOT EXISTS planner.tpl_coghlans_mail (
  invoice_no text PRIMARY KEY,          -- DOK number from the subject "Coghlan Invoice DOK50370"
  msg_id text,
  email_date date,
  file_id bigint,                       -- planner.tpl_invoice_files.id once imported (or an earlier manual upload of the same invoice)
  period_end date,
  total_inc numeric,
  error text,
  scanned_at timestamptz NOT NULL DEFAULT now()
);
