-- v28.483 (Ben 25-Oct-26): Connect (Gmail add-on + Chrome side panel hub), HORIZON side. Additive, idempotent.
-- app_permissions.connect_access = who may use Connect (CONFIG > Permissions "Connect"); super admins always may.
ALTER TABLE planner.app_permissions ADD COLUMN IF NOT EXISTS connect_access boolean NOT NULL DEFAULT false;

-- People signed out of every Dock & Bay app by Connect's suspension watcher (POST /api/identity/revoke).
-- While a row exists, HORIZON's Connect routes and the Claude connector refuse that person. /api/identity/restore deletes the row
-- (it never re-ticks permissions).
CREATE TABLE IF NOT EXISTS planner.identity_blocks (
  email       text PRIMARY KEY,               -- lowercased
  blocked_at  timestamptz NOT NULL DEFAULT now(),
  source      text NOT NULL DEFAULT 'connect',
  jti         text                            -- request id of the revoke assertion
);

-- Every revoke / restore call: who, what, outcome.
CREATE TABLE IF NOT EXISTS planner.identity_events (
  id      bigserial PRIMARY KEY,
  at      timestamptz NOT NULL DEFAULT now(),
  email   text NOT NULL,
  event   text NOT NULL CHECK (event IN ('revoke','restore')),
  ok      boolean NOT NULL,
  detail  jsonb,
  jti     text
);
CREATE INDEX IF NOT EXISTS identity_events_email_idx ON planner.identity_events (lower(email));
CREATE INDEX IF NOT EXISTS identity_events_at_idx ON planner.identity_events (at DESC);
