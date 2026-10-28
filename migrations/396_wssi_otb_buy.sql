-- 396_wssi_otb_buy.sql (v28.547, Ben 28-Oct-26, WSSI phase 2 from Kathryn's template): open to buy ("Proposed") = buys planned but not yet
-- placed as a PO, by month x market x channel x category group, entered as UNITS or £ RETAIL (the other is worked out from that month's selling
-- price). It shrinks by the value of matching POs (same market, channel, category group and arrival month) that reach Production after the buy
-- was first entered (created_at). Replaces planner.wssi_otb (migration 388, £ cost by market x channel, never used on live). Additive.
CREATE TABLE IF NOT EXISTS planner.wssi_otb_buy (
  month        date    NOT NULL,                  -- 1st of the month (arrival month)
  market       text    NOT NULL,                  -- UK / US / EU / AU / CA
  channel      text    NOT NULL,                  -- DTC / B2B / FBA / ZAL / TIK
  cgroup       text    NOT NULL,                  -- category group (Beach Towels, Beauty, Ponchos, Picnic & Outdoor, Bags, Home, Other)
  entered_as   text    NOT NULL CHECK (entered_as IN ('units','retail')),
  value        numeric NOT NULL,                  -- units, or £ retail (ex VAT)
  note         text,
  created_at   timestamptz NOT NULL DEFAULT now(),  -- POs reaching Production after this count against it
  created_by   text,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  updated_by   text,
  PRIMARY KEY (month, market, channel, cgroup)
);
REVOKE ALL ON planner.wssi_otb_buy FROM anon, authenticated;
