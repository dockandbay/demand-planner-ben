-- 145: supplier portal users can opt in to payment-confirmed notifications.
-- When true, that portal user receives a "Payment confirmed" event in the portal RECENTS drawer and an email
-- when a payment run is confirmed as paid (bank amount + bank currency applied in the Payments Report).
-- Default false — nobody is notified until explicitly switched on in CONFIG ▸ Portal users.
ALTER TABLE planner.supplier_portal_users
  ADD COLUMN IF NOT EXISTS receive_payment_notification boolean NOT NULL DEFAULT false;
