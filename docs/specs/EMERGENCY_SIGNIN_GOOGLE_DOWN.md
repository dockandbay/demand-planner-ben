# Emergency sign-in when Google is down

Ben Muller, 13-Nov-26. Proposal for all Dock & Bay apps.

## The risk

Every internal app we run signs people in with Google (@dockandbay.com). If Google sign-in has an outage, or our Google Workspace is locked or suspended, nobody can get into HORIZON, Trade Board, the China packing app, Desk Rota, Connect or the portals' staff side. Magic links do not help, because Gmail is likely down at the same time. Today the only way in for HORIZON is the shared PLANNER_KEY break-glass link, which gives a read-only anonymous session and means sharing a master secret.

## The proposal: an authenticator-app code (TOTP)

Each person links an authenticator app once, while Google works. If Google is down they sign in with their email plus the 6-digit code the app shows. TOTP (RFC 6238) is the same mechanism banks and GitHub use for two-factor codes.

- **No Google, no email, no SMS needed at sign-in.** The code is calculated on the phone from a shared secret and the time; it works offline.
- **Any authenticator app works:** Google Authenticator, Microsoft Authenticator, 1Password, Authy, Apple Passwords.
- **Personal, not shared:** every person has their own secret, so every sign-in is attributable and one person can be reset without touching anyone else.

## How it works in HORIZON (built, v28.804)

**Set up (one minute, once):** profile menu (top right) > Emergency login code. Scan the QR code, type the code the app shows to confirm. A small banner nudges anyone who has not set it up (Later hides it for 30 days).

**Sign in:** the sign-in page always shows "or sign in with your emergency code" under the Google button: email + 6-digit code.

**Safeguards**
- Only @dockandbay.com addresses with a confirmed code; suspended people (Connect directory / block list) are refused.
- A code session lasts 24 hours (Google sessions last 7 days), and an amber banner shows it is an emergency session.
- Each code works once (replay refused); 30 seconds of clock drift allowed either side.
- 5 wrong codes for one person, or 20 from one IP address, within 15 minutes lock code sign-in for 15 minutes.
- Every attempt (success or failure, with reason and IP) is logged and visible to admins.
- Secrets are encrypted at rest (AES-256-GCM with the server-side sealing key); they are never shown again after set-up.
- Wrong email and wrong code get the same answer, so the page does not reveal who has a code.

**Admin page:** CONFIG > Admin > Emergency login shows who has set up a code, lets an admin reset one (lost phone) and shows recent attempts.

**Session grace switch (same page):** turned on by an admin for 24, 48 or 72 hours, then it switches itself off. While on, anyone whose browser still holds a valid Supabase session is let back in without Google prompting them again (the 7-day re-sign-in is paused). This covers most people with no action at all.

**Technical notes**
- Two tables: `planner.emergency_totp` (email, sealed secret, confirmed, last step used) and `planner.emergency_login_log`.
- One public route, `POST /api/auth/code-login`, which mints the same signed `pk` / `pu` cookies as the Google exchange, with a 24-hour expiry.
- The sign-in form is plain JavaScript, independent of the Supabase CDN, so it still works if that fails to load.
- No new external service and no new cost.

## Rolling it out to the other apps

| App | Suggested approach |
|---|---|
| Apps on the shared Supabase Auth (HORIZON, Trade Board, China packing) | Copy the HORIZON pattern; the TOTP code (about 40 lines) and the two tables can be shared, or one central "emergency sign-in" service can issue the session for every app |
| Desk Rota (separate Supabase project) | Same pattern, its own two tables |
| Connect / Gmail add-on | Not needed: it only runs inside Google |
| Supplier and client portals | Not affected: they use their own magic-link sessions for external people |
| Admin consoles: Supabase, Vercel, GitHub, n8n, Fulfil, Xero | Make sure each admin account has a password + authenticator 2FA as well as "Sign in with Google", so we can still reach the consoles (and turn things on or off) during an outage |

## Asks

1. **Diviyaj:** review the HORIZON implementation (PR #149, mainly the auth harness edits: gate exemption, exchange grace check, login page form) and say whether the same pattern should go into the other apps or into one shared service.
2. **Diviyaj / Sarah:** check the admin consoles above have a non-Google login, and keep the recovery codes somewhere offline (password manager or printed in the safe).
3. **Sarah:** once live, ask the team to set up their emergency code (one minute each) and add it to onboarding.
4. **All:** a short outage drill once a quarter: sign in with a code from a private window to prove it works.
