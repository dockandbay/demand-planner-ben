-- 158_po_change_log.sql
-- PO timeline "record of change" (audit log). Every tracked edit on a purchase order — status,
-- production end date, shipment assignment, deposit assignment, any payment entered — plus ERP
-- uploads, is recorded here and shown inline in the PO timeline (distinct from supplier notes),
-- newest-first, with the date/time and the user who made the change.
CREATE TABLE IF NOT EXISTS planner.po_change_log (
  id          bigserial PRIMARY KEY,
  po          text NOT NULL,
  event       text NOT NULL,          -- e.g. 'Status', 'Production end date', 'Uploaded to ERP'
  detail      text,                   -- e.g. 'Production → Shipping', '2026-08-01 → 2026-08-14', '12 lines'
  changed_by  text,                   -- app_permissions email (local dev / no-auth = null)
  changed_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS po_change_log_po_idx ON planner.po_change_log (po, changed_at DESC);
