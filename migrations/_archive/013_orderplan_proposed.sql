-- Migration 013 — Order Plan source-of-truth + proposed-adjustment persistence.
-- Model: erp_qty = ERP source of truth (Cin7/Fulfil); qty = our planned/proposed value.
-- A proposed change persists (qty <> erp_qty, proposed_at set) until it's pushed to the ERP and the
-- two align (Upload sets erp_qty := qty, clears proposed_at). An ERP re-sync must update erp_qty but
-- PRESERVE a still-pending proposed qty (handled in the ETL upsert; the one-time Cin7 load set both).
alter table planner.purchase_order_lines add column if not exists proposed_at timestamptz;
alter table planner.purchase_order_lines add column if not exists proposed_by text;
