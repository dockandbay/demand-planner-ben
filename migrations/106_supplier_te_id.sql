-- 106_supplier_te_id.sql
-- Textile Exchange ID (TE-ID) on suppliers — shown under the company name on the Commercial/Tax Invoice
-- header for GRS compliance (e.g. "Textile Exchange-ID (TE-ID): TE-00055808"). Ben owns values in Airtable.
ALTER TABLE planner.suppliers ADD COLUMN IF NOT EXISTS te_id text;
UPDATE planner.suppliers SET te_id='TE-00055808' WHERE name='Lixin';
