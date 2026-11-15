# catalog

The catalog of titles that can be recommended: movies and series, their genres, streamings, cast and credits, loaded from TMDB. It also owns the title page data and the search by title and by person.

## Vocabulary

| English                            | Portuguese                   | In the code                                       |
| ---------------------------------- | ---------------------------- | ------------------------------------------------- |
| title                              | título                       | `catalogTitles`, `TitleType` (`movie`, `series`)  |
| streaming (service)                | streaming (serviço)          | `domain/streaming.ts`, `streamingServices`        |
| genre (Kinne genre)                | gênero                       | `domain/genre.ts`, `KinneGenre`                   |
| cast, directors                    | elenco, diretores            | `domain/credits.ts`, `titleCredits`               |
| credits                            | créditos                     | `titleCredits`, `people`                          |
| candidate                          | candidato                    | `domain/candidate.ts`, `candidates()`             |
| quality floor                      | piso de qualidade            | `meetsQualityFloor`, `MIN_RATING`                 |
| recommendable                      | recomendável                 | `isRecommendable`                                 |
| certification (age rating, Brazil) | classificação indicativa     | `certificationBr`, `domain/catalog-sync.ts`       |
| search                             | busca                        | `domain/search.ts`, `application/title-search.ts` |
| person search                      | busca por pessoa             | `domain/person-search.ts`                         |
| sync                               | carga (do catálogo)          | `application/sync-catalog.ts`, `syncRuns`         |
| circuit breaker                    | disjuntor (da busca no TMDB) | `circuitBreakers`                                 |

## Entry files

| File          | For                                                                                                                         |
| ------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`    | Isomorphic public API: domain rules and use cases. Safe in client code.                                                     |
| `server.ts`   | Server only (`import "server-only"`): repositories, TMDB client, cached loaders, revalidation. Never re-exports tables.     |
| `ui/index.ts` | Components, the title origin helpers and the server actions of search, people and onboarding. Client and server components. |

Code outside the module imports only these three files. Inside the module, relative paths.

## Owned tables

`catalogTitles`, `genres`, `catalogTitleGenres`, `themeKeywords`, `catalogTitleThemeKeywords`, `streamingServices`, `streamingAvailability`, `people`, `titleCredits`, `productionCompanies`, `catalogTitleProductionCompanies`, `tmdbRecommendations`, `syncRuns`, `searchCache`, `circuitBreakers`, `searchCounters`. Defined in `infrastructure/db/schema.ts`.

## Known readers outside the module

- The taste graph build reads the catalog tables (`taste-graph-repository.ts`).
- The `daily-picks` read model reads them ([ADR 0013](../../../docs/architecture/adr/0013-read-model-daily-picks.md)).
- The sync's cross-module queries (`titleReferenced` and the purges in `catalog-repository.ts`; [ADR 0012](../../../docs/architecture/adr/0012-module-dependencies-after-f2-mapping.md), E2 and E3).

## Read more

- Threat analyses: [catalog-sync](../../../docs/threats/catalog-sync.md), [title-search](../../../docs/threats/title-search.md), [person-search](../../../docs/threats/person-search.md), [title-credits](../../../docs/threats/title-credits.md).
- ADRs: [0001](../../../docs/architecture/adr/0001-modular-monolith.md), [0004](../../../docs/architecture/adr/0004-database-ownership.md), [0012](../../../docs/architecture/adr/0012-module-dependencies-after-f2-mapping.md).
