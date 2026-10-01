-- 088: index purchase_orders(deposit_ref). The PO calc (both supply-plan /api/supply/purchase-orders
-- and the portal POS_SQL_PORTAL) computes deposit availability with a correlated subquery
--   SELECT sum(pay_start_deposit_assigned) FROM purchase_orders p2 WHERE p2.deposit_ref = po.deposit_ref
-- which, without this index, runs a full seq scan of purchase_orders once per PO row (O(n^2)).
-- This index turns it into an index scan — the dominant cost in the PO grid query. Idempotent.

CREATE INDEX IF NOT EXISTS po_deposit_ref_idx ON planner.purchase_orders(deposit_ref);
