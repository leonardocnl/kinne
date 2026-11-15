# Architecture decision records

One file per decision, in English, short: Context, Decision, Alternatives, Consequences, Status. Most of these record the architecture interview of 2026-11-01 ([foundation plan](../../plano-fundacao.md)).

| ADR                                                  | Decision                                                                          |
| ---------------------------------------------------- | --------------------------------------------------------------------------------- |
| [0001](0001-modular-monolith.md)                     | Modular monolith: modules by business subject, layers inside                      |
| [0002](0002-module-boundaries-and-tooling.md)        | Seven boundary rules, checked by dependency-cruiser and ESLint                    |
| [0003](0003-inter-module-communication.md)           | Direct calls by default, in-process events when direction forbids                 |
| [0004](0004-database-ownership.md)                   | One schema, tables owned by modules, named read models                            |
| [0005](0005-ui-placement.md)                         | Thin routes, module UI, shared design system                                      |
| [0006](0006-living-documentation.md)                 | Generated docs plus written docs, kept current by hooks and CI                    |
| [0007](0007-documentation-language.md)               | English for code and technical docs, Portuguese for product text                  |
| [0008](0008-design-system-code-as-source.md)         | The code is the only source of the design system                                  |
| [0009](0009-review-and-auto-merge.md)                | Review by a separate agent, risk by changed paths, limited auto-merge             |
| [0010](0010-genre-conflicts.md)                      | Conflicting genres exclude a title; extra genres lower its order                  |
| [0011](0011-progressive-streaming-profile.md)        | Streamings are learned by use, with no mandatory step                             |
| [0012](0012-module-dependencies-after-f2-mapping.md) | Dependencies of accounts, room and discovery amended; registered table exceptions |
| [0013](0013-read-model-daily-picks.md)               | Read model: daily picks joined with catalog tables                                |

## Writing a new one

- Next free number, kebab-case title: `0014-<subject>.md`.
- Keep the five sections. Alternatives lists what was rejected and why in one line each.
- An accepted ADR is not rewritten. A change of decision is a new ADR; the old one gets `Status: Superseded by 00NN`. Small corrections that do not change the decision are edited in place with a dated note under Status.
- A named read model ([ADR 0004](0004-database-ownership.md)) always gets its own ADR.
