-- 200_key_account_seller_entity.sql — which Dock & Bay entity is the SELLER on a client's Direct-to-Client
-- packing list (maps to CONFIG ▸ Consignees country: UK/US/EU/AU). Default UK.
ALTER TABLE planner.key_accounts ADD COLUMN IF NOT EXISTS seller_entity text DEFAULT 'UK';
