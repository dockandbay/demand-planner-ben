-- 146: Null out planner.purchase_orders.landing_date_overide for ALL rows.
--
-- Why: this column is a legacy manual "landing override" with NO editor anywhere in the app (it can't be set or
-- corrected by a user). Every value currently stored is in the PAST (243/243 in the sandbox copy), so it is stale
-- data — yet it is used app-wide as the last-resort arrival-date fallback
--   coalesce(sh.arrival_date, sh.delivery_date, sh.landing_date, po.landing_date_overide)
-- which made pre-shipping POs look like they had already "landed" in the past, and produced confusing
-- "Date conflict — Landing <past date> is in the past" actions that pointed at a date shown nowhere in the UI.
--
-- Effect: for POs whose shipment carries no dates of its own, arrival becomes "unknown" (null) instead of a bogus
-- past date — which is the honest state. POs with real shipment dates are unaffected (the shipment date wins in the
-- coalesce above regardless).
--
-- Safe + idempotent: only touches rows that still have a value; re-running is a no-op.
UPDATE planner.purchase_orders
   SET landing_date_overide = NULL
 WHERE landing_date_overide IS NOT NULL;
