-- 336_client_order_threads.sql  (v28.200 (Ben), 07-Oct-2026): messages and documents per CLIENT ORDER.
-- One thread per (client, order), created on the first message or document; it is an ordinary client thread, so it also shows in
-- CLIENT > Messages (admin) and Messages (portal), tagged with the order ref. Additive, idempotent.
--
-- order_key = the stable order identity both /orders views use:
--   'F<fulfil_id>'        a row of the Fulfil sales mirror (planner.fulfil_sales.fulfil_id)
--   'P<client_orders.id>' a portal submission not yet in the mirror; once its Fulfil draft reaches the mirror (client_orders.fulfil_number
--                         = fulfil_sales.number) the server resolves the same thread from the mirror row, so the conversation follows it.
-- order_ref = the display ref at link time (the order may be re-keyed in Fulfil later; the key, not the ref, is authoritative).

ALTER TABLE planner.client_threads
  ADD COLUMN IF NOT EXISTS order_key text,
  ADD COLUMN IF NOT EXISTS order_ref text;
CREATE UNIQUE INDEX IF NOT EXISTS client_threads_order_uidx ON planner.client_threads(client_id, order_key) WHERE order_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS client_threads_order_key_idx ON planner.client_threads(order_key) WHERE order_key IS NOT NULL;

-- Staff-only message / document ("internal": never shown to, counted for, or downloadable by the client). Default false = shared,
-- so every existing message keeps its meaning.
ALTER TABLE planner.client_messages
  ADD COLUMN IF NOT EXISTS internal boolean NOT NULL DEFAULT false;
