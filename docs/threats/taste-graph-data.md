# Threat analysis — Taste graph data (extended sync and graph build)

Status: proposed 2026-10-23. Extends `catalog-sync.md` (whose mitigations all still apply) and complements `taste-graph.md` (request-time use of the graph). Model: `docs/design/taste-graph.md`. Every mitigation marked **AC** is an acceptance criterion with a covering test or a migration statement.

## Scope

1. The daily sync asks TMDB, in the same request per title, for recommendations, writers, series creators, production companies, collection and series type.
2. New tables: `production_companies`, `catalog_title_production_companies`, `tmdb_recommendations`, `title_neighbors`. New columns on `catalog_titles`: `series_type`, `collection_tmdb_id`. `title_credits.role` also accepts `creator` and `writer`.
3. A new step in the sync job, `graph:build`, reads the catalog, computes each recommendable title's 20 nearest neighbours and replaces `title_neighbors` in one transaction.
4. `SYNC_FULL=1` forces a full refresh (needed once to fill the new fields).

## Assets

| Asset                   | Why it matters                                                        |
| ----------------------- | --------------------------------------------------------------------- |
| Catalog integrity       | Recommendations and neighbours decide what visitors see               |
| Neon free tier (512 MB) | Two new link tables and ~100k neighbour rows                          |
| Actions minutes         | The graph build runs every day after the sync                         |
| Existing person search  | Writers and creators must not change who appears in "ator ou diretor" |

## Threats

### A. Tampering (TMDB as untrusted input)

| #   | Threat                                                                 | L / I | Mitigation                                                                                                                                                   |
| --- | ---------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A1  | Malformed or oversized recommendation lists                            | M / L | AC: strict zod schema, positive int ids, `media_type` only `movie`/`tv`, at most 20 kept in TMDB order; invalid entries dropped one by one                   |
| A2  | Recommendations pointing to titles outside the catalog or adult titles | H / M | AC: the graph build only links recommendable titles; a recommendation to anything else is ignored. Neighbours never bypass the hard filters (taste-graph A1) |
| A3  | Company names or series types used to inject content                   | L / M | AC: names sanitised and length-capped like other tags; series type mapped to a fixed enum, unknown values stored as null                                     |
| A4  | Community edits steering one title's neighbours (keyword spam)         | L / L | Accepted: rarity weighting and the 5% hub cut dilute spam; worst case is one title with odd neighbours, still inside the filters                             |

### B. Privileges

| #   | Threat                               | L / I | Mitigation                                                                                                                                                                                                                                |
| --- | ------------------------------------ | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | New tables writable by the app role  | L / H | AC: `kinne_app` gets SELECT only on `title_neighbors`; the company and recommendation tables are not granted to it at all (the app never reads them)                                                                                      |
| B2  | Sync role gaining more than it needs | L / M | AC: `kinne_sync` gets SELECT/INSERT/DELETE on the link tables and `title_neighbors`, INSERT/UPDATE (name only) on `production_companies`, no DELETE on `production_companies`, and UPDATE only on the two new columns of `catalog_titles` |

### C. Denial of service / cost

| #   | Threat                               | L / I | Mitigation                                                                                                                                            |
| --- | ------------------------------------ | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | More TMDB requests per title         | L / M | AC: everything comes through `append_to_response` in the existing details call; request count unchanged                                               |
| C2  | Graph build too slow for Actions     | L / M | Pairs are generated from an inverted index (only titles sharing a theme, person, company or recommendation are compared); measured in the run summary |
| C3  | Database growth                      | L / M | ~2,900 × 20 neighbour rows × 2 directions at most; the existing size warning (catalog-sync C2) covers it                                              |
| C4  | A failed build leaving no neighbours | M / M | AC: delete + insert in one transaction; a failure keeps yesterday's graph. The site falls back to today's ordering when a title has no neighbours     |

### D. Information disclosure / behaviour change

| #   | Threat                                          | L / I | Mitigation                                                                       |
| --- | ----------------------------------------------- | ----- | -------------------------------------------------------------------------------- |
| D1  | Writers and creators appearing in person search | H / L | AC: person suggestions and person filter read only `director` and `cast` credits |
| D2  | Graph build logs exposing data                  | L / L | AC: logs and summary carry only counts and timings (catalog-sync D1, D2)         |

## Accepted risks

- TMDB recommendations reflect TMDB users' behaviour, which skews to popular and English-language titles. Their weight is 23% of an edge (design §4).
