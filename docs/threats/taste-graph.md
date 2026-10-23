# Threat analysis — Taste graph, feelings and invisible taste

Status: proposed 2026-10-22, revised 2026-10-23 for the nearest-neighbour model (`docs/design/taste-graph.md`); the data side is in `taste-graph-data.md`. Covers stage 1 (graph and feeling recipes, pure domain plus a calibration script) and the input surface stage 2 will add (feeling chip in Escolher agora, taste signals sent by the browser, "Curtiu?" after "Já vi"). Every mitigation marked **AC** becomes an acceptance criterion with a covering test in the branch that implements it.

## Scope

1. A nearest-neighbour graph between recommendable titles: each title keeps its 20 closest titles, the edge weight being content proximity (themes, genres, authorship, writers, companies, series type, collection) and TMDB recommendations. Built daily by `graph:build`, never at request time.
2. Taste: the visitor's signals spread over at most three edges, with fixed damping. Feelings do not walk the graph: they classify each title by its own genres, themes and certification.
3. Nine feelings, each a fixed recipe of genre and keyword seeds written in code.
4. Stage 2: the browser keeps the visitor's taste signals (liked, disliked, "vou assistir", "não me interessa") in localStorage and sends them with each draw; the server scores and ranks after the existing hard filters.
5. Group score = the least satisfied member's percentile (used by the group room, analysed in its own document).

## Assets

| Asset                      | Why it matters                                                                     |
| -------------------------- | ---------------------------------------------------------------------------------- |
| Draw integrity             | Taste may only reorder titles the hard filters already allow                       |
| Visitor privacy            | Taste reveals something about a person; it must not leak to other visitors or logs |
| Vercel and Neon free tiers | The graph is built from the whole catalog; a forced rebuild per request is costly  |
| Catalog suitability        | Ranking must never surface 18-rated or blocked titles that filters would have cut  |

## Entry points and trust boundaries

1. Browser → filtered draw / surprise: **untrusted** `feeling` id and taste lists (title ids with a signal).
2. localStorage → client: taste lists read back on every draw (security §9: treat as untrusted, validate on read).
3. Server-only: catalog → graph build (trusted data from the sync).

## Threats

### A. Tampering

| #   | Threat                                                         | L / I | Mitigation                                                                                                                                        |
| --- | -------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Forged taste lists to pull a title from outside the filters    | M / M | AC: ranking runs **after** the hard filters (streaming, floor, 18+, blocked, watched); scores can only reorder the eligible pool, never add to it |
| A2  | Oversized or malformed taste lists (100k ids, negatives, text) | M / L | AC: strict zod schema, ≤ 200 entries per signal, positive integers, unknown keys rejected; ids not in the catalog are silently ignored as seeds   |
| A3  | Forged `feeling` value                                         | M / L | AC: enum of the nine ids; anything else is rejected by the schema, never looked up dynamically                                                    |
| A4  | Weights or recipes sent by the client                          | L / M | By design the client sends only signal type and title id; weights, restart and iterations are server constants, never request fields              |

### B. Information disclosure

| #   | Threat                                                           | L / I | Mitigation                                                                                                                                      |
| --- | ---------------------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Taste lists written to server logs or usage events               | M / M | AC: taste lists never go into `anonymous_usage_events` or logs; events record only that a signal happened (existing event schema), not the list |
| B2  | A response revealing another visitor's taste (shared cache)      | L / H | AC: personalised ranking is never cached across requests; only the graph (catalog-only data) is cached                                          |
| B3  | Explanation of "why this title" exposing internals or other data | L / L | Out of scope: the feature is invisible by decision; no explanation is returned                                                                  |

### C. Denial of service / cost

| #   | Threat                                      | L / I | Mitigation                                                                                                                          |
| --- | ------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Requests forcing a graph rebuild every time | M / M | AC: the graph is built from catalog data only and cached per sync run (`meta`/revalidation tag); no request field can invalidate it |
| C2  | Many seeds making the spread slow           | L / L | Three fixed steps and bounded seeds (A2); cost is O(seeds × 20³) at worst, measured at ~8 ms on a catalog-sized graph               |
| C3  | Draw endpoint flooded                       | M / L | Existing rate limit on draws applies unchanged                                                                                      |

## Accepted risks

- Taste lives in the visitor's browser (no accounts, decision of 2026-10-22). Anyone with access to the device sees it; clearing site data erases it.
- A visitor can forge their own taste lists. The only effect is a worse ranking for themselves (A1 keeps them inside the filters).
