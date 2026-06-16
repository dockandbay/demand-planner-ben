# CLAUDE.md — Dock & Bay Demand Planner (Ben's build repo)

This file orients Claude Code to how Dock & Bay's apps and data are set up, and the
rules for building here so two people (Ben + Diviyaj) can work in parallel without
clashing. Read it before making changes.

---

## Who does what

- **Ben** — builds and improves the tools in *this* repo. Owns the product: features,
  forecasting/buy logic, UX. This is the source of truth for *what the tool does*.
- **Diviyaj** — pulls Ben's work into the production repos, hardens it (data wiring,
  hosting, secrets, monitoring), and deploys. Owns *how it runs in production*.

The handoff: when a version is ready, Ben tells Diviyaj. Diviyaj pulls this repo's
changes downstream, wires them to production data, and ships. **Ben never deploys to
production directly, and Diviyaj never changes Ben's product logic without telling him.**

---

## The estate (current setup)

**Hosting** — Apps run on **Vercel**. Production deploys are Diviyaj's; every branch
gets an automatic Vercel **preview URL** so work can be seen live without touching prod.

**Database** — **Supabase** (Postgres). Production project ref `oolwklahstnvocaugryg`,
organised by schema:
- `planner` — the demand planner's tables (sales_actuals, products, forecasts,
  inbound_shipments, preorders, key_account_forecasts, buy_plan, …). **Production.**
- `public` — Trade Board.
- `china` — China packing app.
- (Desk Rota is a *separate* Supabase project.)

**ETL** — **n8n** (self-hosted at `n8n.dockandbay.com`) moves data from source systems
(Airtable today; Cin7/Fulfil later) into Supabase on a schedule. This replaces the old
Google Apps Scripts.

**The demand planner specifically** — Ben's Claude artefact is rehosted on Vercel with
its two Claude-dependent ends rewired to live Supabase (data reads + forecast saves).
A small server harness injects live data and routes AI calls server-side. Ben builds the
artefact/app; Diviyaj maintains the harness.

---

## Rules for building here (so we don't clash)

1. **Build in your own Supabase; production is separate.**
   - Build and experiment in **your own Supabase account** (your sandbox) — seeded with a
     copy of production data so you're working against realistic numbers. Do whatever you
     like in there; it's isolated and safe.
   - **Production lives in the shared Supabase project (`oolwklahstnvocaugryg`)** and is the
     single source of truth. Diviyaj owns all writes to it.
   - **Never point a deployed app at your own Supabase as its live backend** — that creates
     two diverging production databases (the one thing we're avoiding).
   - Keep your schema as **migration `.sql` files in this repo** so Diviyaj can reconcile it
     into production when pulling your work in. One writer to prod = Diviyaj.

2. **Secrets stay out of git.** No API keys, database URLs, or tokens in committed code.
   Use environment variables and a `.gitignore`d `.env`. If a key must be referenced,
   reference it by env-var name only.

3. **Use branches + a PR, even in your own repo.** Build on a branch, open a PR to your
   own `main`. It gives a clean diff Diviyaj can pull and review. Don't force-push shared
   history.

4. **Leave a deploy note.** When a version is ready, summarise in the PR / a `CHANGES.md`:
   what changed, any new env vars, and any migration files added. That's what Diviyaj
   needs to pull it in cleanly.

5. **Don't wire production infrastructure yourself** (Vercel projects, custom domains,
   n8n workflows, Supabase migrations on prod). Build the feature; Diviyaj connects it.

6. **Models:** when calling Claude, use a current model ID (e.g. `claude-sonnet-4-6`).
   Retired model IDs return 404s.

---

## When in doubt

Ask Diviyaj before: touching production data, adding a new external service, changing how
data flows between systems, or anything that costs money or leaves the building. Building
features and prototyping in `ben_dev` never needs a sign-off — go for it.
