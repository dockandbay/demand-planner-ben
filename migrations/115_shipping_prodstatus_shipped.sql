-- 115: any PO already in SHIPPING status reads production_status = 'shipped'
-- (SHIPPING implies production complete + shipped). One-off backfill; ongoing, the
-- set-shipping endpoint (POST /api/supply/po/:po/set-shipping) now sets this too.
UPDATE planner.purchase_orders
   SET production_status = 'shipped',
       production_confirmed_at = coalesce(production_confirmed_at, now())
 WHERE status ILIKE 'ship%'
   AND coalesce(production_status,'') <> 'shipped';
