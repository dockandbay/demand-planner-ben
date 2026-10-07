-- 334_so_supplier_pushes.sql
-- v28.192 (Ben): audit for SUPPLY > Purchase Orders > Direct to Client > "Validate sales order".
-- One row per Fulfil sales-order line whose drop-ship supplier HORIZON tried to write (ok / failed / blocked), with
-- the old and new supplier, who pushed it and against which Fulfil env. A dedicated table rather than po_change_log:
-- that log is keyed to a HORIZON PO and shown on PO timelines, whereas these rows belong to a Fulfil sale line.
CREATE TABLE IF NOT EXISTS planner.so_supplier_pushes (
  id               bigserial PRIMARY KEY,
  sale_id          bigint NOT NULL,          -- Fulfil sale.sale id
  sale_number      text,                     -- e.g. SO59854
  line_id          bigint NOT NULL,          -- Fulfil sale.line id
  sku              text,
  old_supplier_id  bigint,                   -- Fulfil party id before the push (null = none)
  old_supplier     text,
  new_supplier_id  bigint,
  new_supplier     text,
  result           text NOT NULL,            -- 'ok' | 'failed' | 'blocked'
  message          text,                     -- Fulfil's message / block reason
  fulfil_env       text,                     -- 'live' | 'sandbox'
  stub             boolean NOT NULL DEFAULT false,   -- true = test stub, nothing sent to Fulfil
  pushed_by        text,
  pushed_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS so_supplier_pushes_sale_idx ON planner.so_supplier_pushes (sale_id, pushed_at DESC);
