# Migrations

The `planner` schema is now defined by a single consolidated baseline instead of 61 incremental files.

## Files

- **`schema.sql`** — consolidated baseline. The full `planner` schema (60 tables + 3 views, all
  constraints/indexes/sequences) as of migration 061. Generated via
  `pg_dump --schema=planner --schema-only`. **Validated** by rebuilding it into a throwaway schema
  (recreates all 63 objects cleanly).
- **`_archive/001_*.sql … 061_*.sql`** — the original incremental migrations, kept for history /
  audit. These have already been applied to the sandbox and (where applicable) production.

## How to use

- **Fresh database (e.g. standing up a new env):** run `schema.sql` once. Done — no need to replay
  61 files.
- **Existing database (sandbox / production):** already migrated. **Do NOT run `schema.sql` against
  it** — it would collide with existing objects. (`CREATE SCHEMA` is `IF NOT EXISTS`, but the table
  creates are not idempotent.)
- **New schema changes from here on:** add a new numbered migration on top of the baseline —
  `062_*.sql`, `063_*.sql`, … — and run only that against existing DBs. Periodically these can be
  folded back into `schema.sql` (regenerate the dump) to keep the baseline current.

## Notes for the live migration (Diviyaj)

- The baseline is `planner`-only. The Trade Board (`public`) and China app (`china`) schemas are
  separate and not included here.
- `schema.sql` is pure SQL (psql `\restrict` meta-commands stripped) so it runs under either `psql`
  or the node-`pg` runner scripts.
- If production already has migrations 001–0NN applied, run only the remaining `_archive/` files
  (0NN+1 … 061) to catch up — the baseline is for fresh setups.
