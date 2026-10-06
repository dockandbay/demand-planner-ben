-- 330_supplier_xero_contacts.sql  (v28.177, Ben): the supplier's Xero CONTACT name per org.
-- Fulfil created supplier contacts in Xero named "<supplier name> - <supplier code>" (e.g. "Nice Look - NL") and Ben is
-- aligning every supplier to that convention in BOTH Xero UK and Xero AU. HORIZON now posts supplier bills / credit notes
-- by ContactID, resolved from these names (exact, active contact in that org); a missing contact blocks the post (Xero
-- would otherwise silently create a duplicate contact from the name).
-- Seed: every kind='supplier' row with a code gets name || ' - ' || code for both orgs (Fulfil's convention). Freight /
-- internal / other rows and suppliers without a code stay NULL (the app then uses the supplier name). Editable per supplier
-- in SUPPLY > CONFIG > Suppliers. Additive + idempotent: IF NOT EXISTS, and only NULLs are filled (an edited value is kept).
ALTER TABLE planner.suppliers ADD COLUMN IF NOT EXISTS xero_contact_uk text;
ALTER TABLE planner.suppliers ADD COLUMN IF NOT EXISTS xero_contact_au text;
COMMENT ON COLUMN planner.suppliers.xero_contact_uk IS 'Exact Xero UK contact name for this supplier (default "<name> - <code>"). v28.177';
COMMENT ON COLUMN planner.suppliers.xero_contact_au IS 'Exact Xero AU contact name for this supplier (default "<name> - <code>"). v28.177';
UPDATE planner.suppliers
   SET xero_contact_uk = coalesce(xero_contact_uk, trim(name) || ' - ' || trim(code)),
       xero_contact_au = coalesce(xero_contact_au, trim(name) || ' - ' || trim(code))
 WHERE coalesce(kind, 'supplier') = 'supplier'
   AND coalesce(trim(code), '') <> '' AND coalesce(trim(name), '') <> ''
   AND (xero_contact_uk IS NULL OR xero_contact_au IS NULL);
