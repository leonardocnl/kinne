# 0012: Module dependencies after mapping the code for F2

## Context

[ADR 0001](0001-modular-monolith.md) fixed which module may import which before the code was mapped file by file. The [F2 migration plan](../../plans/f2-migration.md) did that mapping and found four places where the existing code does not fit the table, plus queries that touch tables of more than one module. F2 moves code without changing behavior, so each mismatch needs either a rule change or a redesign. This ADR records the choices.

## Decision

### Dependencies

| Module      | May import                          | Changed |
| ----------- | ----------------------------------- | ------- |
| `catalog`   | no business module                  |         |
| `taste`     | catalog                             |         |
| `accounts`  | catalog, taste                      | yes     |
| `analytics` | no business module                  |         |
| `discovery` | taste, catalog, accounts, analytics | yes     |
| `room`      | taste, catalog, accounts            | yes     |
| `library`   | catalog, taste, accounts            |         |

- **`accounts` owns the seven `user*` tables** (`users`, `sign_in_codes`, `user_sessions`, `user_streamings`, `user_taste_signals`, `user_watched`, `user_onboarding`) **and may import `catalog` and `taste`.** They are written only through the session-keyed `kinne_*` database functions, and the sign-in merge of the browser's data is one atomic function. `taste` owns the graph and the visitor's signals in the browser.
  - **This is transitional.** When the `library` module is created, the ownership of "Já vi" (`user_watched`) and of the taste signals (`user_taste_signals`) is revisited: they are the natural neighbours of lists and ratings.
- **`room` may import `accounts`.** The lobby reads the account state and a member's saved taste.
- **`discovery` may import `analytics`**, as a direct call: the title screen records usage events. The arrow points the allowed way and only one module reacts, so this is not a case for an event ([ADR 0003](0003-inter-module-communication.md)).
- **Migration order** follows the dependencies: `shared`, `catalog`, `taste`, `accounts`, `analytics`, `discovery`, `room`.

### Entry for client components

A module with client components has two entry files: `index.ts` (server and isomorphic code) and `ui/index.ts` (client components and their hooks). Rule 1 accepts both. One file exporting both would let a client component pull server code through the module's public API.

### Registered exceptions to table ownership

| #   | Exception                                                                                                                                              | Form                                                                                                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1  | A module's `schema.ts` imports the `schema.ts` of `catalog` or `accounts`, only to declare a foreign key to their IDs. Drizzle needs the table object. | One `pathNot` in `module-own-tables` and `module-public-api`, added when `catalog` is moved.                                                                                           |
| E2  | The catalog sync asks whether rows of other modules still point to a title, to deactivate it instead of deleting it.                                   | Raw SQL in one file, `catalog/infrastructure/db/title-references.ts`, with no import of another module's tables. A test fails if a foreign key to `catalog_titles` is missing from it. |
| E3  | The daily sync job also purges `rate_limit_buckets`, expired group rooms and expired sign-in codes, as the `kinne_sync` role.                          | Kept as raw SQL in the catalog repository during F2. After F2, the sync script calls a purge exported by each owner.                                                                   |
| E4  | The daily picks are read joined with catalog tables.                                                                                                   | Named read model, [ADR 0013](0013-read-model-daily-picks.md).                                                                                                                          |

## Alternatives

- **Keep the table of ADR 0001 and split the account data** (`taste` owns `user_taste_signals` and `user_watched`). Rejected for now: `taste` would call session-keyed functions without being allowed to import `accounts`, and the sign-in merge would span two modules while one SQL function does it. It is a redesign of the accounts flow, not a move.
- **Pass the account state into the room from the route.** Rejected: it changes the component contract of the room.
- **Keep the title screen in `src/app`** so that no module imports `analytics`. Rejected: it is a 374-line component with rules, which [ADR 0005](0005-ui-placement.md) moves out of the routes.
- **An event for usage tracking.** Rejected: the direction is allowed and there is one listener.

## Consequences

- The dependency graph stays acyclic: `catalog` and `analytics` are leaves, then `taste`, `accounts`, and `discovery` and `room` on top.
- No server module other than `accounts` stores data linked to an account, so `AccountDeleted` has no subscriber yet and `src/shared/events` is not created in F2.
- `accounts` is no longer import-free: a change to the taste lists or to the streaming list can reach it. The cost is accepted until `library` exists.
- Exceptions E2 and E3 keep cross-module SQL out of the type system. They are few, named here, and E3 has a planned end.

## Status

Accepted, 2026-11-15. Amends the dependency table of [ADR 0001](0001-modular-monolith.md). The ownership of `user_watched` and `user_taste_signals` is transitional and is revisited when `library` is created.
