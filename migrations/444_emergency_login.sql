-- migration 444
-- v28.804 (Ben 13-Nov-26): emergency sign-in that needs neither Google nor email. Each person links an authenticator app
-- (TOTP, RFC 6238) once while Google works; "Sign in with code" on the login page then takes email + 6-digit code. The
-- secret is sealed (AES-256-GCM, GMAIL_SEAL_KEY) before it is stored. Every code sign-in attempt is logged. Safe to re-run.
CREATE TABLE IF NOT EXISTS planner.emergency_totp (
  email        text PRIMARY KEY,                -- lower-case @dockandbay.com
  secret_enc   text NOT NULL,                   -- sealed base32 secret
  confirmed_at timestamptz,                     -- null until the first code is entered (not usable before)
  last_step    bigint,                          -- last accepted 30-second step: a code can be used once
  last_used_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS planner.emergency_login_log (
  id     bigserial PRIMARY KEY,
  email  text,
  ip     text,
  ok     boolean NOT NULL,
  reason text,
  at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS emergency_login_log_email_at ON planner.emergency_login_log (email, at);
CREATE INDEX IF NOT EXISTS emergency_login_log_ip_at ON planner.emergency_login_log (ip, at);
-- Read back: SELECT to_regclass('planner.emergency_totp'), to_regclass('planner.emergency_login_log');   -- both non-null
