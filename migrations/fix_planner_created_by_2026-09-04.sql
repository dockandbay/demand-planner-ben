-- ONE-OFF DATA FIX (not a schema migration) — relabel sample requests wrongly attributed to the literal
-- 'planner'. Cause was the old client/server default of created_by='planner' (fixed in code v27.433). The true
-- creator wasn't captured, so these are relabelled to the generic 'Dock & Bay' (Ben's call). Safe + idempotent.
-- LIVE: ~9 sample_requests + ~8 notes affected (as of 2026-09-04). Diviyaj to run on production.

UPDATE planner.sample_requests
   SET created_by = 'Dock & Bay', updated_at = now()
 WHERE lower(coalesce(created_by,'')) = 'planner';

UPDATE planner.sample_notes
   SET author_email = NULL, body = 'Dock & Bay created this sample request'
 WHERE lower(coalesce(author_email,'')) = 'planner'
    OR body ILIKE 'planner created%';
