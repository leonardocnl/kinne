# 0013: Read model: daily picks

## Context

The home page shows the five picks of the day with poster, genres and where to watch. `daily_picks` belongs to `discovery` and holds only the day, the position and the title ID. Everything shown comes from `catalog` tables. The job that chooses the picks also needs every recommendable title with its genres and streamings, and the history of past picks.

## Decision

`DailyPicksRepository`, in `discovery`, is the named read model **`daily-picks`**. It may read these `catalog` tables together with `daily_picks`: `catalog_titles`, `genres`, `catalog_title_genres`, `streaming_services`, `streaming_availability`. It writes only `daily_picks`.

A call through `catalog`'s public API is not enough because the picks are read in one query that joins and orders by pick position, over the Neon HTTP driver: fetching the IDs and then the titles would be two round trips on the home page.

The exception is one `pathNot` for this file in the `module-own-tables` rule, added when `discovery` is moved.

## Alternatives

- **Two calls** (`discovery` reads the IDs, `catalog` returns the titles). Rejected: one more round trip on the most visited page.
- **Move `daily_picks` to `catalog`.** Rejected: choosing what to show today is `discovery`'s subject.

## Consequences

- A change to the columns of those five tables can break this query; the `catalog` README lists the read model as a reader.
- This is the first read model. The filtered draw, the example given in [ADR 0004](0004-database-ownership.md), turned out to read only `catalog` tables and needs none.

## Status

Accepted, 2026-11-15. Applied when `discovery` is moved (F2).
