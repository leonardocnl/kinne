# 0001: Modular monolith

## Context

The MVP was built in four technical layers (`src/domain`, `src/application`, `src/infrastructure`, `src/app`). Every subject (catalog, taste, group room, accounts) is spread across all four, and all tables sit in one schema file. A change to one subject touches every layer, and nothing stops one subject from reaching into another. The project has one developer working with AI agents, a free-tier budget and one deployment on Vercel.

## Decision

Kinne is a modular monolith: one application, one deployment, one database.

- Code is grouped by business subject first: `src/modules/<module>/`. Inside each module the layers are `domain → application → infrastructure → ui`.
- Each module has an `index.ts`, its public API and the only way in, and a `README.md`.
- What is not business lives in `src/shared/` (`ui`, `config`, `logger`, `events`, `lib`). `src/app/` holds only thin Next.js routes.
- Modules: `catalog`, `taste`, `discovery`, `room`, `accounts`, `analytics`, and `library` after the MVP. Their responsibilities, allowed dependencies and tables are in the [overview](../overview.md#modules).
- Search stays inside `catalog`. Feelings and genre conflicts stay inside `discovery`. The About page is only a route; `qr` and `pix` go to `shared/lib`.

Modules that are deliberately not created, and what would create them:

| Module    | Trigger                                                                     |
| --------- | --------------------------------------------------------------------------- |
| `search`  | Search has to return something outside the catalog (users, lists, reviews). |
| `support` | The About page gains data or a rule (a form, a support goal).               |
| `social`  | Decided after the MVP (social profile, friends, feed).                      |

## Alternatives

- **Keep the technical layers.** Rejected: subjects stay tangled and boundaries between them cannot be checked.
- **Separate services.** Rejected: more deployments, network calls and cost for a product with one developer and a free tier.
- **Modules without inner layers.** Rejected: the pure domain rules, already tested without a framework, would mix with database and UI code.

## Consequences

- A change to one subject stays in one folder, and what a module offers is readable in its `index.ts`.
- Boundaries need tooling to hold ([ADR 0002](0002-module-boundaries-and-tooling.md)).
- The existing code has to be moved, one module per PR, without changing behavior (phase F2). Until then both structures coexist.
- A module can later be extracted into a service along its `index.ts`, if that is ever needed.

## Status

Accepted, 2026-11-01. Migration not started (F2).
