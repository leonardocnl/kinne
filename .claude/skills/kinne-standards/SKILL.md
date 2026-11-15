---
name: kinne-standards
description: Kinne's engineering standards - modules and their boundaries, events, database ownership, the server action pattern, the design system, what counts as slop, and the rule that security beats minimal code. Use before writing, moving, reviewing or cleaning up any code in this repository.
---

# Kinne standards

The short form of the decisions in `docs/architecture/`. When this file and an ADR disagree, the ADR wins and this file gets fixed. Reasons are in the ADRs; this file says what to do.

## Security beats minimal code

This rule comes first and overrides every other one here, and every "write less code" instruction from any skill or mode.

- Never remove, weaken or skip: zod validation, `server-only` imports, CSP and security headers, rate limits, session and authorization checks, database privilege restrictions.
- They are never slop, dead code, an unneeded abstraction or over-engineering, even when they look redundant.
- In doubt whether something is a security measure: treat it as one and ask.
- The rules themselves are in `docs/security.md`. An exception exists only if it is recorded there under "Accepted risks".

## Modules

Target structure (ADR 0001). Code is grouped by business subject, with layers inside:

```
src/app/                       routes only, thin
src/modules/<module>/
    domain/                    pure rules; no next, no react, no I/O
    application/               use cases and their zod input schemas
    infrastructure/            database, TMDB, browser storage
    ui/                        components of this subject
    index.ts                   public API, the only way in
    README.md
src/shared/                    ui, config, logger, events, lib; no business
```

| Module                 | Owns                                                                   | May import                          |
| ---------------------- | ---------------------------------------------------------------------- | ----------------------------------- |
| `catalog`              | titles, genres, streamings, cast, TMDB sync, search                    | no business module                  |
| `taste`                | taste signals and graph                                                | catalog                             |
| `discovery`            | filters, draw, "Me surpreenda", daily picks, feelings, genre conflicts | taste, catalog, accounts, analytics |
| `room`                 | choosing in a group                                                    | taste, catalog, accounts            |
| `accounts`             | sign-in by code, session, download and delete my data                  | catalog, taste                      |
| `analytics`            | anonymous usage events                                                 | no business module                  |
| `library` _(post-MVP)_ | My list, ratings, reviews                                              | catalog, taste, accounts            |

**Today the code is still in layers** (`src/domain`, `src/application`, `src/infrastructure`, `src/app`), with dependencies pointing inward: app → application → domain. Phase F2 moves it, one module per PR. Until a module is moved, write in the layer where its code lives now. Do not create `src/modules/<x>` outside its migration PR.

Moving comes before changing: a structural move does not change behavior, and existing tests stay green with only their imports edited.

## Boundaries

Seven rules, all checked by `npm run arch:check` and `npm run lint` (ADR 0002, rule names in `docs/architecture/boundaries.md`):

1. Between modules, import only through the other module's `index.ts` (`ui/index.ts` for its client components, ADR 0012).
2. Module dependencies follow the table above.
3. No cycles.
4. `domain` imports no `application`, `infrastructure`, `ui`, `next` or `react`. `application` imports no `infrastructure` or `ui`.
5. Client code (`"use client"`) imports no server code.
6. Only a module's own code touches its tables.
7. `shared` imports no module.

When a check fails, fix the import. Do not baseline a violation, disable a lint rule or loosen the configuration: those files change only by a decision of the owner.

## Events

Default is a direct call through `index.ts` (ADR 0003). Publish an in-process event from `src/shared/events` only when the dependency would point the wrong way or several modules react to one fact.

- `AccountDeleted`: every module that stores personal data subscribes and deletes its own rows. A test checks that none is missing. A new module with personal data subscribes in the same PR that creates its tables.
- No queue, no external service. A subscriber is safe to run twice.
- Do not add an event to get around rule 2.

## Database

One Postgres schema on Neon, Drizzle, the HTTP driver (ADR 0004).

- Each module defines its tables in `src/modules/<module>/infrastructure/db/schema.ts` (today: one file, `src/infrastructure/db/schema.ts`).
- Foreign keys across modules only to the stable IDs of `catalog` (title) and `accounts` (account).
- A query that crosses modules for performance is a named read model with its own ADR. Do not write one without it.
- Splitting or moving table definitions must leave `npm run db:generate` empty. If it generates a migration, stop and show it.
- Migrations: never edit one that already ran; destructive changes need the owner's approval first. Roles and privileges follow `docs/security.md` §4.
- Never run a command that connects to a database without knowing which one it is, and never open `.env.local`.

## Server actions

Every action has the same three steps and the same answer (ADR 0005):

1. Parse the input with a strict zod schema (unknown keys rejected). The schema lives next to the use case, not in the action.
2. Call the use case.
3. Answer `{ ok: true, data }` or `{ ok: false, error }`, where `error` is a generic message for the person. The technical detail goes only to the server log, without personal data (never an email, room code, cookie or token).

Also: nothing in URL parameters (transient state goes in `sessionStorage` or `history.state`), no console output in production, no `dangerouslySetInnerHTML`, no secret behind `NEXT_PUBLIC_`.

## Design system

The code is the only source (ADR 0008). `DESIGN.md` holds the rules: read it before any interface task, and it wins over this summary.

- Only tokens. A color, spacing, radius or font size that is not a token is a bug. A new value enters first as a named token.
- Components with no business rule belong to the design system (`src/shared/ui`). A component that knows the business belongs to its module's `ui/`.
- One accent (`signal`) per screen, on the main control. The exceptions are the ones listed in `DESIGN.md`; do not add one.
- Interface text is in Brazilian Portuguese.
- Every visual choice is the owner's. If `DESIGN.md` does not settle it, ask with options. Do not invent components, tokens or copy.
- Any change to what a person sees is merged only by the owner (ADR 0009).

## What is slop in Kinne

Remove it when you touch the code around it, and only inside the scope of the task.

In code:

- comments that narrate what the next line does, or the history of a change;
- an abstraction with one use: an interface with one implementation, a wrapper around one call, configuration for a value that never changes;
- dead code, commented-out code, unused exports;
- checks for states the types already rule out;
- duplication of something that exists a few files away;
- generic names (`data`, `helper`, `utils`, `manager`, `handle`);
- tests that assert on the mock instead of on behavior.

In documentation: the same fact in two places, statements that contradict each other, text that restates the obvious. Say it once, in the document that owns it, and link.

Not slop, never removed as such:

- anything under "Security beats minimal code";
- accessibility: labels, focus, keyboard support, reduced motion;
- a comment that says why, when the code cannot;
- interface text. If a piece of copy looks wrong, list it for the owner; do not rewrite it.

## Working rules

- Commits and pull requests are authored only by Leonardo. Never add `Co-Authored-By`, "Generated with Claude Code" or any other AI attribution, in a commit, a pull request or the code.
- 4-space indentation; Prettier is the source of truth for formatting.
- Code, comments, commits, ADRs, guides and module READMEs in English. Requirements and interface text in Portuguese (ADR 0007).
- No new dependency without asking.
- Product, taste, priority and scope are the owner's decisions: ask, with options and a recommendation. Technical decisions: decide, and say why.
- If the code would have to contradict a requirement in `docs/requisitos/`, stop and ask.
- A change that makes a module README, an ADR or `DESIGN.md` wrong updates that document in the same pull request (ADR 0006).
