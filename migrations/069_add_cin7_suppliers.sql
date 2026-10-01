-- 069: add product suppliers found in the Cin7 OrdersExport that weren't in the planner suppliers master.
-- Needed before loading the ERP PO mirror (erp_purchase_orders) so these suppliers resolve by name.
-- Decided with Ben: add PRODUCT suppliers only. Print vendors / internal entities / B2B customers were
-- deliberately NOT added (their ERP POs keep their raw Cin7 name and stay unmatched on purpose). Test/HMRC
-- POs were dropped from the load entirely. Idempotent (case-insensitive name guard).

INSERT INTO planner.suppliers (name, code, kind, active)
SELECT v.name, v.code, 'supplier', true
FROM (VALUES
  ('Forming Reality',   'FR'),
  ('Kangxun (Doris)',   'KX'),
  ('Foamie',            'FM'),
  ('Chilly Bottles',    'CB')
) AS v(name, code)
WHERE NOT EXISTS (
  SELECT 1 FROM planner.suppliers s
  WHERE lower(trim(s.name)) = lower(trim(v.name))
);
