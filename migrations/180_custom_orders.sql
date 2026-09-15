-- 180_custom_orders.sql — SUG-0015 (custom orders), first slice.
-- (1) A product development gets an APPROVAL METHOD: 'photo' (approve from photos — no physical sample) or
--     'samples' (send samples; where-to-send reuses the existing recipient_countries / 2nd recipient). Shown in
--     the supplier portal so the supplier knows how sign-off happens.
-- (2) A custom-order PO (purchase_orders.dtc_custom, on the Direct Client / FBA tab) can OPTIONALLY link to the
--     product development it's for, via custom_dev_ref → product_dev_items.ref. Surfaced on the supplier portal.
-- Both additive/nullable.

ALTER TABLE planner.product_dev_items
  ADD COLUMN IF NOT EXISTS approval_method text;   -- 'photo' | 'samples' (null = not set)

ALTER TABLE planner.purchase_orders
  ADD COLUMN IF NOT EXISTS custom_dev_ref text;    -- → product_dev_items.ref (the custom order's product development)
