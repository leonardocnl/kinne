# Threat analysis — Feelings, invisible taste and "Curtiu?" (US008, US009, US010)

Status: proposed 2026-10-23, awaiting the owner's approval. Complements `taste-graph.md` (request-time use of the graph) and `taste-graph-data.md` (sync and build). Every mitigation marked **AC** is an acceptance criterion with a covering test in the branch that implements it.

## Scope

1. A feeling chip set in the filters panel; the server sends a 9-bit feeling mask per candidate for the client counter (US008 RNE004).
2. Taste signals in `localStorage` (`kinne:taste`: liked, disliked, will watch; ≤ 200 each), sent with every filtered draw and every surprise draw.
3. The server loads the neighbour graph (`title_neighbors`) once per catalog version and reorders draws by taste.
4. A "Curtiu?" 👍/👎 prompt after "Já vi" writes a signal to `localStorage` only.

New inputs: `feeling` (enum) in the filter request; `taste` (three id lists) in the filter and surprise requests. No new route, table, event or external call.

## Assets

| Asset                       | Why it matters                                                                            |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| Draw integrity              | Taste and feeling may only reorder or narrow what the hard filters allow                  |
| Visitor privacy             | Taste lists say what a person likes; they must not leak to logs, events or other visitors |
| Catalog suitability         | The lowered floor (US009 RNE003) must never let 18-rated or blocked titles through        |
| Free tiers (Vercel, Neon)   | The graph is large; loading it per request would cost compute and memory                  |
| Recipe and weight internals | Not secret, but exposing them invites gaming and couples the client to tuning             |

## Entry points and trust boundaries

1. Browser → `drawFiltered`, `surprise`: **untrusted** `feeling` and `taste`, alongside the existing fields.
2. `localStorage` → client code: `kinne:taste` read back on every draw (security §9: validate on read, fall back to empty).
3. Server → browser: candidate list gains `feelings` (bit mask).
4. Database → server: `title_neighbors` read by `kinne_app` (SELECT only, migration 0009).

## Threats

### A. Tampering

| #   | Threat                                                                     | L / I | Mitigation                                                                                                                                                                             |
| --- | -------------------------------------------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Forged taste lists to pull a title from outside the filters                | M / M | AC: taste only reorders the pool the hard filters produced; a test sends a liked id of an 18-rated / other-streaming / blocked title and checks it never comes back                    |
| A2  | Forged taste lists to bypass the rating floor (lowered for reached titles) | M / M | AC: the lowered floor applies only to titles with a positive score **and** ≥ 100 votes; 18+, blocked and streaming rules are checked before scoring and never relaxed                  |
| A3  | Oversized or malformed lists (100k ids, negatives, strings, duplicates)    | M / L | AC: strict zod (`z.strictObject`), ≤ 200 positive ints per list, unknown keys rejected, duplicates collapsed, an id in two lists keeps the most negative; ids not in the graph ignored |
| A4  | Forged `feeling` value                                                     | M / L | AC: `z.enum(FEELINGS)` or null; never used as a lookup key into anything but the fixed recipe map                                                                                      |
| A5  | Forged feeling mask in a replayed candidate list                           | L / L | By design the mask only drives the client counter; the server recomputes `feelingAllows` on every draw                                                                                 |
| A6  | Weights, damping or floor sent by the client                               | L / M | By design the request carries only ids and the enum; all numbers are server constants. AC: the schema has no numeric tuning field                                                      |

### B. Information disclosure

| #   | Threat                                                    | L / I | Mitigation                                                                                                                                |
| --- | --------------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Taste lists or 👍/👎 written to events or logs            | M / M | AC: no event schema change; a test asserts `anonymous_usage_events` payloads carry no taste field; server logs never print request bodies |
| B2  | One visitor's ranking served to another through a cache   | L / H | AC: only catalog-only data is cached (candidates, graph); personalised ranking is computed per request and never cached                   |
| B3  | Error messages revealing graph internals                  | L / L | Generic errors (security rule); a graph load failure falls back to today's order silently (US009 RNE006)                                  |
| B4  | Taste in `localStorage` readable by injected script (XSS) | L / M | Existing CSP and no `dangerouslySetInnerHTML`; values are ids only, so an attacker gains little. Accepted below                           |

### C. Denial of service / cost

| #   | Threat                                    | L / I | Mitigation                                                                                                                                                      |
| --- | ----------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Graph loaded from Neon on every request   | M / M | AC: `'use cache: remote'` keyed to the catalog tags, revalidated by `graph:build` through the existing revalidation endpoint; measured cold-load time in the PR |
| C2  | Large signal lists making the spread slow | L / L | Bounded lists (A3) and three fixed steps; ~8 ms measured on a catalog-sized graph. AC: a test with 600 signals finishes under 100 ms                            |
| C3  | Draw endpoints flooded                    | M / L | Existing rate limits on draws apply unchanged                                                                                                                   |

### D. Repudiation / integrity of metrics

| #   | Threat                                       | L / I | Mitigation                                                                       |
| --- | -------------------------------------------- | ----- | -------------------------------------------------------------------------------- |
| D1  | Week-0 metrics distorted by taste reordering | M / M | `recommendation_shown` keeps its schema, so before/after can be compared by date |

## Accepted risks

- Taste lives in the browser until accounts exist (decision of 2026-10-22). Anyone with the device sees it; clearing site data erases it.
- A visitor can forge their own taste; the only effect is a different order for themselves inside the filters (A1, A2).
