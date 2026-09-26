-- 163: Fulfil stock.location id per branch (warehouse mapping for the Fulfil PO push).
-- Branch names don't match Fulfil warehouse codes 1:1 (country-prefixed, many→few), so the push resolves
-- the receiving warehouse from this explicit id. Entered via CONFIG ▸ Branches (Fulfil ERP ID field).
-- Non-Fulfil branches (FBA/AWD/Direct to Client/Manufacturing/Head Office/Preorder) stay NULL.
-- IMPORTANT: the id VALUES are environment-specific (sandbox stock.location ids ≠ live). Do NOT seed values
-- in this migration — set them per environment in CONFIG ▸ Branches. (Sandbox was seeded separately:
-- UK ILG/EU ILG=16, EU iFulfillment=20, US Geneva=24, AU Coghlans=28.)
ALTER TABLE planner.branches ADD COLUMN IF NOT EXISTS fulfil_id text;
