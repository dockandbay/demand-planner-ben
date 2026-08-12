-- 209: Master PO — consolidate multiple child POs under ONE supplier invoice.
-- One supplier invoice can cover many POs. The MASTER owns finance + ERP; child POs keep
-- planning/production (demand, shipments, buy plan). All children of a master share ONE
-- supplier + ONE currency. Step 1 = grouping + reconciliation only (no ERP push, no cash-flow
-- rerouting yet — those are later steps). Additive + idempotent.

CREATE TABLE IF NOT EXISTS planner.master_pos (
  master_po             text PRIMARY KEY,                 -- MPO-NNNN
  supplier_name         text,
  currency              text,
  invoice_total         numeric(14,2),                    -- the single supplier invoice covering all children
  invoice_attachment_id bigint,                           -- optional → planner.portal_attachments(id)
  status                text DEFAULT 'draft',             -- draft | confirmed (ERP states come in step 2)
  notes                 text,
  created_by            text,
  created_at            timestamptz DEFAULT now()
);

-- Child link: which master (if any) a PO belongs to. NULL = standalone (unchanged behaviour).
ALTER TABLE planner.purchase_orders ADD COLUMN IF NOT EXISTS master_po text;
CREATE INDEX IF NOT EXISTS idx_purchase_orders_master_po ON planner.purchase_orders(master_po);
