-- v28.248 (Ben 10-Oct-26): ACCOUNTS > Inbox matcher. One Gmail connection (the accounts@ mailbox, read-only scope).
-- The refresh token is stored AES-256-GCM sealed with a key derived from GMAIL_CLIENT_SECRET_ACCOUNTS (never plain text).
-- Additive and idempotent. Without it the Inbox tab shows "not connected" and Connect explains the missing migration.
CREATE TABLE IF NOT EXISTS planner.accounts_gmail (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),   -- single row: one connected mailbox
  email text NOT NULL,                                -- mailbox Google reports for the token (accounts@...)
  refresh_token_enc text NOT NULL,                    -- 'g1:' + base64(iv | tag | ciphertext)
  scope text,
  connected_by text,                                  -- HORIZON user who clicked Connect
  connected_at timestamptz NOT NULL DEFAULT now(),
  last_ok_at timestamptz,                             -- last successful Gmail read
  last_error text
);
