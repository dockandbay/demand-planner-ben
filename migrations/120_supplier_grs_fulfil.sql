-- 120: Supplier field for ERP linkage.
--   fulfil_id — Fulfil ERP supplier ID (alongside the existing cin7_member_id)
-- (An earlier draft also added grs_number, but the GRS registration number is the same as the existing
--  Textile Exchange ID / te_id, so that column was dropped — use te_id for it.)
-- business_name, address_1/2, city, state, postcode, phone, te_id, incoterm, cin7_member_id already exist.
ALTER TABLE planner.suppliers ADD COLUMN IF NOT EXISTS fulfil_id text;
