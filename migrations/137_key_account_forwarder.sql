-- 137: Forwarder contact details on key accounts.
-- Saved per key account (CONFIG ▸ Key accounts). Surfaced read-only on a PO's Client/FBA tab and in the
-- supplier portal's Direct-to-Client tab by joining key_accounts on the PO's client name (live, not snapshotted).
ALTER TABLE planner.key_accounts
  ADD COLUMN IF NOT EXISTS forwarder_name  text,
  ADD COLUMN IF NOT EXISTS forwarder_email text,
  ADD COLUMN IF NOT EXISTS forwarder_phone text;
