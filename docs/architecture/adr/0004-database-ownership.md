# 0004: Database ownership

## Context

Kinne has one Postgres database on Neon, accessed with Drizzle. All tables are defined in a single `schema.ts`, so any code can read or write any table, and it is unclear which subject is responsible for which data. Database roles and privileges are already restricted per role ([security.md](../../security.md) §4); this decision is about ownership in the code.

## Decision

- **One Postgres schema.** No schema per module and no database per module.
- **Each module owns its tables**, defined in `src/modules/<module>/infrastructure/db/schema.ts`. The owner of each table is in the [overview](../overview.md#modules).
- **A repository imports only the tables of its own module.** dependency-cruiser enforces it, and a module's `index.ts` never re-exports its tables.
- **Foreign keys across modules** are allowed only to the stable IDs of `catalog` (title) and `accounts` (account).
- **Splitting the current `schema.ts` generates no migration.** `drizzle-kit generate` must come out empty after each module is moved; if it does not, the move stops.
- **Read models.** A query that crosses modules for performance, such as the filtered draw, is a named read model. Each one has its own short ADR saying which tables it reads and why a call through the public APIs is not enough.

## Alternatives

- **A Postgres schema or a database per module.** Rejected: more roles, connections and migrations to operate, with no benefit at this size.
- **Keep the single schema file.** Rejected: ownership stays invisible and unchecked.
- **Forbid every cross-module query.** Rejected: the filtered draw would become several round trips over an HTTP driver.

## Consequences

- Who owns a piece of data is answered by the folder its table is in.
- A module that needs another module's data asks through that module's API, or the need is recorded as a read model.
- Read models are deliberate, visible exceptions; their number is a signal to watch.
- Deleting an account stays complete because each owner deletes its own rows ([ADR 0003](0003-inter-module-communication.md)).

## Status

Accepted, 2026-11-01. The schema is split module by module in F2. The read model of the filtered draw gets its ADR after `discovery` is moved.
