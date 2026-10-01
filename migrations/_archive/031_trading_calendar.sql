-- 031_trading_calendar.sql — trading / event calendar (v20.84)
--
-- Key trading events, marketing moments, price activity and wholesale windows by date × market — the
-- overlay that explains demand phasing & in-season triggers. Editable in DEMAND ▸ Calendar (+ CSV up/down).
CREATE TABLE IF NOT EXISTS planner.trading_calendar (
  id         bigserial PRIMARY KEY,
  event_date date,
  market     text,        -- 'ALL' | 'UK' | 'US' | 'EU' | 'AU'
  event_type text,        -- 'Key Event' | 'Marketing' | 'Price' | 'Wholesale' | 'Launch' | ...
  title      text,
  notes      text,
  updated_at timestamptz DEFAULT now()
);
