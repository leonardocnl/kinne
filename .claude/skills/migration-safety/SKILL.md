---
name: migration-safety
description: Rules for schema changes and migrations that are safe on tables that already have data. Use for any database schema change.
---

# Migration safety

## Safe by default

- Add columns as nullable or with a default; backfill; only then add NOT NULL.
- Rename = add new column, copy data, switch code, drop old column later (expand/contract).
- Create indexes on large tables in a way that does not lock writes, when the database allows.
- One logical change per migration. Never edit a migration that already ran anywhere.

## Always ask first

- Dropping tables or columns, renames, type changes that can lose data, removing constraints.

## Check

- Read the generated SQL. Does it match what you meant? Does it lock a big table?
- Is it reversible? If not, say so in the report.
- Code must work both before and after the migration runs (deploys are not instant).

## Never

- Run migrations against production. Print or commit connection strings.
- Run a command that connects to a database before confirming which database it points to.
  In Kinne, until Leonardo confirms where `.env.local` points, only `npm run db:generate` and
  `npm run test:db` are allowed; never open or print `.env*` files other than `.env.example`.

## Kinne specifics

- Migrations reach `develop` only through `.github/workflows/migrate-develop.yml`.
- New tables, functions and grants follow the least-privilege role model in
  `docs/security.md` §4.
