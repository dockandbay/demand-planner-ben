-- ROLLBACK for the 07-Sep-26 FBA run-off smoothing write (Towel - Beach SEASONAL, UK + US FBA, Sep to Nov 2026).
-- What was written: 207 rows in planner.forecast_outputs (28 UK SKUs + 41 US SKUs x 3 months), source = 'script_fba_smooth_2026-09-07'.
-- Backup taken BEFORE the write: planner.forecast_outputs_bak_20260907_fba_smooth (567 rows = every uk_fba / us_fba row for the
-- sub-category in Sep to Nov 2026, a superset of the rows changed). Live project oolwklahstnvocaugryg.
--
-- Option A (preferred): restore units / source / updated_at from the backup for exactly the rows the script touched.
UPDATE planner.forecast_outputs f
   SET units = b.units, source = b.source, updated_at = b.updated_at
  FROM planner.forecast_outputs_bak_20260907_fba_smooth b
 WHERE b.sku = f.sku AND b.warehouse = f.warehouse AND b.channel = f.channel AND b.month = f.month
   AND f.source = 'script_fba_smooth_2026-09-07';
-- Rows the script INSERTED that had no row before (none expected: every eligible SKU already had a saved row) would be removed by:
-- DELETE FROM planner.forecast_outputs f WHERE f.source = 'script_fba_smooth_2026-09-07'
--   AND NOT EXISTS (SELECT 1 FROM planner.forecast_outputs_bak_20260907_fba_smooth b WHERE b.sku=f.sku AND b.warehouse=f.warehouse AND b.channel=f.channel AND b.month=f.month);
--
-- Verify: SELECT count(*) FROM planner.forecast_outputs WHERE source='script_fba_smooth_2026-09-07';  -- expect 0 after rollback
-- Housekeeping (only once nobody needs the rollback): DROP TABLE planner.forecast_outputs_bak_20260907_fba_smooth;
--
-- Option B (if the backup table is gone): previous units per SKU as Sep/Oct/Nov, source was 'review_ui'
-- (UK saved 07-Sep-26 00:05, US saved 02-Sep-26 01:05). Re-enter with an UPDATE per SKU x month.
-- uk_fba: TOWLB-COLLAB-LG-UNO:0/0/0 TOWLB-COLLAB-XL-UNO:0/0/0 TOWLB-DES-LG-4SET-CLBHSE:0/0/0 TOWLB-DES-LG-4SET-MEDMOMT:0/0/0 TOWLB-DES-LG-4SET-POSPARA:1/0/0 TOWLB-DES-LG-4SET-SUNTROP:1/0/0 TOWLB-DES-LG-6SET-PALPARA:0/0/0 TOWLB-DES-LG-GRECSHR:55/13/74 TOWLB-DES-LG-IBZAGLW:28/7/30 TOWLB-DES-LG-KARMA:28/7/30 TOWLB-DES-LG-SWTESC:14/3/15 TOWLB-DES-LG-TANTIDE:31/7/32 TOWLB-DES-LG-WTRSUG:46/10/46 TOWLB-DES-LG-WYWH:18/5/19 TOWLB-DES-XL-4SET-CLBHSE:0/0/0 TOWLB-DES-XL-4SET-POSPARA:0/0/0 TOWLB-DES-XL-GRECSHR:81/19/54 TOWLB-DES-XL-IBZAGLW:34/8/18 TOWLB-DES-XL-KARMA:1/0/0 TOWLB-DES-XL-SWTESC:0/0/0 TOWLB-DES-XL-WTRSUG:32/8/28 TOWLB-DES-XL-WYWH:20/5/20 TOWLB-KID-LG-SKATER:0/0/0 TOWLB-KID-MD-CHECKOUT:0/0/0 TOWLB-KID-MD-GVCLUB:0/0/0 TOWLB-KID-MD-INTOWILD:0/0/0 TOWLB-KID-MD-JELLY:0/0/0 TOWLB-KID-MD-SKATER:3/0/0
-- us_fba: TOWLB-COLLAB-LG-SOCCER:0/0/0 TOWLB-COLLAB-LG-UNO:7/3/8 TOWLB-COLLAB-XL-SOCCER:0/0/0 TOWLB-COLLAB-XL-UNO:3/1/6 TOWLB-DES-LG-4SET-CLBHSE:0/0/0 TOWLB-DES-LG-4SET-ENDSUMR:12/5/14 TOWLB-DES-LG-4SET-POSPARA:0/0/0 TOWLB-DES-LG-4SET-SUNTROP:1/0/1 TOWLB-DES-LG-6SET-PALPARA:0/0/0 TOWLB-DES-LG-BLUSPRIT:0/0/0 TOWLB-DES-LG-IBZAGLW:17/8/20 TOWLB-DES-LG-KARMA:13/6/15 TOWLB-DES-LG-SWTESC:5/2/7 TOWLB-DES-LG-TANTIDE:9/4/11 TOWLB-DES-LG-VITSEA:16/7/10 TOWLB-DES-LG-WTRSUG:25/11/29 TOWLB-DES-LG-WYWH:7/3/9 TOWLB-DES-XL-4SET-CLBHSE:0/0/0 TOWLB-DES-XL-4SET-ENDSUMR:2/1/2 TOWLB-DES-XL-4SET-POSPARA:0/0/0 TOWLB-DES-XL-4SET-PRTYPNK:0/0/0 TOWLB-DES-XL-FRUTLPS:12/5/31 TOWLB-DES-XL-GRECSHR:0/0/0 TOWLB-DES-XL-GTTLINES:0/0/0 TOWLB-DES-XL-IBZAGLW:11/5/13 TOWLB-DES-XL-KARMA:14/6/16 TOWLB-DES-XL-PPVIBES:0/0/0 TOWLB-DES-XL-SWTESC:10/4/12 TOWLB-DES-XL-VITSEA:0/0/0 TOWLB-DES-XL-WTRSUG:17/7/19 TOWLB-DES-XL-WYWH:8/3/9 TOWLB-KID-LG-CHECKOUT:0/0/0 TOWLB-KID-LG-GVCLUB:0/0/0 TOWLB-KID-LG-INTOWILD:3/0/0 TOWLB-KID-LG-JELLY:1/0/0 TOWLB-KID-LG-SKATER:0/0/0 TOWLB-KID-MD-CHECKOUT:0/0/0 TOWLB-KID-MD-GVCLUB:0/0/0 TOWLB-KID-MD-INTOWILD:0/0/0 TOWLB-KID-MD-JELLY:0/0/0 TOWLB-KID-MD-SKATER:0/0/0
