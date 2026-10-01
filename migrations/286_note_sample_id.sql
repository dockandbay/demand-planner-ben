-- 286: link a product-timeline note to a specific development sample (v27.750, Ben — PRODUCT split P6).
--
-- The product Timeline compose gains a `/s` chip: pick a sample version and the note is tagged to it. The note
-- stays a normal product-timeline message AND surfaces on that sample's review thread. `sample_id` is the
-- structured link (replaces the team's habit of typing "sample 1/2" free-text). Nullable; existing notes unchanged.

ALTER TABLE planner.supplier_notes ADD COLUMN IF NOT EXISTS sample_id bigint;
CREATE INDEX IF NOT EXISTS supplier_notes_sample_id_idx ON planner.supplier_notes (sample_id) WHERE sample_id IS NOT NULL;
