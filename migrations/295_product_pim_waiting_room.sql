-- 295_product_pim_waiting_room.sql
-- Approved products waiting room (Ben, phase 3): when a product SIZE with a WORKING SKU is "pushed to PIM", a row lands
-- here — a Horizon staging list of new-product requests (SKU + barcode + colourway) held for later PIM (Airtable) entry.
-- No Airtable write happens; this is purely an in-Horizon report under PRODUCT ▸ REPORTS. One row per source size.
CREATE TABLE IF NOT EXISTS planner.product_pim_waiting_room (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  size_id      bigint UNIQUE,                       -- source planner.product_dev_sizes.id
  item_ref     text,                                -- product_dev_items.ref
  working_sku  text,
  barcode      text,
  colourway    text,
  size_label   text,
  product_name text,
  category     text,
  status       text NOT NULL DEFAULT 'waiting',     -- waiting | in_pim | dropped
  pushed_by    text,
  pushed_at    timestamptz DEFAULT now(),
  notes        text
);
CREATE INDEX IF NOT EXISTS product_pim_waiting_room_status ON planner.product_pim_waiting_room (status);
