-- 089_productions_57_78_active_confirm.sql
-- Set productions 57–78 to status ACTIVE and require_supplier_confirmation = true.
-- One-time data update; idempotent (re-running sets the same values). The prod_no ~ '^[0-9]+$' guard
-- keeps it safe against any non-numeric prod_no values. NOTE prod_no is the canonical numeric form (no "P"
-- prefix) — if prod sync has reintroduced "P" prefixes, those rows won't match the BETWEEN.

UPDATE planner.prod_numbers
   SET status = 'ACTIVE',
       require_supplier_confirmation = true
 WHERE prod_no ~ '^[0-9]+$'
   AND prod_no::int BETWEEN 57 AND 78;
