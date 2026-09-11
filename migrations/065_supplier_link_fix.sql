-- 065: supplier-link fix — repair PO↔supplier links broken by inconsistent supplier-name spelling.
--
-- Symptom (seen in LIVE): POs imported with supplier_name 'Jinma (Merry)' (capital M) did not link to the
-- suppliers master row 'Jinma (merry)' (lowercase m), so supplier_id was left NULL and payment terms /
-- production lead times never applied. Same risk for any case/spacing mismatch (e.g. 'Given logistics'
-- vs 'Given Logistics').
--
-- Fix: (1) normalise the known spelling variants to a single canonical form, then (2) re-resolve
-- purchase_orders.supplier_id from supplier_name CASE-INSENSITIVELY so future spelling drift can't silently
-- break the link. Safe to run more than once.

BEGIN;

-- 1) canonical spellings (proper-case, dominant variant)
UPDATE planner.suppliers        SET name='Jinma (Merry)'   WHERE lower(trim(name))='jinma (merry)';
UPDATE planner.purchase_orders  SET supplier_name='Jinma (Merry)' WHERE lower(trim(supplier_name))='jinma (merry)';
UPDATE planner.deposits         SET supplier_name='Jinma (Merry)' WHERE lower(trim(supplier_name))='jinma (merry)';
UPDATE planner.deposits         SET supplier_name='Given Logistics' WHERE lower(trim(supplier_name))='given logistics';

-- 2) re-resolve supplier_id from supplier_name, case-insensitive (only where a master row matches)
UPDATE planner.purchase_orders po
   SET supplier_id = s.id
  FROM planner.suppliers s
 WHERE lower(trim(po.supplier_name)) = lower(trim(s.name))
   AND po.supplier_name IS NOT NULL
   AND po.supplier_id IS DISTINCT FROM s.id;

COMMIT;

-- NOTE: these PO supplier_names have NO matching suppliers master row, so they remain unlinked until the
-- supplier is added to planner.suppliers (or the PO is a client/DIRECT order handled differently):
--   Forming Reality, Chillys Bottles, Adastra, Synergies, Tangle Teezer, Babiators.
-- Decide per name whether to add a supplier row (then re-run step 2) — not done here to avoid inventing data.
