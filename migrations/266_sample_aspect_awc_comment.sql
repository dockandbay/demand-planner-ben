-- 266: "Approved with comments" gets its own comment field per sample × component (Ben, 07-Sep-26).
-- Additive; safe to re-run.
ALTER TABLE planner.product_sample_aspect_feedback ADD COLUMN IF NOT EXISTS awc_comment text;
COMMENT ON COLUMN planner.product_sample_aspect_feedback.awc_comment IS 'Comments attached to an approved_with_comments decision (separate from general feedback)';
