# 0003: Communication between modules

## Context

Modules need each other: `discovery` reads taste and catalog, `room` reads taste. The allowed direction is fixed by the module table ([ADR 0001](0001-modular-monolith.md)). Some facts, though, concern modules that must not be known by the one where the fact happens. Deleting an account happens in `accounts`, which depends on no business module, yet `taste`, `room` and `analytics` hold data of that account.

## Decision

- **Default: a direct call** to a function exported by the other module's `index.ts`, in the allowed direction.
- **An in-process event** when module A must not depend on module B, or when more than one module reacts to the same fact. The bus lives in `src/shared/events`. It runs inside the application process: no queue and no external service.
- First event: `AccountDeleted`. `taste`, `room`, `analytics` and, later, `library` each delete what is theirs.
- After the MVP: `TitleRated`, published by `library`, heard by `taste` and `analytics`.
- A mandatory test proves that every module owning personal data is subscribed to `AccountDeleted`.

## Alternatives

- **Direct calls only.** Rejected: `accounts` would have to import every module that stores personal data, inverting the dependency table.
- **Events for everything.** Rejected: the flow becomes hard to follow and to type for no gain when a direct call is allowed.
- **A queue or an external event service.** Rejected: cost and operations that one process and a free tier do not justify.

## Consequences

- The dependency table stays acyclic, and a new module with personal data joins account deletion by subscribing, without touching `accounts`.
- Events are delivered in the same process and request. There is no retry or persistence, so a subscriber's work must be safe to run again, and a failure has to surface to the caller instead of being lost.
- The list of events and subscribers is generated documentation ([ADR 0006](0006-living-documentation.md)).
- An event is added on purpose, never as a way around the direction rule for convenience.

## Status

Accepted, 2026-11-01. `src/shared/events` is created in F2, with the first module that holds personal data.

2026-11-15: with [ADR 0012](0012-module-dependencies-after-f2-mapping.md), `accounts` owns every table linked to an account, so `AccountDeleted` has no subscriber during F2. `src/shared/events` is created with the first module outside `accounts` that stores account data (expected: `library`).
