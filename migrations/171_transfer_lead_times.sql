-- 171: BUY & MOVE ▸ Transfer — inter-market (3PL→3PL) transfer lead times, in WEEKS, per lane (from → to).
-- Doubles as the list of lanes we actually run: a pair with NO row = we don't transfer that way, so the transfer
-- recommendations (Rebalance + Urgent) skip it. Symmetric for UK/US/EU; AU→US only (out of AU); CA is US→CA only.
CREATE TABLE IF NOT EXISTS planner.transfer_lead_times (
  from_market text NOT NULL,   -- 'UK' | 'US' | 'EU' | 'AU' | 'CA'
  to_market   text NOT NULL,
  weeks       numeric NOT NULL,
  updated_by  text,
  updated_at  timestamptz DEFAULT now(),
  PRIMARY KEY (from_market, to_market)
);
INSERT INTO planner.transfer_lead_times (from_market, to_market, weeks) VALUES
  ('UK','US',6),('UK','EU',2),('UK','AU',8),
  ('US','UK',6),('US','EU',6),('US','AU',8),('US','CA',2),
  ('EU','UK',2),('EU','US',6),('EU','AU',8),
  ('AU','US',8)
ON CONFLICT (from_market, to_market) DO NOTHING;
