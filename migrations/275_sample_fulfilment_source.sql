-- 275: how a sample is fulfilled (Ben). Default 'supplier' = today's behaviour (supplier makes & ships it, visible
-- on the portal). 'warehouse' = shipped from stock by D&B; 'po' = linked to a Direct-to-Client PO. warehouse/po
-- samples are internal-only (tracked in SUPPLY ▸ Samples) and hidden from the supplier portal. fulfilment_po holds
-- the linked PO reference when source='po'. Additive, safe.
ALTER TABLE planner.sample_requests
  ADD COLUMN IF NOT EXISTS fulfilment_source text NOT NULL DEFAULT 'supplier',
  ADD COLUMN IF NOT EXISTS fulfilment_po text;
