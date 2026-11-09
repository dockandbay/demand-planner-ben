-- migration 425
-- v28.746 (Ben 09-Nov-26, Kathryn's WSSI round 2, release 2: overtyping). Lets the WSSI worksheet store:
--   Act/Fcst sales overtypes as £ (fc_sales), units (fc_units, existing) or ASP (fc_asp): the last two typed win, the third recalculates
--   price overtypes for forecast months: current selling price (price) and full price (full), £ ex VAT per unit
--   planned write-offs for forecast months as units (wo_units), £ retail (wo_retail) or £ cost (wo_cost); one per cell, can be negative
--   Planned ASP in the plan (asp), with who / when on every plan cell so the last typed of £ / units / ASP wins
--   Proposed (open to buy) entered as £ cost too
ALTER TABLE planner.wssi_overrides DROP CONSTRAINT IF EXISTS wssi_overrides_measure_check;
ALTER TABLE planner.wssi_overrides ADD CONSTRAINT wssi_overrides_measure_check
  CHECK (measure = ANY (ARRAY['fc_units'::text, 'target_units'::text, 'cover_wks'::text, 'cutoff'::text, 'fc_sales'::text, 'fc_asp'::text,
    'price'::text, 'full'::text, 'wo_units'::text, 'wo_retail'::text, 'wo_cost'::text]));

ALTER TABLE planner.wssi_plan_cells DROP CONSTRAINT IF EXISTS wssi_plan_cells_measure_check;
ALTER TABLE planner.wssi_plan_cells ADD CONSTRAINT wssi_plan_cells_measure_check
  CHECK (measure = ANY (ARRAY['sales'::text, 'units'::text, 'close'::text, 'asp'::text]));
ALTER TABLE planner.wssi_plan_cells ADD COLUMN IF NOT EXISTS updated_at timestamptz;
ALTER TABLE planner.wssi_plan_cells ADD COLUMN IF NOT EXISTS updated_by text;

ALTER TABLE planner.wssi_otb_buy DROP CONSTRAINT IF EXISTS wssi_otb_buy_entered_as_check;
ALTER TABLE planner.wssi_otb_buy ADD CONSTRAINT wssi_otb_buy_entered_as_check
  CHECK (entered_as = ANY (ARRAY['units'::text, 'retail'::text, 'cost'::text]));
