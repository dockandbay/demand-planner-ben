-- v28.480 (Ben 24-Oct-26, "Proceed to mcp"): HORIZON connector for Claude chat (custom connector, MCP over HTTP).
-- Each Dock & Bay person signs in with their own Google account (OAuth). Read-only tools only.
-- app_permissions.mcp_access = who may connect (CONFIG > Permissions "Claude connector"); super admins always may.
-- Codes and tokens are stored as SHA-256 hashes, never in clear. Additive, idempotent.
ALTER TABLE planner.app_permissions ADD COLUMN IF NOT EXISTS mcp_access boolean NOT NULL DEFAULT false;

-- OAuth clients registered by Claude (dynamic client registration, RFC 7591).
CREATE TABLE IF NOT EXISTS planner.mcp_clients (
  client_id     text PRIMARY KEY,
  secret_hash   text,                       -- null = public client (PKCE only)
  client_name   text,
  redirect_uris jsonb NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- One-time authorisation codes (5 minutes) and access / refresh tokens.
CREATE TABLE IF NOT EXISTS planner.mcp_tokens (
  token_hash     text PRIMARY KEY,
  kind           text NOT NULL CHECK (kind IN ('code','access','refresh')),
  client_id      text NOT NULL,
  email          text NOT NULL,
  scope          text,
  redirect_uri   text,                      -- codes only
  code_challenge text,                      -- codes only (PKCE S256)
  expires_at     timestamptz NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  last_used_at   timestamptz
);
CREATE INDEX IF NOT EXISTS mcp_tokens_email_idx ON planner.mcp_tokens (lower(email));
CREATE INDEX IF NOT EXISTS mcp_tokens_expires_idx ON planner.mcp_tokens (expires_at);

-- Every tool call: who, which tool, arguments, outcome.
CREATE TABLE IF NOT EXISTS planner.mcp_audit (
  id         bigserial PRIMARY KEY,
  at         timestamptz NOT NULL DEFAULT now(),
  email      text,
  client_id  text,
  tool       text,
  args       jsonb,
  ok         boolean,
  error      text,
  ms         integer,
  rows       integer
);
CREATE INDEX IF NOT EXISTS mcp_audit_at_idx ON planner.mcp_audit (at DESC);
