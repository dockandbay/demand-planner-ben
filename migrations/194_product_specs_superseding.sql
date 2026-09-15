-- SUG-0019: superseding. A new spec with the same type + identical scope retires the prior one → it becomes a "past specification".
-- superseded_at set = superseded (kept, shown in Past list); active=false with superseded_at NULL = deleted (hidden).
ALTER TABLE planner.product_specs ADD COLUMN IF NOT EXISTS superseded_at timestamptz;
ALTER TABLE planner.product_specs ADD COLUMN IF NOT EXISTS superseded_by integer;
