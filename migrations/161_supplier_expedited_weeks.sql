-- 161_supplier_expedited_weeks.sql
-- Supplier "expedited production weeks" — how fast a supplier can turn a rushed/expedited production run.
-- Default 6 weeks for everyone; XR Textile, Lixin and Jinma can do 3. Editable in CONFIG ▸ Suppliers;
-- feeds the urgent-buy / expedited-production BI calcs.
ALTER TABLE planner.suppliers ADD COLUMN IF NOT EXISTS expedited_production_weeks numeric NOT NULL DEFAULT 6;
UPDATE planner.suppliers SET expedited_production_weeks = 3
  WHERE lower(trim(name)) IN ('xr textile', 'lixin') OR name ILIKE '%jinma%';
