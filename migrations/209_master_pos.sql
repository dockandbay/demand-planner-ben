-- 209: Master PO — consolidate multiple child POs under ONE supplier invoice.
-- A MASTER is a REAL purchase_orders row (is_master=true) that behaves like any PO — it appears in the
-- grid, takes shipments/branch/ERP, and carries the consolidated child lines + the single supplier invoice.
-- Its number is the biggest child's PO + '-MASTER'. CHILDREN carry master_po (→ the master's po) and are
-- EXCLUDED from live calcs (buy plan, cash flow, payments, ERP) — the master represents them. Children keep a
-- 'child' badge, no ERP sync, and inherit the master's status. Additive + idempotent.

ALTER TABLE planner.purchase_orders ADD COLUMN IF NOT EXISTS master_po  text;      -- on a CHILD: the master's po (NULL = normal PO)
ALTER TABLE planner.purchase_orders ADD COLUMN IF NOT EXISTS is_master  boolean DEFAULT false;   -- true on the consolidated master row
CREATE INDEX IF NOT EXISTS idx_purchase_orders_master_po ON planner.purchase_orders(master_po);
