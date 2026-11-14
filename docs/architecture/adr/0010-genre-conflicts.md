# 0010: Genre conflicts

## Context

People who asked for a comedy were shown titles such as Parasite, which TMDB tags as Comedy, Thriller and Drama. A title matched the filter because it carried the requested genre, even when another of its genres contradicted the mood the person asked for. Story: [US017](../../requisitos/us017-conflitos-de-genero.md).

## Decision

The rule lives in `discovery` as a pure domain function (today `src/domain/genre-conflicts.ts`).

**Exclusion.** A title is excluded when it also has a genre that conflicts with a requested one:

| Requested         | Excluded if it also has |
| ----------------- | ----------------------- |
| Comedy            | Horror, Thriller, War   |
| Romance           | Horror, War             |
| Family, Animation | Horror, Thriller, Crime |
| Horror            | Family                  |
| Thriller          | Family                  |
| Drama             | nothing                 |
| Action            | nothing                 |

- War is only the film genre (TMDB 10752). "War & Politics", from series, does not count, so satires such as Veep stay.
- Thriller as a conflict is only TMDB 53.

**Order.** Each genre beyond the requested ones subtracts 0.10 (`EXTRA_GENRE_PENALTY`) from the weighted rating, and titles are ordered by the adjusted rating. "Purer" titles rise, and a very well rated title with several genres still appears.

- The penalty applies only with a requested genre, without a feeling, and when taste does not give the order. With taste signals, the order comes from the taste graph.
- If the result is empty, the conflicts are relaxed and the penalty is kept.

## Alternatives

- **Match on the requested genre only.** Rejected: it is the behavior people complained about.
- **Keep only titles whose genres are exactly the requested ones.** Rejected: most good titles have several genres, and the result would often be empty.
- **Penalize conflicting genres instead of excluding.** Rejected: a highly rated thriller would still surface for someone who asked for a comedy.
- **Count "War & Politics" as War.** Rejected: it removes political satires from Comedy.

## Consequences

- The table is a product decision. Changing a row, the penalty or the relaxation is a change to US017 and to this record.
- The rule depends on TMDB's genre tagging, including its mistakes.
- Mandatory test: asking for Comedy does not return Parasite. Each row of the table, the order by purity and the relaxation are covered by tests.

## Status

Accepted, 2026-11-01. Implemented and in production (US017).
