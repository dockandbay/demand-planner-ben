-- 139: branch "delivery notes" → flow onto POs.
-- branches.delivery_notes: editable per branch in CONFIG ▸ Branches.
-- purchase_orders.branch_delivery_notes: the PO's own copy (editable in the supply app). When blank it falls
-- back to the branch's delivery_notes at read time; assigning/changing a PO's branch clears the override so it
-- re-populates from the new branch.
ALTER TABLE planner.branches
  ADD COLUMN IF NOT EXISTS delivery_notes text;
ALTER TABLE planner.purchase_orders
  ADD COLUMN IF NOT EXISTS branch_delivery_notes text;
