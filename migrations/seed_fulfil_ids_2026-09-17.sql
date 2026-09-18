-- Seed Fulfil party/location ids — LIVE tenant (dockandbay.fulfil.io). Apply to PROD (Diviyaj).
-- Generated 17-Sep-2026 from POST /api/supply/fulfil/seed-ids?env=live — ONLY ids that resolved on LIVE by exact name.
-- Re-runnable; sets only the named rows. Unresolved (need manual mapping / name fix): see comments below.

BEGIN;
UPDATE planner.suppliers SET fulfil_id='70519' WHERE name='Bright Eagle (Rebecca)';
UPDATE planner.suppliers SET fulfil_id='70523' WHERE name='DHL AU';
UPDATE planner.suppliers SET fulfil_id='70527' WHERE name='Huzhou Double Qing (Ribbon)';
UPDATE planner.suppliers SET fulfil_id='70517' WHERE name='Lixin';
UPDATE planner.suppliers SET fulfil_id='70528' WHERE name='Nice Look';
UPDATE planner.suppliers SET fulfil_id='70526' WHERE name='Shaoxing Fengying (Belinda)';
UPDATE planner.suppliers SET fulfil_id='70525' WHERE name='Spectas';
UPDATE planner.suppliers SET fulfil_id='70524' WHERE name='Transfer';
UPDATE planner.suppliers SET fulfil_id='70520' WHERE name='Weierken';
UPDATE planner.suppliers SET fulfil_id='70516' WHERE name='XR Textile';

UPDATE planner.branches  SET fulfil_id='28' WHERE name='AU Coghlans';
UPDATE planner.branches  SET fulfil_id='165' WHERE name='China Stock';
UPDATE planner.branches  SET fulfil_id='20' WHERE name='EU iFulfillment';
UPDATE planner.branches  SET fulfil_id='16' WHERE name='UK ILG';
UPDATE planner.branches  SET fulfil_id='36' WHERE name='US AWD';
UPDATE planner.branches  SET fulfil_id='24' WHERE name='US Geneva';
COMMIT;

-- UNRESOLVED on live (NOT seeded — confirm the Fulfil name or that they need no Fulfil id):
--   suppliers: ACME Ltd, Chilly Bottles, Foamie, Forming Reality, Fresh Fabrics Ltd, Jinma (Merry), Kangxun (Doris), Lixinggg, MQ Print (Sherry), ZZ Test
--   branches:  AU FBA, CA FBA, CA Propack, Direct to Client, Dubai, EU ILG, Manufacturing, UK B2B JLEW, UK B2B NEXT, UK FBA, UK Head Office, UK Preorder, US FBA
