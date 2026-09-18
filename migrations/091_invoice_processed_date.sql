-- 091 — invoice_processed_date on purchase_orders (+ auto-stamp trigger)
-- Records the date a PO's final supplier invoice was processed (entered/approved). Used as the
-- payment-due anchor for small POs (value used < $500): those default to 0% start + 0% completion
-- deposit (100% balance) with the balance due on the invoice-processed date, or — while still an
-- estimate — on the ship date. Nullable; stamped automatically by the trigger below.
ALTER TABLE planner.purchase_orders
  ADD COLUMN IF NOT EXISTS invoice_processed_date date;

COMMENT ON COLUMN planner.purchase_orders.invoice_processed_date IS
  'Date the final supplier invoice was processed (entered/approved). Payment-due anchor for small POs (< $500). Null until a final invoice is recorded. Auto-stamped by trg_stamp_invoice_processed.';

-- Auto-stamp: whenever a final invoice total is present, stamp the processed date (once) to the current
-- date; clear it when the total is removed. Covers every write path (manual entry, submission apply,
-- portal invoice apply) in one place. Stamps only when currently null, so re-editing the amount later
-- doesn't move the date.
CREATE OR REPLACE FUNCTION planner.stamp_invoice_processed_date() RETURNS trigger AS $$
BEGIN
  IF NEW.supplier_invoice_total IS NOT NULL THEN
    NEW.invoice_processed_date := coalesce(NEW.invoice_processed_date, current_date);
  ELSE
    NEW.invoice_processed_date := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_stamp_invoice_processed ON planner.purchase_orders;
CREATE TRIGGER trg_stamp_invoice_processed
  BEFORE INSERT OR UPDATE OF supplier_invoice_total ON planner.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION planner.stamp_invoice_processed_date();
