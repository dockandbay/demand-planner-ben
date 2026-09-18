# Setup — read-only analytics access for 4 users (for Diviyaj)

**Goal:** give four people read-only access to the live HORIZON data so they can use the
"HORIZON Analytics" claude.ai project (conversational analytics via the Supabase connector).
**Read-only, production (`oolwklahstnvocaugryg`), no write access anywhere.**

Users (all @dockandbay.com):
- sarah@dockandbay.com
- abi@dockandbay.com
- andy@dockandbay.com
- mikey@dockandbay.com

---

## Step 1 — create the read-only DB role (once)
Apply `migrations/173_analytics_readonly_role.sql` on production.
- Set a strong password out-of-band (do **not** commit it).
- It grants `SELECT` only on `planner` (and optionally `public`) + default privileges for
  future tables. No INSERT/UPDATE/DELETE/DDL anywhere.

## Step 2 — pick the access model
Two ways the four users can connect. **Recommend A** (hard guarantee, simplest to control).

### A) Shared read-only connection string (recommended)
Each user configures the claude.ai **Supabase connector** (or a Postgres MCP) with the
`horizon_readonly` credentials from Step 1 — i.e. one shared read-only login:
```
postgresql://horizon_readonly.<PROJECT_REF>:<password>@<pooler-host>:6543/postgres
```
- Writes are impossible at the DB level regardless of what anyone types.
- Downside: one shared credential (rotate if someone leaves). Fine for a small trusted team.

### B) Individual Supabase org members (if you prefer named access)
Invite each email to the Supabase **organisation** as the **Read-only** org role
(Organization ▸ Team ▸ Invite member ▸ role = Read-only). Each user then connects the
claude.ai Supabase connector via their own OAuth.
- Named, revocable per person.
- Caveat: the OAuth connector runs with the user's org role, so read-only depends on that
  role being correctly set to Read-only — not enforced by a dedicated DB grant. For a prod
  project, A is the stronger guarantee; you can also do **A + B** (named org membership for
  audit, connection string scoped to `horizon_readonly` for the hard limit).

## Step 3 — share the claude.ai project
Ben shares the **"HORIZON Analytics"** project with the four users (Team/Enterprise workspace).
Project already contains: read-only instructions block, schema cheat-sheet
(`HORIZON_ANALYTICS.md` §3/§4) and `HORIZON_SYSTEM_HANDOVER.md`. Project memory = "Everyone".

## Step 4 — verify
As one of the users, run a write and confirm it's rejected, e.g.:
```
UPDATE planner.products SET product_name = product_name WHERE false;
```
Should error with a permission-denied (proves read-only). A `SELECT` should succeed.

---
*Access is production and read-only. Any change to HORIZON data still goes through the app or
Diviyaj — never via the analytics connector.*
