# 0006: Living documentation

## Context

Documentation written once goes stale, and stale documentation misleads the AI agents that read it before every task. Some facts can be derived from the code and should never be typed by hand. Others, such as purpose, vocabulary and reasons, can only be written.

## Decision

Two kinds of documentation, each with its own way of staying current.

**Generated**, in `docs/generated/`, never edited by hand:

- the dependency diagram;
- the database diagram per module;
- the public API of each module;
- the list of events and their subscribers.

It is regenerated at `pre-commit`, and CI fails when it is out of date.

**Written:**

- a `README.md` per module: purpose, vocabulary with an English ↔ Portuguese table, business rules, public API, events, owned tables, links to user stories;
- ADRs, the architecture overview and guides in `docs/guides/` (`new-module`, `new-migration`, `new-event`, `new-component`);
- `CLAUDE.md`, short, pointing to the rest.

**Triggers that keep written docs honest:**

- the Claude Code hook lists the folders a task touched and requires a review of their READMEs, the ADRs and `DESIGN.md`;
- CI fails when a module's `index.ts`, tables or events change without a change to its README;
- the PR template has a mandatory "documentation updated" field.

## Alternatives

- **Only written documentation.** Rejected: diagrams and API lists drift from the code within weeks.
- **Only generated documentation.** Rejected: it cannot say why, nor translate the vocabulary of the business.
- **A documentation site or external tool.** Rejected: one more thing to host and keep; Markdown in the repository is read by people and agents alike.

## Consequences

- The dependency diagram exists today; the other generated documents arrive with the modules in F2.
- A commit that touches `src/` regenerates the diagram, which needs Graphviz on the machine.
- The README check can be satisfied by a trivial edit. It is a reminder, and the reviewer decides whether the README is right.

## Status

Accepted, 2026-11-01. In place: the dependency diagram and its CI check. Pending: the other generated documents, module READMEs and the README check (F2).
