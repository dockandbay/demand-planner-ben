-- 117: extend the "production_status = 'shipped'" backfill (migration 115 covered SHIPPING only)
-- to every PO whose status is SHIPPED / SHIPPING / COMPLETED / DELIVERED. If it has shipped,
-- completed or delivered then production is done + shipped. Idempotent (skips rows already 'shipped');
-- safe to re-run and safe even if 115 already applied.
UPDATE planner.purchase_orders
   SET production_status = 'shipped',
       production_confirmed_at = coalesce(production_confirmed_at, now()),
       updated_at = now()
 WHERE (status ILIKE '%ship%' OR status ILIKE '%complete%' OR status ILIKE '%deliver%')
   AND coalesce(production_status,'') <> 'shipped';
