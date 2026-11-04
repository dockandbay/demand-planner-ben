-- migration 416
-- 416_buy_urgent_snoozes.sql (v28.693, Ben 04-Nov-26): snooze an Urgent buy on the BUY grid for 30 days or indefinitely, per SKU x market.
-- until NULL = indefinite; a row past its until date is simply ignored (the urgent comes back). One row per SKU x market.
CREATE TABLE IF NOT EXISTS planner.buy_urgent_snoozes (
  sku         text NOT NULL,
  market      text NOT NULL,
  until       date,
  urgent_qty  integer,
  snoozed_by  text,
  snoozed_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (sku, market)
);
