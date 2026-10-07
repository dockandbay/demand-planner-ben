-- 335_client_sessions_last_seen.sql  (v28.195, Ben): client portal activity for CONFIG > App health log and the weekly health report.
-- last_seen_at = the last time a client portal session was used, stamped by cpAuth at most once per 5 minutes per session (one guarded
-- UPDATE folded into the session lookup, so it costs no extra round trip). Admin preview sessions (token cppv_...) are never stamped.
-- Mirrors 332 (supplier portal_sessions.last_seen_at). Additive only: one nullable column + one index. Safe to re-run. Until it is
-- applied the server falls back to the read-only session lookup (it detects the missing column) and the report uses the sign-in time
-- as "last seen", so deploying the code first loses nothing.
ALTER TABLE planner.client_sessions ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;
CREATE INDEX IF NOT EXISTS client_sessions_last_seen_idx ON planner.client_sessions (last_seen_at);
