-- 120: Supplier fields for the tax-invoice generator + ERP linkage.
-- The invoice pulls company name / address / phone from planner.suppliers (already existed); these add:
--   grs_number  — GRS registration number (a.k.a. "contract number" on the tax invoice; distinct from tax ID)
--   fulfil_id   — Fulfil ERP supplier ID (alongside the existing cin7_member_id)
-- business_name, address_1/2, city, state, postcode, phone, te_id, incoterm, cin7_member_id already exist.
ALTER TABLE planner.suppliers
  ADD COLUMN IF NOT EXISTS grs_number text,
  ADD COLUMN IF NOT EXISTS fulfil_id  text;
