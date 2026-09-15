-- 179_fba_pending_transfers.sql
-- Recently-processed Cin7 branch transfers INTO the FBA/AWD branches that haven't yet appeared in the normal
-- inbound feed (planner.inbound_shipments). When the team processes an FBA transfer in Cin7 it isn't reflected
-- as inbound straight away, so the FBA transfer recommendation wrongly re-suggests it. This cache is imported
-- from Cin7 /BranchTransfers (approved, created in the last 48h, dest branch in the FBA/AWD set), viewable on
-- the FBA tab, and folded into FBA on-order/AWD cover — deduped against inbound_shipments by reference.
--
-- Branch IDs (from the live Cin7 Branches call): UK FBA 5052, US FBA 5056, AU FBA 16289, US AWD 27816, EU FBA 10879.
-- A row is pruned once its reference lands in inbound_shipments or the transfer is received.

CREATE TABLE IF NOT EXISTS planner.fba_pending_transfers (
  cin7_id          bigint      NOT NULL,   -- Cin7 BranchTransfer id
  sku              text        NOT NULL,   -- line item code
  qty              numeric,                -- ordered qty (qtyTransferred is 0 until received)
  reference        text,                   -- e.g. FBA19KQWKQVN — SAME key inbound_shipments.reference uses
  source_branch_id int,
  dest_branch_id   int,
  market           text,                   -- uk | us | eu | au
  pool             text,                   -- 'fba' | 'awd'
  warehouse        text,                   -- <market>_<pool>, e.g. us_fba / us_awd (matches inbound destination_warehouse)
  stage            text,
  eta              date,                   -- approvalDate (Ben: the expected delivery date)
  created_date     timestamptz,
  dispatched_date  timestamptz,
  received_date    timestamptz,
  imported_at      timestamptz DEFAULT now(),
  PRIMARY KEY (cin7_id, sku)
);
CREATE INDEX IF NOT EXISTS fba_pending_transfers_ref  ON planner.fba_pending_transfers (reference);
CREATE INDEX IF NOT EXISTS fba_pending_transfers_skuwh ON planner.fba_pending_transfers (sku, warehouse);
