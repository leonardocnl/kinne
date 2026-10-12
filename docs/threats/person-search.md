# Threat analysis — Person search in the filters panel (phase 3)

Status: proposed 2026-10-12, awaiting the owner's approval. Every mitigation marked **AC** is an acceptance criterion of `feat/person-search` and has a covering test, unless the AC says otherwise. It reuses the controls of [title-search.md](title-search.md) wherever the threat is the same.

## Scope

Inside the filters panel, a field "Buscar ator ou diretor". As the visitor types, the server suggests up to 6 people from the catalog's `people` table (no TMDB call), each with name, role (Atuação / Direção) and how many recommendable catalog titles they appear in. Selecting one turns the field into a removable pill; the counter and the draw then consider only that person's titles, combined with the other filters. One person at a time.

New surface:

1. Server action `searchPeople({ term })` — free text, like the title search.
2. Server action `personTitles({ personId })` — the ids of a person's recommendable titles, for the counter, which runs in the browser.
3. `drawFiltered` gains `personId`; the server derives the person's titles itself.
4. Migration 0008: trigram index on `kinne_normalize(people.name)`.

## Assets

| Asset                              | Why it matters                                                                  |
| ---------------------------------- | ------------------------------------------------------------------------------- |
| Neon free tier                     | Suggestions run on every pause in typing; 87k people, 175k credits              |
| Vercel free tier                   | Same: one invocation per debounced keystroke                                    |
| Visitors' search terms             | Personal data under LGPD (a name searched can reveal tastes)                    |
| People's names (public, from TMDB) | Real people; only what the feature needs leaves the database                    |
| Catalog suitability                | Person search must not become a way to reach adult-only filmographies           |
| Draw integrity                     | The client must not be able to make the server draw outside the person's titles |

## Entry points and trust boundaries

1. Browser → `searchPeople`: **untrusted** free text.
2. Browser → `personTitles`, `drawFiltered`: **untrusted** integer id.
3. Server → database (`kinne_app`, read-only on `people`, `title_credits`, catalog).
4. Shared cache (`use cache: remote`) → other visitors: suggestions for a term and the title ids of a person.
5. sessionStorage → panel: the selected person, read back on the next open (security §9).

## Threats

Likelihood and impact are estimates (L/M/H).

### A. Input (Tampering, Injection)

