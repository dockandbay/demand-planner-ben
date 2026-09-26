-- 167: a sample shipment can carry a SECOND recipient + SECOND tracking code (e.g. one parcel to UK, one to AU).
ALTER TABLE planner.sample_requests
  ADD COLUMN IF NOT EXISTS recipient_company_2 text,
  ADD COLUMN IF NOT EXISTS first_name_2 text,
  ADD COLUMN IF NOT EXISTS last_name_2 text,
  ADD COLUMN IF NOT EXISTS address_line1_2 text,
  ADD COLUMN IF NOT EXISTS address_line2_2 text,
  ADD COLUMN IF NOT EXISTS city_2 text,
  ADD COLUMN IF NOT EXISTS region_2 text,
  ADD COLUMN IF NOT EXISTS postcode_2 text,
  ADD COLUMN IF NOT EXISTS country_2 text,
  ADD COLUMN IF NOT EXISTS phone_2 text,
  ADD COLUMN IF NOT EXISTS carrier_2 text,
  ADD COLUMN IF NOT EXISTS tracking_code_2 text;
