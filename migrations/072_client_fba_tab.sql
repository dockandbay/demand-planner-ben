-- 072: Client/FBA tab (#12) — a client deadline date on the PO, and a category on attachments so
-- client/FBA documents are kept separate from supplier invoice docs (both live in portal_attachments).

ALTER TABLE planner.purchase_orders
  ADD COLUMN IF NOT EXISTS client_deadline_date date;

ALTER TABLE planner.portal_attachments
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'invoice';   -- 'invoice' (supplier) | 'client' (Client/FBA tab)
