# Threat analysis — Taste graph, feelings and invisible taste

Status: proposed 2026-10-22, awaiting the owner's approval. Covers stage 1 (graph and feeling recipes, pure domain plus a calibration script) and the input surface stage 2 will add (feeling chip in Escolher agora, taste signals sent by the browser, "Curtiu?" after "Já vi"). Every mitigation marked **AC** becomes an acceptance criterion with a covering test in the branch that implements it.

## Scope

1. A bipartite graph between catalog titles and their features (TMDB genres, theme keywords, director and top-5 cast), weighted by feature rarity (IDF).
2. Personalized PageRank over that graph. Seeds are titles (taste) or features (feeling recipes); dislikes are a second run subtracted from the first.
3. Nine feelings, each a fixed recipe of genre and keyword seeds written in code.
4. Stage 2: the browser keeps the visitor's taste signals (liked, disliked, "vou assistir", "não me interessa") in localStorage and sends them with each draw; the server scores and ranks after the existing hard filters.
5. Group score = the least satisfied member's percentile (used by the group room, analysed in its own document).

## Assets

| Asset                      | Why it matters                                                                      |
| -------------------------- | ----------------------------------------------------------------------------------- |
| Draw integrity             | Taste may only reorder titles the hard filters already allow                        |
| Visitor privacy            | Taste reveals something about a person; it must not leak to other visitors or logs  |
| Vercel and Neon free tiers | The graph is built from the whole catalog; a forced rebuild per request is costly   |
| Catalog suitability        | Ranking must never surface 18-rated or blocked titles that filters would have cut   |

## Entry points and trust boundaries

1. Browser → filtered draw / surprise: **untrusted** `feeling` id and taste lists (title ids with a signal).
2. localStorage → client: taste lists read back on every draw (security §9: treat as untrusted, validate on read).
3. Server-only: catalog → graph build (trusted data from the sync).

## Threats

### A. Tampering

| #   | Threat                                                                    | L / I | Mitigation                                                                                                                                         |
| --- | ------------------------------------------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Forged taste lists to pull a title from outside the filters               | M / M | AC: ranking runs **after** the hard filters (streaming, floor, 18+, blocked, watched); scores can only reorder the eligible pool, never add to it  |
| A2  | Oversized or malformed taste lists (100k ids, negatives, text)            | M / L | AC: strict zod schema, ≤ 200 entries per signal, positive integers, unknown keys rejected; ids not in the catalog are silently ignored as seeds     |
| A3  | Forged `feeling` value                                                    | M / L | AC: enum of the nine ids; anything else is rejected by the schema, never looked up dynamically                                                     |
| A4  | Weights or recipes sent by the client                                     | L / M | By design the client sends only signal type and title id; weights, restart and iterations are server constants, never request fields              |

### B. Information disclosure

| #   | Threat                                                                 | L / I | Mitigation                                                                                                                                       |
| --- | ---------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| B1  | Taste lists written to server logs or usage events                     | M / M | AC: taste lists never go into `anonymous_usage_events` or logs; events record only that a signal happened (existing event schema), not the list |
| B2  | A response revealing another visitor's taste (shared cache)            | L / H | AC: personalised ranking is never cached across requests; only the graph (catalog-only data) is cached                                           |
| B3  | Explanation of "why this title" exposing internals or other data       | L / L | Out of scope: the feature is invisible by decision; no explanation is returned                                                                    |

### C. Denial of service / cost

| #   | Threat                                                         | L / I | Mitigation                                                                                                                                                       |
| --- | -------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Requests forcing a graph rebuild every time                    | M / M | AC: the graph is built from catalog data only and cached per sync run (`meta`/revalidation tag); no request field can invalidate it                              |
| C2  | Many seeds making PageRank slow                                | L / L | Fixed iterations (30) and bounded seeds (A2); cost is O(iterations × edges), independent of seed count. Measured in stage 2 against the real catalog |
| C3  | Draw endpoint flooded                                          | M / L | Existing rate limit on draws applies unchanged                                                                                                                  |

## Accepted risks

- Taste lives in the visitor's browser (no accounts, decision of 2026-10-22). Anyone with access to the device sees it; clearing site data erases it.
- A visitor can forge their own taste lists. The only effect is a worse ranking for themselves (A1 keeps them inside the filters).
