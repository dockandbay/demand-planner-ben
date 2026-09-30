-- 318_distributor_offers.sql  (v28.099, Ben)
-- Distributor discount matrix off WHOLESALE price, per market/channel and delivery method (FOB = pick up in China
-- port / Shanghai, EXW = we ship direct to them, 3PL = they order from our warehouse stock). Seeded from
-- COUNTRY-DISTRIBUTOR OFFERS.csv. Wholesale = ex-tax retail / 2; distributor price = wholesale × (1 - discount).
CREATE TABLE IF NOT EXISTS planner.distributor_offers (
  name          text PRIMARY KEY,          -- market/channel key: AU, UKWS, USWS, EUWS
  fob_discount  numeric,                    -- % off wholesale for FOB (Shanghai pickup)
  exw_discount  numeric,                    -- % off wholesale for EXW (we ship direct)
  threepl_discount numeric,                 -- % off wholesale for 3PL (order from our warehouse stock)
  updated_at    timestamptz NOT NULL DEFAULT now()
);
INSERT INTO planner.distributor_offers (name, fob_discount, exw_discount, threepl_discount) VALUES
  ('AU',   44, NULL, NULL),
  ('UKWS', NULL, NULL, NULL),
  ('USWS', 40, 30, NULL),
  ('EUWS', 40, 30, 15)
ON CONFLICT (name) DO UPDATE SET fob_discount=excluded.fob_discount, exw_discount=excluded.exw_discount, threepl_discount=excluded.threepl_discount, updated_at=now();
