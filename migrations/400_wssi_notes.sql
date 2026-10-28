-- 400_wssi_notes.sql (v28.559, Ben 28-Oct-26): notes on DEMAND ▸ WSSI cells. A note sits on a WSSI row and a column (a month 'YYYY-MM', a
-- period H1 / H2 / YTD / YTG / FY, or '' = the whole row) in the filter view it was written in (market, channel, category group, seasonality,
-- product status; empty array = All). It shows in that view and in the views above it (tagged with where it came from). Additive.
CREATE TABLE IF NOT EXISTS planner.wssi_notes (
  id          bigserial PRIMARY KEY,
  fy          int     NOT NULL,                    -- financial year start (2026 = FY27, Mar-26 to Feb-27)
  row_key     text    NOT NULL,                    -- WSSI row key (e.g. units, clU, otbU)
  col         text    NOT NULL DEFAULT '',
  mkt         text[]  NOT NULL DEFAULT '{}',
  ch          text[]  NOT NULL DEFAULT '{}',
  cat         text[]  NOT NULL DEFAULT '{}',
  sea         text[]  NOT NULL DEFAULT '{}',
  st          text[]  NOT NULL DEFAULT '{}',
  body        text    NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  created_by  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wssi_notes_fy_idx ON planner.wssi_notes (fy);
REVOKE ALL ON planner.wssi_notes FROM anon, authenticated;
