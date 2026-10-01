-- Launch/NPD ramp Complex Rule (option B, SSM-native): coverage_type='launch_ramp' raises the SSM service level
-- for the first ramp_months after a SKU's launch, decaying to the tier SL.
ALTER TABLE planner.buy_complex_rules ADD COLUMN IF NOT EXISTS ramp_months integer;
ALTER TABLE planner.buy_complex_rules ADD COLUMN IF NOT EXISTS ramp_sl numeric;
