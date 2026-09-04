-- 265: per-sample "Approved for photography" flag + optional comments.
-- A sample version can be signed off for photography independently of the bulk-approval decision; when ticked,
-- the reviewer can add notes (e.g. which colourway / angle is the hero, retouch instructions).

ALTER TABLE planner.product_dev_samples ADD COLUMN IF NOT EXISTS approved_for_photography boolean NOT NULL DEFAULT false;
ALTER TABLE planner.product_dev_samples ADD COLUMN IF NOT EXISTS photography_notes text;
