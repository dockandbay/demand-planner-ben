-- 152: supplier must declare which aspects of the product a sample covers.
-- When a supplier submits a new sample version in the portal they now tick which components the sample
-- represents (product, packaging, labels, polybag, other). Stored as a text[] of dimension keys.
ALTER TABLE planner.product_dev_samples ADD COLUMN IF NOT EXISTS sampled_aspects text[];
