-- 291_fba_pending_transfers_source.sql
-- v27.798 (Ben): the in-flight FBA transfer cache now unions BOTH sources during the Cin7→Fulfil migration:
--   • Cin7  /BranchTransfers   (existing)
--   • Fulfil stock.shipment.internal into the Amazon FBA / AWD warehouses (new)
-- Duplicates across the two ERPs are collapsed on the Amazon FBA shipment id (the FBAxxxxx `reference`, the same
-- key inbound_shipments.reference uses); Fulfil wins on a tie. `source` records which ERP a surviving row came
-- from, purely for display/debugging. Fulfil rows store the internal shipment id as a NEGATIVE cin7_id so the
-- (cin7_id, sku) primary key never collides with a real (positive) Cin7 BranchTransfer id.
ALTER TABLE planner.fba_pending_transfers
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'cin7';   -- 'cin7' | 'fulfil'
