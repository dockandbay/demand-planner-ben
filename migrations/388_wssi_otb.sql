-- v28.487 (Ben 26-Oct-26): DEMAND ▸ Inputs ▸ Open to buy. Planned open-to-buy budget at cost (GBP) per month × market × channel,
-- entered by planners and read by DEMAND ▸ WSSI (OTB planned rows; adds to projected closing stock and OTB remaining).
-- Additive and idempotent. A row with otb_cost 0 is deleted rather than stored.
CREATE TABLE IF NOT EXISTS planner.wssi_otb (
  month       date    NOT NULL,                 -- 1st of the month
  market      text    NOT NULL,                 -- UK / US / EU / AU / CA
  channel     text    NOT NULL,                 -- DTC / B2B / FBA / ZAL / TIK
  otb_cost    numeric NOT NULL,                 -- £ at cost
  note        text,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  text,
  PRIMARY KEY (month, market, channel)
);
