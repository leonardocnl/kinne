# Threat analysis — Cast and direction on the title page (phase 2)

Status: proposed 2026-10-12, awaiting the owner's approval. Every mitigation marked **AC** is an acceptance criterion of `feat/title-credits` and has a covering test.

## Scope

The title page shows "Direção de X" (or "X e Y", "X, Y e Z") and "Com A, B e C" with the first three cast members in credit order. Data comes from `people` and `title_credits`, which the daily sync already fills (catalog-sync A11: TMDB person id, name, role, order only). It is read through `DrizzleTitlesRepository.bySlug` as `kinne_app` and cached with the title page. Text only, no links. No new input, endpoint, table, grant or external call.

## Assets

| Asset                        | Why it matters                                                              |
| ---------------------------- | --------------------------------------------------------------------------- |
| People's names (public data) | Real people; LGPD still applies to how much is shown and kept               |
| Neon free tier               | A heavier title query on every cache miss costs compute                     |
| Page integrity               | Names come from TMDB, a third party, and are rendered into every title page |

## Entry points and trust boundaries

1. TMDB → sync → `people`, `title_credits`: already covered by docs/threats/catalog-sync.md (A1–A6 validation, A11 minimal person data).
2. Database → title page server component → HTML: new read path for names.

There is no new browser → server input: the slug was already validated (`isSlug`) before any lookup.

## Threats

### A. Tampering and injection

| #   | Threat                                                                       | L / I | Mitigation                                                                                                                                   |
| --- | ---------------------------------------------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Script or markup in a TMDB person name reaching the page (stored XSS)        | L / H | AC: names rendered as React text nodes only; no `dangerouslySetInnerHTML`                                                                    |
| A2  | Control or invisible characters, empty or duplicated names garbling the line | L / L | AC: `joinNames` trims, drops empty and duplicated names; names are sanitised and length-capped at sync (`sanitizeText`, catalog-sync A4, A5) |

### B. Injection into the query

| #   | Threat                                 | L / I | Mitigation                                                     |
| --- | -------------------------------------- | ----- | -------------------------------------------------------------- |
| B1  | Title id or slug concatenated into SQL | L / H | AC: Drizzle bound parameters only; the title id is a parameter |

### C. Information disclosure

| #   | Threat                                             | L / I | Mitigation                                                                                          |
| --- | -------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------- |
| C1  | More personal data than needed reaching the client | L / M | AC: the query selects only role and name; the page receives two ready-made strings, no ids or order |
| C2  | Credits of a blocked title shown                   | L / M | AC: credits are read only after `bySlug` found a non-blocked title; no separate credits route       |

### D. Denial of service and cost

| #   | Threat                                                                          | L / I | Mitigation                                                                                                                                     |
| --- | ------------------------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | A title with an unexpected number of credits makes the query and the page heavy | L / M | AC: only directors and cast with `credit_order < 3` are read, with a hard `LIMIT 3 + 20`; at most 20 directors                                 |
| D2  | A second query per title page visit keeps Neon awake                            | M / M | AC: credits are read inside the cached `titleScreen` (`use cache: remote`, `cacheLife("days")`, title tag): one read per title per day or sync |

### E. Elevation of privilege

| #   | Threat                             | L / I | Mitigation                                                                                        |
| --- | ---------------------------------- | ----- | ------------------------------------------------------------------------------------------------- |
| E1  | The site needs new database rights | L / M | AC: none added; `kinne_app` already has `SELECT` on `people` and `title_credits` (migration 0006) |

### F. Repudiation

Not applicable: read-only display, no events added.

## Accepted risks

None proposed.
