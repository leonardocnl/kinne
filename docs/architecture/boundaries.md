# Boundaries

The import rules of Kinne and the tool that checks each one. The reasons are in [ADR 0002](adr/0002-module-boundaries-and-tooling.md). A rule that only a person can check is not listed here: every rule below fails a command.

## The seven rules

| #   | Rule                                                                                                                                              | Checked by                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 1   | Between modules, import only through the other module's `index.ts`.                                                                               | dependency-cruiser: `module-public-api`                                                               |
| 2   | Dependencies between modules follow the table in the [overview](overview.md#modules).                                                             | dependency-cruiser: `module-direction-<module>`                                                       |
| 3   | No dependency cycles.                                                                                                                             | dependency-cruiser: `no-circular`                                                                     |
| 4   | Inside a module, `domain` imports no `application`, `infrastructure`, `ui`, `next` or `react`; `application` imports no `infrastructure` or `ui`. | dependency-cruiser: `module-domain-pure`, `module-domain-no-framework`, `module-application-no-outer` |
| 5   | Client code (`"use client"`) imports no server code (`server-only`, database, auth, TMDB).                                                        | ESLint: `kinne/client-server-imports`                                                                 |
| 6   | Only a module's own code imports its table definitions, and `index.ts` never re-exports them.                                                     | dependency-cruiser: `module-own-tables`, `module-index-hides-tables`                                  |
| 7   | `shared` imports no business module.                                                                                                              | dependency-cruiser: `shared-no-modules`                                                               |

Two more rules support these: `no-routes-from-below` (nothing imports `src/app`; routes only call modules and `shared`) and `not-to-unresolvable` (every import resolves).

Rule 5 is in ESLint because it depends on the `"use client"` directive, which dependency-cruiser does not see.

## Rules for the current layers

Until phase F2 moves the code to `src/modules`, the same idea is enforced on the layers that exist today:

| Rule                                                              | Checked by                                        |
| ----------------------------------------------------------------- | ------------------------------------------------- |
| `src/domain` imports no `application`, `infrastructure` or `app`. | dependency-cruiser: `legacy-domain-pure`          |
| `src/domain` imports neither `next` nor `react`.                  | dependency-cruiser: `legacy-domain-no-framework`  |
| `src/application` imports no `infrastructure` or `app`.           | dependency-cruiser: `legacy-application-no-outer` |

These three rules are deleted when the last module is moved and the old folders are empty.

## Running the checks

| Command              | What it does                                                       |
| -------------------- | ------------------------------------------------------------------ |
| `npm run arch:check` | Checks every dependency-cruiser rule on `src/` (about one second). |
| `npm run lint`       | Runs ESLint, including rule 5.                                     |
| `npm run arch:graph` | Regenerates `docs/generated/dependencies.svg` (needs Graphviz).    |

Configuration: `.dependency-cruiser.cjs` and `eslint.config.mjs`.

## Where a violation is caught

| Layer            | When               | What runs                                                                               |
| ---------------- | ------------------ | --------------------------------------------------------------------------------------- |
| Claude Code hook | after an edit      | `arch:check` (arrives with `.claude/hooks/`, F1 item 5)                                 |
| `pre-commit`     | every commit       | Prettier and ESLint on staged files; `arch:check` and the diagram when `src/` is staged |
| `pre-push`       | every push         | typecheck and unit tests                                                                |
| CI               | every pull request | jobs `arch`, `lint` and `generated-docs`, required by the branch rulesets               |

The git hooks live in `.githooks/` and are activated by `npm install`. They are never skipped (`--no-verify` is not allowed).

## Known violations

`arch:check` runs with `--ignore-known`. The file `.dependency-cruiser-known-violations.json` lists violations that existed when the rules were introduced: three `no-circular` entries in `src/domain` (`draw-order.ts`, `rounds.ts`, `filters.ts`). They are resolved when `discovery` is moved in F2.

The list only shrinks. A new violation is fixed, never added to this file.

## Changing a rule

- A new module is added to `ALLOWED_MODULE_DEPS` in `.dependency-cruiser.cjs`, to the table in the [overview](overview.md#modules) and, when its dependencies are a decision, to an ADR.
- A rule is loosened only by an ADR that says why. `.dependency-cruiser.cjs` and `eslint.config.mjs` are high-risk paths, so only the owner merges that change ([ADR 0009](adr/0009-review-and-auto-merge.md)).
- A cross-module query needed for performance is not an exception to rule 6. It is a named read model with its own ADR ([ADR 0004](adr/0004-database-ownership.md)).