| #   | Threat                                                        | L / I | Mitigation                                                                                                                                       |
| --- | ------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| A1  | SQL injection through the term or the id                      | L / H | AC: Drizzle bound parameters only; the term goes through `likeNeedle` (title-search A1)                                                          |
| A2  | LIKE wildcards (`%`, `_`, `\`) matching everything            | M / M | AC: same `likeNeedle` escaping after `kinne_normalize` (title-search A2)                                                                         |
| A3  | Huge or binary input                                          | M / M | AC: zod `strictObject`, raw length ≤ 200 before normalising, then `parsePersonTerm` (NFC, control characters stripped, 3–80 characters)          |
| A4  | Reflected or stored XSS through the term or a person's name   | L / H | AC: text only; `react/no-danger` lint rule; names sanitised at sync (catalog-sync A4)                                                            |
| A5  | Unicode tricks missing the index or the cache                 | M / L | AC: the same normalisation on both sides (`kinne_normalize` in SQL, `normalizeSearchText` in TypeScript, title-search G14)                       |
| A6  | Forged `personId`: negative, huge, a string, extra keys       | M / L | AC: zod `strictObject`, integer 1–2147483647; an unknown id yields no titles (empty filter, 0 results), not an error                             |
| A7  | Client sends its own title list for the person                | M / M | AC: the server never accepts title ids for the person; `drawFiltered` derives them from `personId`, and the counter's list is only a display aid |
| A8  | Term or person placed in the URL (security §8)                | M / L | AC: no query parameters; the term lives only in component state; the selected person is kept with the other filter values in sessionStorage      |
| A9  | Tampered sessionStorage (person with a forged name or bad id) | M / L | AC: stored person validated on read (id integer, name 1–200 characters, role enum); invalid data resets to "no person"                           |

### B. Abuse and cost (Denial of service)

| #   | Threat                                                                  | L / I | Mitigation                                                                                                                                                                                                                                                     |
| --- | ----------------------------------------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Suggestion flood keeping Neon awake                                     | M / H | AC: per-client in-memory limit before any database work (same `SEARCH_CATALOG_PER_MINUTE`, salted client key); client debounce 300 ms and minimum 3 characters; one limit shared by both actions                                                               |
| B2  | Expensive query: substring match over 87k names plus a count per person | M / M | AC: trigram GIN index on `kinne_normalize(people.name)` (migration 0008); minimum 3 characters, because the trigram index cannot serve shorter terms (measured on develop: 2 letters 400–680 ms, 3+ letters 5–60 ms); `statement_timeout` 2 s; `LIMIT 6`       |
| B3  | Same term or same person asked again and again                          | M / M | AC: suggestions cached per term hash for terms of 3+ characters (`use cache: remote`, hours, catalog tag); a person's title ids cached per id (days, catalog tag)                                                                                              |
| B4  | Enumerating `personTitles` over every id to scrape filmographies        | M / L | AC: same per-client limit as suggestions, also on `drawFiltered` whenever it carries a `personId` (it reads the same per-person query); ids beyond the people table answer an empty list; accepted residual: the catalog is public TMDB data (title-search C6) |
| B5  | Shared IP (classroom) hitting the per-client limit together             | H / H | AC: limit sized for 30+ people at once (default 600/min per client per instance, configurable by env without a code change, title-search H1)                                                                                                                   |
| B6  | Unbounded title list for a prolific person                              | L / M | AC: `personTitles` returns at most 2000 ids; the draw uses the same bounded list                                                                                                                                                                               |

### C. Data exposure (Information disclosure)

| #   | Threat                                                       | L / I | Mitigation                                                                                                                                                   |
| --- | ------------------------------------------------------------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C1  | Search terms logged or stored                                | M / M | AC: the term is never logged or written; the shared cache key is a hash of the normalised term; failures log a fixed message                                 |
| C2  | More personal data than needed reaching the client           | L / M | AC: suggestions carry only id, name, role and a title count                                                                                                  |
| C3  | Person search surfacing adult-only or non-recommendable work | M / H | AC: people are suggested, counted and filtered only through recommendable, non-18, non-blocked titles available on a streaming (the filter's own candidates) |
| C4  | Error details reaching the visitor                           | L / M | AC: limit, timeout and errors share one neutral message ("Não conseguimos buscar agora."), distinct from "Ninguém encontrado"                                |

### D. Integrity (Spoofing, Repudiation)

| #   | Threat                           | L / I | Mitigation                                                                                |
| --- | -------------------------------- | ----- | ----------------------------------------------------------------------------------------- |
| D1  | Draw outside the person's titles | L / M | AC: A7; the draw filters the server's cached candidates by the server's person title set  |
| D2  | Usage metrics distorted          | L / L | Not applicable: no new event; the draw still records `recommendation_shown` as `filtered` |

### E. Privilege and configuration

| #   | Threat                               | L / I | Mitigation                                                                                                             |
| --- | ------------------------------------ | ----- | ---------------------------------------------------------------------------------------------------------------------- |
| E1  | New write rights for the site        | L / M | AC: none; `kinne_app` already reads `people` and `title_credits` (0006); the index is created by the owner's migration |
| E2  | Raw client IPs stored by the limiter | L / M | AC: same `clientKey` (HMAC with a daily salt) or IP bucket, in memory only (title-search E2, G16)                      |

### F. Accessibility and budget

| #   | Threat                                                            | L / I | Mitigation                                                                                                                                                                        |
| --- | ----------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | Combobox unusable by keyboard or screen reader (a stop criterion) | M / M | AC: WAI-ARIA combobox like title search (`role="combobox"`, `aria-expanded`, `aria-activedescendant`, listbox, polite status); the pill's remove button is named "Remover <nome>" |
| F2  | Home JS budget broken                                             | M / M | AC: the field lives in the lazily loaded filters panel; `bundle:check` passes                                                                                                     |

## Accepted risks (proposed, awaiting approval)

- B4 residual: filmographies of catalog people can be read slowly through `personTitles`; the data is public TMDB data and rate limits make bulk copying slow.
- In-memory limits are per instance (title-search accepted risk), so a distributed bot gets more than the nominal rate; caching, the index and the statement timeout bound the cost.
