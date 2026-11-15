# Architecture overview

Kinne recommends one film or series at a time, only among the subscription streamings a person has in Brazil. It is a single Next.js application backed by one Postgres database. This page describes the target architecture decided on 2026-11-01 ([foundation plan](../plano-fundacao.md)) and how far the code is from it. The decisions and their reasons live in the [ADRs](adr/README.md). The rules a tool checks live in [boundaries.md](boundaries.md).

## Shape: a modular monolith

One deployable application. The code is split by business subject first and by layer second ([ADR 0001](adr/0001-modular-monolith.md)).

```
src/
    app/                    # Next.js routes only; thin, they call the modules
    modules/
        <module>/
            domain/         # pure rules, no framework
            application/    # use cases, zod input schemas
            infrastructure/ # database, TMDB, browser storage
            ui/             # components of this subject
            index.ts        # public API: the only way in
            README.md
    shared/
        ui/                 # design system: tokens and components with no business rule
        config/             # validated configuration
        logger/
        events/             # in-process event bus
        lib/                # day, rate-limit, qr, pix
```

## Modules

| Module                 | Responsible for                                                                          | May import                          | Owns the tables of                                                         |
| ---------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------- |
| `catalog`              | titles, genres, streamings, cast, TMDB sync, search of titles and people                 | no business module                  | titles, genres, streamings, credits, search                                |
| `taste`                | each person's taste: signals and graph                                                   | catalog                             | graph edges                                                                |
| `discovery`            | what to show now: filters, draw, "Me surpreenda", daily picks, feelings, genre conflicts | taste, catalog, accounts, analytics | daily picks                                                                |
| `room`                 | choosing in a group                                                                      | taste, catalog, accounts            | rooms, members, votes                                                      |
| `accounts`             | sign-in by code, session, download and delete my data                                    | catalog, taste                      | accounts, sessions, codes, and the account's taste, "Já vi" and streamings |
| `analytics`            | anonymous usage events                                                                   | no business module                  | usage events                                                               |
| `library` _(post-MVP)_ | My list, ratings, reviews                                                                | catalog, taste, accounts            | lists, ratings                                                             |
| `shared`               | everything that is not business                                                          | nothing                             | rate limits                                                                |

The dependency column is the table of [ADR 0001](adr/0001-modular-monolith.md) as amended by [ADR 0012](adr/0012-module-dependencies-after-f2-mapping.md). The About page is only a route in `app/`. Three modules are deliberately not created yet; each has a recorded trigger in [ADR 0001](adr/0001-modular-monolith.md): `search`, `support` and `social`.

## How the parts talk

- A module calls another through the functions its `index.ts` exports. When the dependency would point the wrong way, or several modules react to one fact, the fact is published as an in-process event ([ADR 0003](adr/0003-inter-module-communication.md)).
- One Postgres schema. Each module owns its tables and only its own repository touches them ([ADR 0004](adr/0004-database-ownership.md)).
- Routes are thin. Components of a subject live in the module; components with no business rule live in `shared/ui` ([ADR 0005](adr/0005-ui-placement.md)).
- A server action parses its input with the module's strict zod schema, calls the use case and answers `{ ok: true, data } | { ok: false, error }`, where `error` is a generic message. The detail goes only to the server log.

## Where the code is today

The migration to modules is phase F2 of the plan. `src/shared` exists since F2 PR 3; the modules do not exist yet. Until they do:

- Code lives in the layers `src/domain`, `src/application`, `src/infrastructure` and `src/app`. Dependencies point inward: app → application → domain.
- All tables are in `src/infrastructure/db/schema.ts`, except `rate_limit_buckets` and `meta`, which are defined in `src/shared/db/schema.ts` and re-exported there.
- Design tokens are in `src/app/globals.css` and the design system components in `src/shared/ui`. The page frame (`Shell`, `TopBar`, `Navbar`, `PageFrame`) is in `src/app/_shell`.
- The boundary rules for `src/modules` and `src/shared` are already configured, next to the rules for the current layers, so the first file moved is checked from day one.

Each module is moved in its own PR, in dependency order: `shared`, `catalog`, `taste`, `accounts`, `analytics`, `discovery`, `room`. Moving does not change behavior. The file-by-file map is in the [F2 migration plan](../plans/f2-migration.md).

## Rules that hold everywhere

- Security wins over minimal code: zod validation, `server-only`, CSP, headers, rate limits and session checks are never removed as unneeded. See [security.md](../security.md).
- No data in URL parameters and no console output in production.
- Code, commits, ADRs, guides and module READMEs are in English. Requirements and interface text are in Portuguese ([ADR 0007](adr/0007-documentation-language.md)).

## Where to read more

| Topic                             | Document                                                             |
| --------------------------------- | -------------------------------------------------------------------- |
| Rules checked by tools            | [boundaries.md](boundaries.md)                                       |
| Decisions and their reasons       | [adr/](adr/README.md)                                                |
| Security rules and accepted risks | [../security.md](../security.md)                                     |
| Design system rules               | [../../DESIGN.md](../../DESIGN.md)                                   |
| Requirements and user stories     | [../requisitos/](../requisitos/README.md)                            |
| Dependency diagram (generated)    | [../generated/dependencies.svg](../generated/dependencies.svg)       |
| Branch rulesets                   | [../operations/branch-rulesets.md](../operations/branch-rulesets.md) |
