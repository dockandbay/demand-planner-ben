-- 102_supplier_cin7_member_id.sql
-- Store each supplier's Cin7 contact (member) id so the Cin7 PO push links the supplier reliably without
-- fragile name matching, and can re-assert the link on updates. Seeded from a Cin7 Contacts lookup by name
-- (single-match suppliers only). Ambiguous / no-match suppliers left NULL → push falls back to name lookup.
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
