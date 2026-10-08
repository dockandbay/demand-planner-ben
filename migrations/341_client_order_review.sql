-- v28.227 (Ben): client portal orders are held for staff review before they reach Fulfil.
--   planner.app_settings 'cp_auto_push_fulfil' ('false' default) = global switch: true posts a Fulfil draft on submit (old behaviour).
--   clients.order_review = per-client override: inherit (use the global switch) | review (always hold) | auto (always post).
--   client_orders.status gains 'review' (awaiting staff review) and 'cancelled'. Lines jsonb gains per line:
--     mode 'ship' | 'backorder' | 'dropship', supplier_id (Fulfil party id), supplier_name.
--   Header gains the Fulfil carrier + service picked in review, an internal note, push audit and an edit history.
ALTER TABLE planner.clients ADD COLUMN IF NOT EXISTS order_review text NOT NULL DEFAULT 'inherit';
ALTER TABLE planner.client_orders
  ADD COLUMN IF NOT EXISTS carrier_id           bigint,
  ADD COLUMN IF NOT EXISTS carrier_name         text,
  ADD COLUMN IF NOT EXISTS carrier_service_id   bigint,
  ADD COLUMN IF NOT EXISTS carrier_service_name text,
  ADD COLUMN IF NOT EXISTS internal_note        text,
  ADD COLUMN IF NOT EXISTS pushed_by            text,
  ADD COLUMN IF NOT EXISTS pushed_at            timestamptz,
  ADD COLUMN IF NOT EXISTS history              jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_by           text,
  ADD COLUMN IF NOT EXISTS updated_at           timestamptz;
CREATE INDEX IF NOT EXISTS client_orders_status_idx ON planner.client_orders(status) WHERE status IN ('review','submitted','error');
