-- SUG-0019: split "use from" into two layers — effective_when (production|immediate) + effective_stock (useup|dispose).
ALTER TABLE planner.product_specs ADD COLUMN IF NOT EXISTS effective_when text;
ALTER TABLE planner.product_specs ADD COLUMN IF NOT EXISTS effective_stock text;
UPDATE planner.product_specs
  SET effective_when  = COALESCE(effective_when,  CASE WHEN effective_mode='production' THEN 'production' ELSE 'immediate' END),
      effective_stock = COALESCE(effective_stock, CASE WHEN effective_mode='immediate_dispose' THEN 'dispose' ELSE 'useup' END)
  WHERE effective_when IS NULL OR effective_stock IS NULL;
