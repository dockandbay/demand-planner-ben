-- migration 415
-- 415_geneva_stock_rebaseline.sql (v28.682, Ben 04-Nov-26): the ILG daily stock report + rebaseline (migration 399) extended to US Geneva.
-- Geneva emails two CSVs to ops@ daily (reports@geneva10.com: DockandBayInventoryWithOutOfStock / DockAndBayDailyInventoryReport);
-- VersionID STD = Fulfil "US Geneva STD" (pool US), FBA = "US Geneva FBA" (pool US_NG). Same tables, a site column on the reports and two
-- more pools on the rebaseline batches. Additive: existing rows default to site ILG.
ALTER TABLE planner.ilg_stock_reports ADD COLUMN IF NOT EXISTS site text NOT NULL DEFAULT 'ILG';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ilg_stock_reports_site_check') THEN
    ALTER TABLE planner.ilg_stock_reports ADD CONSTRAINT ilg_stock_reports_site_check CHECK (site IN ('ILG','GENEVA'));
  END IF;
END $$;
DROP INDEX IF EXISTS planner.ilg_stock_reports_at_ix;
CREATE INDEX IF NOT EXISTS ilg_stock_reports_site_at_ix ON planner.ilg_stock_reports (site, report_at DESC);
ALTER TABLE planner.ilg_rebaseline_batches DROP CONSTRAINT IF EXISTS ilg_rebaseline_batches_pool_check;
ALTER TABLE planner.ilg_rebaseline_batches ADD CONSTRAINT ilg_rebaseline_batches_pool_check CHECK (pool IN ('UK','UK_NG','UK_VD','US','US_NG'));
