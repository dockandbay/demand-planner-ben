-- migration 427
-- v28.755 (Ben 10-Nov-26): link an Other payment to its Xero document by hand, a bill OR a supplier credit note, in either org.
-- Before this the only link was an exact match of the HORIZON reference to a Xero bill number in one org (UK unless country = AU),
-- so bills numbered differently or sitting in Xero AU showed "not in Xero" and blocked Paid > Xero.
-- A linked bill is paid by Paid > Xero; a linked credit note is allocated against the run's bill(s) and the net is paid.
-- Blank = the old reference match still applies. Additive and idempotent.
ALTER TABLE planner.deposits ADD COLUMN IF NOT EXISTS xero_doc_type text;        -- bill | credit
ALTER TABLE planner.deposits ADD COLUMN IF NOT EXISTS xero_doc_id text;          -- Xero InvoiceID (bill) or CreditNoteID (credit)
ALTER TABLE planner.deposits ADD COLUMN IF NOT EXISTS xero_doc_region text;      -- uk | au (the Xero org it is in)
ALTER TABLE planner.deposits ADD COLUMN IF NOT EXISTS xero_doc_number text;      -- bill / credit note number, for display
ALTER TABLE planner.deposits ADD COLUMN IF NOT EXISTS xero_doc_linked_by text;
ALTER TABLE planner.deposits ADD COLUMN IF NOT EXISTS xero_doc_linked_at timestamptz;
ALTER TABLE planner.deposits DROP CONSTRAINT IF EXISTS deposits_xero_doc_type_check;
ALTER TABLE planner.deposits ADD CONSTRAINT deposits_xero_doc_type_check CHECK (xero_doc_type IS NULL OR xero_doc_type IN ('bill','credit'));
ALTER TABLE planner.deposits DROP CONSTRAINT IF EXISTS deposits_xero_doc_region_check;
ALTER TABLE planner.deposits ADD CONSTRAINT deposits_xero_doc_region_check CHECK (xero_doc_region IS NULL OR xero_doc_region IN ('uk','au'));
