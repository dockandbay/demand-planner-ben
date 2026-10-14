-- v28.372 (Ben 15-Oct-26): a team member's note when they forward a receipt to accounts@ ("SS27 picnic") goes first in the Xero bill
-- line description, so the accountant knows which shoot / project the expense is for. Filled when the email is parsed (and on demand for
-- emails parsed before this version). NULL = not checked yet; '' = checked, no explicit note. Additive.
ALTER TABLE planner.accounts_gmail_msgs ADD COLUMN IF NOT EXISTS team_note text;
ALTER TABLE planner.accounts_bill_log ADD COLUMN IF NOT EXISTS description text;   -- the Xero line description used (note + receipt)
