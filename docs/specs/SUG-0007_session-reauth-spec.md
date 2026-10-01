# SUG-0007 — Session re-validation & max-duration (spec / handoff for Diviyaj)

**Suggestion (Ben, 2026-07-30):** "When logged in to HORIZON (not sandbox), the app should silently poll the logged-in user's credentials every 4 hours in the browser. If the user is no longer valid as a Google account, log them out. Max logged-in duration is 7 days before auto-logout. May need Div to handle this in the Vercel app or Supabase."

This is **mostly an auth-layer job (Diviyaj)** — the HORIZON app itself holds no session; it trusts a forwarded auth header. Below is exactly how auth works today, what each side owns, and a proposed split.

---

## How HORIZON auth works today (for context)

- HORIZON (the admin app) sits **behind an auth proxy** (IAP / oauth2-proxy / Cloudflare Access — whatever fronts the Vercel deployment). The app **does not do the Google login itself**.
- `server.mjs` reads the user's email from forwarded headers only — `authUser(req)` checks, in order: `x-forwarded-email`, `x-auth-request-email`, `cf-access-authenticated-user-email`, `x-goog-authenticated-user-email`, `x-authenticated-user-email`, `x-user-email` (strips an IAP `accounts.google.com:` prefix).
- `permsFor(req)` maps that email → `planner.app_permissions` (supply/demand/product edit, is_admin, landing_page). `GET /api/me` returns `{ email, live, supply_edit, demand_edit, product_edit, is_admin, landing_page }`.
- **Sandbox has no proxy** → `authUser` falls back to `DEV_USER`; `permsFor` returns `live:false` (full access). So SUG-0007 must be **live-only** (skip when `me.live === false`).
- The supplier portal is separate (magic-link + `planner.portal_sessions`, `portalAuth`); **out of scope** here — this is about the internal Google-authenticated app.

**Implication:** the session cookie/JWT, its lifetime, and the Google token all live in the **proxy**, not in this repo. The app can't by itself revoke a proxy session — it can only detect "no longer authenticated" and bounce the user to re-login/logout.

---

## Ownership split

### A. Auth layer — **Diviyaj** (the core of this suggestion)
1. **7-day max session.** Set the proxy session cookie / JWT max-age (and refresh-token lifetime) to **7 days**, non-sliding (or sliding capped at 7 days per Ben's "max logged-in duration"). After that, the next request 302s to Google login.
2. **Re-validate the Google account.** Ensure a revoked/suspended/deleted Google account can't keep a live session:
   - oauth2-proxy: set `--cookie-refresh` (e.g. `4h`) so it silently re-validates the OAuth token against Google on that cadence, and `--cookie-expire=168h` for the 7-day cap. A revoked token fails refresh → user is logged out.
   - Cloudflare Access: set the app session duration to **7 days** and rely on Access re-checking the IdP; revoked Google users lose access at the next policy check.
   - Vercel (if auth is a middleware/edge function): give the session JWT a 7-day expiry and re-verify the Google token (Google `tokeninfo`/userinfo) on refresh.
3. **Expose a logout URL** the app can redirect to (e.g. `/oauth2/sign_out`, Access `/cdn-cgi/access/logout`, or a Vercel logout route) so the client heartbeat (below) can hard-log-out.
4. Confirm that when a session is invalid, requests to `/api/me` return **401 / a redirect to login** (not a silent 200 with a stale email). The client heartbeat relies on this signal.

### B. App layer — **Ben / this repo** (I can build this on your say-so)
A client heartbeat that operationalises "poll every 4h, log out if invalid" — only meaningful once the proxy behaves as in A:
- On live only (`me.live === true`), every **4 hours** `fetch('/api/me')` (or a tiny dedicated `/api/auth/status`).
- If it returns **401 / a login-page redirect / no email / a different email** than the one the app booted with → the session has ended: clear app state and `window.location` to the proxy **logout URL** (from A3), which forces a fresh Google login.
- Belt-and-braces: also record the boot time and, at the 7-day mark, trigger the same logout client-side (so even if the proxy is lenient, the app self-expires at 7 days).
- Skip entirely in sandbox.

**I can implement Part B now** (it's ~15 lines + the logout URL). It's only *effective* once Diviyaj sets the proxy session to 7 days + Google re-validation (Part A) — otherwise a still-valid proxy session will just keep answering `/api/me` and nothing logs out.

---

## Suggested sequence
1. Diviyaj: confirm which proxy fronts HORIZON, set **7-day** session + **~4h Google re-validation**, and give me the **logout URL**.
2. Ben/me: wire the 4h client heartbeat + 7-day client self-expiry against that logout URL.

**Ref:** SUG-0007. No DB migration. No change to `server.mjs`'s auth (it stays header-trusting).
