-- 111_crossdock_notes.sql
-- Manual notes for the Crossdock report (PURCHASE ORDERS ▸ CROSSDOCK): a free-text note on crossdock/preorder
-- stock the app can't attribute to a PO / preorder / assigned crossdock PO. One note per warehouse × SKU.
-- The note is auto-wiped by the report endpoint once that SKU's on-hand + inbound in that warehouse returns
-- to 0 (i.e. the stock has shipped out).

CREATE TABLE IF NOT EXISTS planner.crossdock_notes (
  warehouse   text NOT NULL,
  sku         text NOT NULL,
  note        text,
  updated_by  text,
  updated_at  timestamptz DEFAULT now(),
  PRIMARY KEY (warehouse, sku)
);
