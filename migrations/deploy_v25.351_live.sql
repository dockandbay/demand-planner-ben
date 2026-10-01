-- deploy_v25.351_live.sql
-- Combined live migration for the v25.326→v25.351 deploy (live baseline v25.325).
-- Migrations 099 + 100 are already on live; this runs the two outstanding ones (101 + 102) in one pass.
-- Idempotent (ADD COLUMN IF NOT EXISTS; UPDATE by name). Safe to run once.

BEGIN;

-- 101: supplier-set production status on sample requests (not_started / in_production / ready_to_ship / shipped)
ALTER TABLE planner.sample_requests ADD COLUMN IF NOT EXISTS production_status text;

-- 102: store each supplier's Cin7 contact (member) id so the Cin7 PO push links the supplier reliably and can
-- re-assert the link on updates. Seeded for single-match suppliers only; the rest stay NULL (name-lookup fallback).
ALTER TABLE planner.suppliers ADD COLUMN IF NOT EXISTS cin7_member_id bigint;

UPDATE planner.suppliers s SET cin7_member_id = v.mid FROM (VALUES
  ('Bright Eagle (Rebecca)', 5047),
  ('Foamie', 10779),
  ('Forming Reality', 22792),
  ('Huzhou Double Qing (Ribbon)', 23467),
  ('Kangxun (Doris)', 5049),
  ('Lixin', 25909),
  ('MQ Print', 19927),
  ('Nice Look', 28775),
  ('Weireken', 22962)
) AS v(name, mid) WHERE s.name = v.name;
-- Still NULL (multiple/zero Cin7 contacts — set manually): Ballast, Spectas, Jinma (Merry), XR Textile,
-- Chilly Bottles, Shaoxing Fengying (Belinda), ZZ Test.

COMMIT;
