-- 398_gmail_connectors.sql (v28.552, Ben 28-Oct-26: "add a second slot for ops@ ... move accounts@ and ops@ into admin, called GMAIL CONNECTORS").
-- planner.accounts_gmail held one row (id 1 = accounts@). It now holds one row per connected mailbox: id 1 = accounts@, id 2 = ops@.
-- Same columns, same sealed refresh token, same read-only scope. Additive (widens the id check only).
ALTER TABLE planner.accounts_gmail DROP CONSTRAINT IF EXISTS accounts_gmail_id_check;
ALTER TABLE planner.accounts_gmail ADD CONSTRAINT accounts_gmail_id_check CHECK (id IN (1, 2));
