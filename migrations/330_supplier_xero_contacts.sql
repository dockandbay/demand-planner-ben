-- 330_supplier_xero_contacts.sql  (v28.176, Ben): the supplier's Xero CONTACT name per org.
-- Fulfil created supplier contacts in Xero named "<supplier name> - <supplier code>" (e.g. "Nice Look - NL") and Ben is
-- aligning every supplier to that convention in BOTH Xero UK and Xero AU. HORIZON now posts supplier bills / credit notes
-- by ContactID, resolved from these names (exact, active contact in that org); a missing contact blocks the post (Xero
-- would otherwise silently create a duplicate contact from the name).
-- Seed: every kind='supplier' row with a code gets name || ' - ' || code for both orgs (Fulfil's convention). Freight /
-- internal / other rows and suppliers without a code stay NULL (the app then uses the supplier name). Editable per supplier
-- in SUPPLY > CONFIG > Suppliers. Additive + idempotent: IF NOT EXISTS, and only NULLs are filled (an edited value is kept).
ALTER TABLE planner.suppliers ADD COLUMN IF NOT EXISTS xero_contact_uk text;
ALTER TABLE planner.suppliers ADD COLUMN IF NOT EXISTS xero_contact_au text;
COMMENT ON COLUMN planner.suppliers.xero_contact_uk IS 'Exact Xero UK contact name for this supplier (default "<name> - <code>"). v28.176';
COMMENT ON COLUMN planner.suppliers.xero_contact_au IS 'Exact Xero AU contact name for this supplier (default "<name> - <code>"). v28.176';
UPDATE planner.suppliers
   SET xero_contact_uk = coalesce(xero_contact_uk, trim(name) || ' - ' || trim(code)),
       xero_contact_au = coalesce(xero_contact_au, trim(name) || ' - ' || trim(code))
 WHERE coalesce(kind, 'supplier') = 'supplier'
   AND coalesce(trim(code), '') <> '' AND coalesce(trim(name), '') <> ''
   AND (xero_contact_uk IS NULL OR xero_contact_au IS NULL);
-- v28.177 (Ben): Fulfil builds the Xero contact from ITS party name + code, and three differ from HORIZON (checked in Fulfil
-- 06-Oct-26): MQ "MQ Print" (HORIZON "MQ Print (Sherry)"), JM "Jinma (merry)" (HORIZON "Jinma (Merry)"), and Huzhou Double Qing
-- (Ribbon) has code HDQ in Fulfil but none in HORIZON. Point those at the contact Fulfil creates. Only replaces NULL or the
-- plain name || ' - ' || code default above, so a value edited in CONFIG is kept; safe to re-run.
UPDATE planner.suppliers s SET
       xero_contact_uk = CASE WHEN s.xero_contact_uk IS NULL OR s.xero_contact_uk = trim(s.name) || ' - ' || coalesce(trim(s.code), '') THEN v.contact ELSE s.xero_contact_uk END,
       xero_contact_au = CASE WHEN s.xero_contact_au IS NULL OR s.xero_contact_au = trim(s.name) || ' - ' || coalesce(trim(s.code), '') THEN v.contact ELSE s.xero_contact_au END
  FROM (VALUES ('code', 'MQ', 'MQ Print - MQ'),
               ('code', 'JM', 'Jinma (merry) - JM'),
               ('name', 'Huzhou Double Qing (Ribbon)', 'Huzhou Double Qing (Ribbon) - HDQ')) v(k, key, contact)
 WHERE (v.k = 'code' AND trim(s.code) = v.key) OR (v.k = 'name' AND trim(s.name) = v.key);
