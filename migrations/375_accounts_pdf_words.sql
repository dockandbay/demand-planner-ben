-- v28.388 (Ben 15-Oct-26, WOOLWORTHS A$225.48: the receipt was emailed as "woowlroths 225.48" but its PDF says WOOLWORTHS): the words of an
-- email's PDF receipt, so Reconcile can find the payee's name in the PDF as well as in the sender and subject. Lower-case, unique, letters
-- and digits only, words of 3+ characters, at most ~4,000 characters. NULL = not read yet (filled lazily for older emails). Additive.
ALTER TABLE planner.accounts_gmail_msgs ADD COLUMN IF NOT EXISTS pdf_words text;
