-- 298 (v27.857, Ben): scope the product timeline per supplier.
-- planner.supplier_notes already has supplier_id; going forward it's stamped on every request-level note
-- (acceptance, sample submission, request creation, feedback). This backfills the derivable existing notes so
-- the timeline for a supplier's development request stops showing OTHER suppliers' events.
-- A product-dev ITEM has no supplier, so item-level notes (e.g. "created a new product development item") stay
-- supplier_id NULL = product-wide, and still show on every supplier's timeline. That is intentional.

BEGIN;

-- 1) "Accepted the development request" — match to the request by the accepting user + item.
UPDATE planner.supplier_notes n
SET supplier_id = r.supplier_id
FROM planner.product_dev_requests r
JOIN planner.product_dev_items i ON i.id = r.item_id
WHERE n.po = i.ref
  AND n.supplier_id IS NULL
  AND n.body = 'Accepted the development request'
  AND lower(coalesce(r.supplier_accepted_by,'')) = lower(coalesce(n.author_email,''))
  AND r.supplier_id IS NOT NULL;

-- 2) "<user> created development request <REF> for <supplier> …" — the body carries the request ref.
UPDATE planner.supplier_notes n
SET supplier_id = r.supplier_id
FROM planner.product_dev_requests r
JOIN planner.product_dev_items i ON i.id = r.item_id
WHERE n.po = i.ref
  AND n.supplier_id IS NULL
  AND r.supplier_id IS NOT NULL
  AND n.body LIKE '%created development request ' || r.ref || ' %';

-- 3) Older submission notes "<supplier> submitted sample …" — the body starts with the supplier name.
UPDATE planner.supplier_notes n
SET supplier_id = s.id
FROM planner.suppliers s
WHERE n.supplier_id IS NULL
  AND n.author_kind = 'supplier'
  AND n.body LIKE s.name || ' submitted sample%';

-- 4) Feedback notes "Feedback on <item_ref>_vN · …" — scope only where that (item, version) maps to ONE supplier.
--    (Versions number per request, so vN can exist for two suppliers; those stay NULL/merged to avoid misattribution.)
UPDATE planner.supplier_notes n
SET supplier_id = sub.supplier_id
FROM (
  SELECT ps.item_ref, ps.version, max(r.supplier_id) AS supplier_id
  FROM planner.product_dev_samples ps
  JOIN planner.product_dev_requests r ON r.id = ps.request_id
  WHERE r.supplier_id IS NOT NULL
  GROUP BY ps.item_ref, ps.version
  HAVING count(DISTINCT r.supplier_id) = 1
) sub
WHERE n.supplier_id IS NULL
  AND n.po = sub.item_ref
  AND n.body LIKE 'Feedback on ' || sub.item_ref || '_v' || sub.version || ' · %';

COMMIT;
