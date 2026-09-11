-- 246_branches_returns_pct.sql — per-branch returns % (drives the "add polybags to order" tool on the PO order plan).
-- Seed 1.5% for the four 3PL branches only; all other branches stay NULL (= no polybags prompt).
ALTER TABLE planner.branches ADD COLUMN IF NOT EXISTS returns_pct numeric;

UPDATE planner.branches SET returns_pct = 1.5
WHERE name IN ('UK ILG', 'US Geneva', 'AU Coghlans', 'EU iFulfillment');
