# 0007: Documentation language

## Context

Kinne is a Brazilian product: the interface, the requirements and the people who gave feedback are in Portuguese. The code, the tools and the agents work best in English. Before this decision the repository mixed both in the same kind of document.

## Decision

| In English                                                                | In Portuguese                                      |
| ------------------------------------------------------------------------- | -------------------------------------------------- |
| Code, file names, commits, pull requests                                  | Requirements and user stories (`docs/requisitos/`) |
| Code comments                                                             | Interface text (pt-BR)                             |
| Module READMEs, ADRs, architecture docs, guides, security and threat docs | `DESIGN.pt-BR.md`, the translation of `DESIGN.md`  |
| `DESIGN.md`, the source of the design rules                               | Examples in the Voice section of the design docs   |

- Each module README carries a vocabulary table, English ↔ Portuguese, so a term in the code can be traced to the word used in the requirements and on screen.
- `DESIGN.pt-BR.md` has the same structure as `DESIGN.md`; a test compares the two.
- Documents that already exist keep their language until the phase that rewrites them. A file is never half translated.

## Alternatives

- **Everything in Portuguese.** Rejected: identifiers and commits are already in English, and mixed-language code reads worse than either.
- **Everything in English.** Rejected: requirements are written and validated with Portuguese speakers, and interface text is Portuguese by definition.

## Consequences

- The vocabulary table is where the two languages meet; a term missing from it is a documentation gap.
- The design rules exist in two files that must be changed together.
- `README.md`, `CLAUDE.md`, the layer READMEs and `DESIGN.md` are still in Portuguese today. `DESIGN.md` moves to English in F3; layer READMEs are replaced by module READMEs in F2.

## Status

Accepted, 2026-11-01. Comments follow the general rules of the foundation plan (English); existing comments in Portuguese are not rewritten for this alone.
