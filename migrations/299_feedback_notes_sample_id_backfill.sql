-- 299 (v27.863, Ben): auto-tag the sample version on the product timeline.
-- Feedback notes read "Feedback on <item_ref>_v<N> · <component>: …". Going forward upsert-feedback stamps
-- supplier_notes.sample_id (so the timeline shows the "🧪 v2" chip with no manual tagging). This backfills the
-- sample_id on existing feedback notes so history is tagged too. The sample version is the product-dimension
-- sample row (coalesce(dimension,'product')='product'), which is what the samples list / chip picker use.

BEGIN;

-- 1) Precise: the note is already scoped to a supplier (mig 298) — match that supplier's request sample.
UPDATE planner.supplier_notes n
SET sample_id = ps.id
FROM planner.product_dev_samples ps
JOIN planner.product_dev_requests r ON r.id = ps.request_id
WHERE n.author_kind = 'internal'
  AND n.sample_id IS NULL
  AND n.po = ps.item_ref
  AND coalesce(ps.dimension,'product') = 'product'
  AND n.supplier_id IS NOT NULL
  AND n.supplier_id = r.supplier_id
  AND n.body LIKE 'Feedback on ' || ps.item_ref || '_v' || ps.version || ' · %';

-- 2) Fallback: no supplier scope on the note, but (item_ref, version) maps to exactly one product sample version.
UPDATE planner.supplier_notes n
SET sample_id = sub.sid
FROM (
  SELECT ps.item_ref, ps.version, max(ps.id) AS sid
  FROM planner.product_dev_samples ps
  WHERE coalesce(ps.dimension,'product') = 'product'
  GROUP BY ps.item_ref, ps.version
  HAVING count(*) = 1
) sub
WHERE n.author_kind = 'internal'
  AND n.sample_id IS NULL
  AND n.po = sub.item_ref
  AND n.body LIKE 'Feedback on ' || sub.item_ref || '_v' || sub.version || ' · %';

COMMIT;
