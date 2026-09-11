-- OPTIONAL SEED — pre-written PRODUCT timeline quick phrases (Ben). Idempotent: skips any body already present.
INSERT INTO planner.product_timeline_snippets (body, sort, active)
SELECT v.body, v.sort, true FROM (VALUES
  ('currently the back and the front of the towel don’t match please make sure the colours are as the front / back', 100),
  ('Colours of the towel dont match the pantones provided please resample and match', 101),
  ('the artwork is not placed as per brief sheet', 102),
  ('the back is not aligned with the front', 103),
  ('the pouch doesnt match the towel', 104)
) AS v(body, sort)
WHERE NOT EXISTS (SELECT 1 FROM planner.product_timeline_snippets s WHERE s.body = v.body);
