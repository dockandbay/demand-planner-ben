-- 077: Per-production "require supplier confirmation" flag. When TRUE, the supplier-confirmation workflow is
-- active for every PO in that production (the portal asks the supplier to confirm SKUs/qty/dates, and an
-- unconfirmed order raises an action). Defaults to FALSE so all CURRENT productions start with the workflow OFF;
-- future productions can be flipped to TRUE to switch it on.

ALTER TABLE planner.prod_numbers
  ADD COLUMN IF NOT EXISTS require_supplier_confirmation boolean NOT NULL DEFAULT false;
