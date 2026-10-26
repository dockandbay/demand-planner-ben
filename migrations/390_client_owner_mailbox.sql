-- 390_client_owner_mailbox.sql (v28.502, Ben 26-Oct-26): every client account's owner = one of the four sales mailboxes; all staff emails
-- about the client go there. Backfill: key accounts -> keyaccounts@; UK / US / EU -> sales-uk@ / sales-us@ / sales-eu@; AU, CA -> keyaccounts@.
-- Only rows whose owner is not already one of the four mailboxes are changed (personal staff addresses are replaced). Idempotent.
UPDATE planner.clients
   SET owner_email = CASE WHEN type = 'key_account' THEN 'keyaccounts@dockandbay.com'
                          WHEN market = 'UK' THEN 'sales-uk@dockandbay.com'
                          WHEN market = 'US' THEN 'sales-us@dockandbay.com'
                          WHEN market = 'EU' THEN 'sales-eu@dockandbay.com'
                          ELSE 'keyaccounts@dockandbay.com' END,
       updated_at = now(), updated_by = 'migration 390'
 WHERE coalesce(lower(owner_email), '') NOT IN ('sales-uk@dockandbay.com', 'sales-us@dockandbay.com', 'sales-eu@dockandbay.com', 'keyaccounts@dockandbay.com');
