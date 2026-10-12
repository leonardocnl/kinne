# Threat analysis — Recommendation rounds and the 18+ chip (phase 4)

Status: proposed 2026-10-12, awaiting the owner's approval. Every mitigation marked **AC** is an acceptance criterion of `feat/recommendation-rounds` and has a covering test unless it says otherwise.

## Scope

1. Filters rank by weighted rating (IMDb style) instead of raw rating.
2. With no genre selected, each round of 10 takes the 2 best of each of the five genres (3/3/2/2 without Romance for Séries).
3. Rounds of 10: when a round is used up the visitor can draw from the next 10, then from the last N, then restart. The client keeps the round number and the titles seen in sessionStorage.
4. A "18+" chip in the filters, off by default: off, certification-18 titles never appear; daily picks and Me surpreenda always exclude them.
5. Only `is_recommendable` titles enter rounds, daily picks and surprise (unchanged).

New input: `adult` (boolean) in the filters and `round` (integer) in the filtered draw. No new endpoint, table, grant, event or external call.

## Assets

| Asset                      | Why it matters                                                                           |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| Catalog suitability        | 18-rated titles must not reach anyone who did not ask for them                           |
| Draw integrity             | The visitor's choices (filters, round) must not be able to pull titles from outside them |
| Vercel and Neon free tiers | Round building runs on every filtered draw                                               |
| Test metrics               | Events keep their schema; analysis depends on it                                         |

## Entry points and trust boundaries

1. Browser → `drawFiltered`: **untrusted** filters (now with `adult`), `round`, watched and seen ids.
2. Browser → `filterCandidates`: response now carries an `adult` flag per title for the client counter.
3. sessionStorage → title screen and filters panel: the run (filters, watched, seen, round), read back on every draw (security §9).
4. Server-only paths that must ignore any client input about adult content: surprise and daily picks.

## Threats

### A. Tampering

| #   | Threat                                                                     | L / I | Mitigation                                                                                                                                                |
| --- | -------------------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Forged `adult: true` sent without using the chip                           | M / L | By design the chip is the visitor's own choice and there is no age verification in guest mode (accepted risk below); AC: strict boolean, default false    |
| A2  | 18-rated titles reaching surprise or daily picks through any input         | L / H | AC: surprise drops `adult` candidates in the domain whatever the request says; the daily picks query excludes certification 18; neither reads the filters |
| A3  | Forged `round` (negative, huge, text) to read past the end or force errors | M / L | AC: strict integer 0–999; a round past the last answers "nothing left" (end state), never an error or another round's titles                              |
| A4  | Forged `seen`/`watched` lists to shape the draw                            | M / L | AC: existing bounds (≤ 1000 positive integers); they can only remove titles from the visitor's own round, never add one                                   |
| A5  | Tampered sessionStorage run (round, adult, seen) breaking the screen       | M / L | AC: the run is validated on read; anything invalid resets to a new run with the current filters                                                           |

### B. Abuse and cost (Denial of service)

| #   | Threat                                                 | L / I | Mitigation                                                                                                                                                                                                  |
| --- | ------------------------------------------------------ | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Round building (rank about 9k titles) on every draw    | M / L | AC: pure, in-memory over the already cached candidate list; no new database query; O(n log n); measured on 9,000 titles: 2.6 ms with a genre, 6.1 ms without (scores computed once, outside the comparator) |
| B2  | Many rounds requested to scan the whole ranked catalog | L / L | Accepted: each answer is one slug of the visitor's own filters, the catalog is public TMDB data, and the per-person path keeps its limit                                                                    |

### C. Information disclosure

| #   | Threat                                                           | L / I | Mitigation                                                                                                                     |
| --- | ---------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------ |
| C1  | The counter list now includes 18-rated titles (ids and metadata) | L / L | AC: only the fields the counter needs (id, type, rating, votes, runtime, genres, streamings, adult); no title, slug or image   |
| C2  | Person suggestions surfacing adult-only filmographies            | M / M | AC: suggestions and their counts still exclude 18 (person-search C3); a person's title ids include 18 so that the chip decides |

### D. Integrity and repudiation

| #   | Threat                                                 | L / I | Mitigation                                                                                              |
| --- | ------------------------------------------------------ | ----- | ------------------------------------------------------------------------------------------------------- |
| D1  | Rounds differ between requests, so "no repeats" breaks | M / M | AC: rounds are deterministic for the same filters and watched snapshot (ties by votes, then id); tested |
| D2  | A title shown twice in one run (multi-genre titles)    | M / L | AC: a title is placed in one round only; tested                                                         |
| D3  | Event schema drifting with the feature                 | L / M | AC: no new event or source value; the existing zod event schema tests stay green                        |

### E. Elevation of privilege

None: no new grant, role or secret.

### F. Accessibility

| #   | Threat                                           | L / I | Mitigation                                                                                                            |
| --- | ------------------------------------------------ | ----- | --------------------------------------------------------------------------------------------------------------------- |
| F1  | The 18+ chip's meaning unclear to screen readers | M / L | AC: a pressed-state chip whose accessible name starts with its visible text ("18+", WCAG 2.5.3) and says what it does |
| F2  | End states move focus unpredictably              | M / M | AC: focus moves to the end state's main action, as today                                                              |

## Accepted risks (proposed, awaiting approval)

- A1: anyone can switch on 18+; guest mode has no age verification. The default is off, and surprise and daily picks never show 18-rated titles.
- B2: rounds let a visitor walk their own filtered ranking to the end.
