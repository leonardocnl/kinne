# 0002: Module boundaries and tooling

## Context

A modular monolith ([ADR 0001](0001-modular-monolith.md)) is only modular while its boundaries hold. Most of the code is written by AI agents, which follow a rule reliably only when breaking it fails a command. A rule that lives in prose erodes.

## Decision

Seven rules, each checked by a tool:

1. Between modules, import only through the other module's `index.ts`.
2. Dependencies between modules follow the module table.
3. No cycles.
4. Inside a module, `domain` imports no `application`, `infrastructure`, `ui`, `next` or `react`; `application` imports no `infrastructure` or `ui`.
5. Client code (`"use client"`) imports no server code (`server-only`, database, secrets).
6. A repository only accesses the tables of its own module.
7. `shared` imports no module.

Tools:

- **dependency-cruiser** checks rules 1 to 4, 6 and 7 (`npm run arch:check`) and generates the dependency diagram.
- **ESLint** checks rule 5 with the local rule `kinne/client-server-imports`, which also warns in the editor. It needs the `"use client"` directive, which dependency-cruiser does not see.

The checks run in three layers:

| Layer                  | When                                | What runs                                                         |
| ---------------------- | ----------------------------------- | ----------------------------------------------------------------- |
| Claude Code hook       | after an edit, at the end of a task | `arch:check`; review of the READMEs, ADRs and `DESIGN.md` touched |
| Git hooks              | `pre-commit`                        | format, lint, `arch:check`, generated docs                        |
|                        | `pre-push`                          | typecheck and unit tests                                          |
| CI and branch rulesets | every pull request                  | everything, as required checks                                    |

Git hooks are native: a `.githooks/` folder activated by the `prepare` script on `npm install`.

While the code is still in the old layers, equivalent rules cover `src/domain` and `src/application`. They are removed at the end of F2.

The rule names and commands are in [boundaries.md](../boundaries.md).

## Alternatives

- **Convention and code review only.** Rejected: nothing fails when a rule is broken.
- **ESLint for every rule.** Rejected: it has no view of the whole graph, so cycles and module direction are awkward to express, and it draws no diagram.
- **Husky for git hooks.** Rejected: a dependency for what `core.hooksPath` already does.
- **Check only in CI.** Rejected: the feedback arrives after the code is written; the hook returns it while the edit is fresh.

## Consequences

- A boundary violation fails in the editor session, at commit and in CI.
- `dependency-cruiser` is a development dependency, and the diagram needs Graphviz on the machine.
- Violations that predate the rules are listed in a known-violations file that only shrinks.
- The rule files (`.dependency-cruiser.cjs`, `eslint.config.mjs`, `.githooks/`, `.claude/`) are high-risk paths: only the owner merges changes to them ([ADR 0009](0009-review-and-auto-merge.md)).

## Status

Accepted, 2026-11-01. dependency-cruiser, the ESLint rule, the git hooks and CI are in place; the Claude Code hook is in review.
