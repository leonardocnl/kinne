# Guest mode readiness

Audit of the week 0 requirements (`docs/requisitos`: 00, US001–US007, 02, 03) against `develop` on 2026-10-11, for the user test of 2026-10-26. Guest mode only; login is out of scope.

**Verdict:** every story the test needs is built. Nothing in the flow is missing. What is left is a set of decisions (below), checks that only you can run (other browsers, Vercel and Neon settings) and items due after the test.

## How this was checked

- **Unit tests:** `npm test`, 19 files and 191 tests, green, counting the tests added in `fix/event-write-safety` (17 files and 183 tests on `develop` before it).
- **E2E (this session):** `next build && next start` against the Neon `develop` branch, driven by Playwright in Chromium at 360, 375, 1280 and 1440 px, with throwaway scripts that were not committed (Playwright is not a project dependency). Events were read back from `anonymous_usage_events` by browser id.
- **Code reading:** where neither of the above applies, the evidence is the file.
- **Not checked:** Safari and Firefox, screen readers, the Vercel and Neon production settings, the production database.

Status: **done** = built and checked. **Partial** = built, but something is unverified or deviates. **Not done** = missing.

## 00 – General rules and common behaviours

| Item   | Status | Evidence                                                                                                                                                                                            |
| ------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RNG001 | done   | `src/domain/catalog.ts` (6.4, 500 votes), applied in `src/application/sync-catalog.ts`, `src/domain/filters.ts`, `src/domain/surprise.ts`; `catalog.test.ts`. Develop DB: 2,191 movies, 711 series. |
| RNG002 | done   | `src/domain/streaming.ts`; TMDB query with `watch_region: BR` and `flatrate` in `src/infrastructure/tmdb/catalog-source.ts`; `streaming.test.ts`                                                    |
| RNG003 | done   | `streamingTmdbIds` in `src/domain/streaming.ts`; `filters.test.ts`, `surprise.test.ts`                                                                                                              |
| RNG004 | done   | `watchedTitles` in `src/infrastructure/browser-storage.ts`, excluded in `filterTitles` and `drawSurprise`, not in the daily picks; E2E                                                              |
| RNG005 | done   | `src/infrastructure/browser-storage.ts` (localStorage: streamings, watched, browser id, team mark; sessionStorage: other filters); `browser-storage.test.ts`; E2E (US002 C7)                        |
| RNG006 | done   | `brasiliaDay` in `src/domain/day.ts`; `day.test.ts`                                                                                                                                                 |
| RNG007 | done   | `src/domain/genre.ts`; Romance hidden for series in `FiltersPanel.tsx`; `genre.test.ts`, `filters.test.ts`                                                                                          |
| CM001  | done   | `HomeSkeleton.tsx`, `TitleSkeleton.tsx`, `ui/Skeleton.tsx` with `motion-reduce`; code reading (no slow load was simulated)                                                                          |
| CM002  | done   | `HomeError.tsx`, `titulo/[slug]/error.tsx`, `loadError` in `StateScreen.tsx`; a failed draw shows a toast. Code reading                                                                             |
| CM003  | done   | Tokens in `src/app/globals.css`; `design-tokens.test.ts`, `contrast.test.ts`; one yellow control per screen (the home one hides while the filters are open)                                         |
| CM004  | done   | E2E with `reducedMotion: "reduce"`: no rotation and no pause button; `motion-reduce` on every transition                                                                                            |

## US001 – Daily picks

| Item   | Status  | Evidence                                                                                                                                                                                                                                                                                     |
| ------ | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1     | done    | `src/app/page.tsx`, `DailyPicks.tsx`, `TopBar.tsx`, `Shell.tsx` (footer credits and notice); E2E. "Entrar" shows with no action, as 04 says (decision D4)                                                                                                                                    |
| C2     | done    | `rotation.ts` + `rotation.test.ts`; progress bar is the clock in `DailyPicks.tsx`                                                                                                                                                                                                            |
| C3     | done    | Capture-phase `pointerdown`/`keydown` listener in `DailyPicks.tsx`                                                                                                                                                                                                                           |
| C4     | done    | Pause button with 44px hit area (`before:-inset-1.5`); E2E target check                                                                                                                                                                                                                      |
| C5     | done    | `TodayReel.tsx`                                                                                                                                                                                                                                                                              |
| C6     | done    | `titleHref(slug, "dia")`; E2E (`recommendation_shown` with `daily_pick`)                                                                                                                                                                                                                     |
| C7     | done    | E2E at 360px: no horizontal scroll, date above the title                                                                                                                                                                                                                                     |
| RNE001 | partial | Seeded by date, one per genre, Romance always a movie, 60-day window: `src/domain/daily-picks.ts`, `daily-picks.test.ts`. **Deviation:** the draw uses its own floor of 7.0 and 2,000 votes (`DAILY_MIN_RATING`, `DAILY_MIN_VOTES`, commit e801ae4), not RNG001 as RNE001 says (decision D2) |
| RNE002 | done    | `rotationSeconds` in `src/domain/daily-picks.ts`; `daily-picks.test.ts`                                                                                                                                                                                                                      |
| RNE003 | done    | `pickPhrase` in `src/domain/daily-picks.ts`; `daily-picks.test.ts`                                                                                                                                                                                                                           |
| RNE004 | done    | `aspect-scope` 2.39:1 / `aspect-video` 16:9, focus at 25%, grain: `globals.css`, `ui/Frame.tsx`                                                                                                                                                                                              |
| RNE005 | partial | `'use cache: remote'` keyed by day in `src/app/_data/home.ts`. Not verified on Vercel (see RNF07)                                                                                                                                                                                            |

## US002 – Escolher agora (filters)

| Item   | Status | Evidence                                                                                                                                                         |
| ------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1     | done   | `FiltersPanel.tsx` (glass panel on desktop, full-screen modal on mobile, title dims behind it); E2E at 360 and 1280                                              |
| C2     | done   | Duration slider only with Filmes, ignored otherwise (`filterTitles`); E2E                                                                                        |
| C3     | done   | Client-side count over the cached day list, without watched titles; `filters.test.ts`; E2E                                                                       |
| C4     | done   | E2E: Netflix + Filmes + 9.0 gives "0 títulos combinam", disabled button and the hint                                                                             |
| C5     | done   | Close button, Esc and browser back (open state in `history.state`, not the URL); values kept; E2E for Esc and back                                               |
| C6     | done   | `drawFiltered` server action, `filtered` origin; E2E                                                                                                             |
| C7     | done   | E2E: a new tab keeps Netflix and resets the type to "Os dois"                                                                                                    |
| C8     | done   | `withType` and the Romance rule in `filterTitles`; `filters.test.ts`                                                                                             |
| RNE001 | done   | `filterTitles`; `filters.test.ts`                                                                                                                                |
| RNE002 | done   | Slider from 6.4 (the floor) to 9.0; the votes floor still applies. The requirement table says the slider goes from 6.0: values under 6.4 would match nothing new |
| RNE003 | done   | Top 10 by rating, ties by votes then id; "Outra opção" without repeats (`drawUnseen`); E2E: 10 distinct titles, then the end state (step B)                      |
| RNE004 | done   | `RUNTIME_LIMITS`; `filters.test.ts`                                                                                                                              |

## US003 – Me surpreenda

| Item   | Status | Evidence                                                                                                                                               |
| ------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C1     | done   | `useSurprise.ts`, `src/app/_actions/surprise.ts`; E2E                                                                                                  |
| C2     | done   | `drawSurprise` with saved streamings; `surprise.test.ts`                                                                                               |
| C3     | done   | `shownTitles` (sessionStorage) excluded; `surprise.test.ts`. Only if every eligible title was already shown does it repeat, instead of showing nothing |
| RNE001 | done   | `SURPRISE_MIN_RATING = 7.5` (starting value, 04)                                                                                                       |
| RNE002 | done   | Only streamings apply                                                                                                                                  |
| RNE003 | done   | Simple draw without watched titles, no top 10                                                                                                          |

## US004 – Title screen

| Item   | Status  | Evidence                                                                                                                                        |
| ------ | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| C1     | done    | `TitleView.tsx`; E2E                                                                                                                            |
| C2     | done    | `useFilteredDraw.ts`; E2E                                                                                                                       |
| C3     | done    | End state "Você viu as 10 melhores para esses filtros", "Mudar filtros" reopens the filters, "Ver de novo" restarts the same 10; E2E (step B)   |
| C4     | done    | Surprise and link draw a new surprise; E2E                                                                                                      |
| C5     | done    | "Próxima de hoje", wraps after the fifth (`titulo/[slug]/page.tsx`); E2E                                                                        |
| C6     | done    | Opens YouTube in a new tab; hidden without a trailer; E2E (the tab opened; YouTube itself is blocked in this sandbox)                           |
| C7     | done    | `/titulo/<slug>`; every next title uses `router.replace`, so back goes home; E2E                                                                |
| C8     | done    | Origin kept in `sessionStorage` per title (security §8); none or another title means link; filters are never in the URL; E2E                    |
| C9     | partial | "Ler mais"/"Ler menos" at 4 lines: E2E in Chromium at 360px. Safari on iPhone not tested (04, Design)                                           |
| C10    | done    | Desktop grid in `TitleView.tsx`; code reading and E2E at 1280                                                                                   |
| C11    | partial | `Dock` fixed to the bottom with `pb-safe`; E2E keyboard pass found no focused element hidden behind it in Chromium. Safari on iPhone not tested |
| RNE001 | done    | `RECOMMENDATION_SOURCE` in `origin.ts`                                                                                                          |
| RNE002 | done    | No streaming link                                                                                                                               |
| RNE003 | done    | Dice icon in every origin; accessible name changes                                                                                              |
| RNE004 | done    | Tagline hidden when missing, full synopsis                                                                                                      |
| RNE005 | done    | `pickTrailer` in `src/domain/catalog.ts`; `catalog.test.ts`                                                                                     |
| RNE006 | done    | `ui/Score.tsx`, white, not a pill                                                                                                               |

## US005 – Responding to a recommendation

| Item   | Status | Evidence                                                                               |
| ------ | ------ | -------------------------------------------------------------------------------------- |
| C1     | done   | "Combinado. Está na Netflix." and "Voltar ao início"; E2E                              |
| C2     | done   | Toast "Anotado: você já viu …" and the next option by origin; E2E                      |
| C3     | done   | Watched titles excluded from filters and surprise, kept in daily picks; unit tests     |
| RNE001 | done   | The run keeps the watched list from when it started (`filteredRun` in browser-storage) |
| RNE002 | done   | No undo                                                                                |
| RNE003 | done   | "Outra opção" only skips                                                               |
| RNE004 | done   | No "Não me interessa"                                                                  |

## US006 – Keeping the team out of the count

| Item   | Status  | Evidence                                                                                                                                     |
| ------ | ------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| C1     | done    | `src/app/[secret]/page.tsx` + `TeamMark.tsx`; E2E: the secret path sets `kinne:team`; a wrong path shows the not-found page and sets nothing |
| C2     | done    | `track` in `src/app/_components/measure.ts` sends nothing; `measure.test.ts`; E2E: zero event requests from a marked browser                 |
| C3     | done    | The mark lives only in localStorage                                                                                                          |
| RNE001 | partial | Read from `TEAM_SECRET_PATH`. Whether it is set in the Vercel production environment is not verified                                         |
| RNE002 | done    | The path only lets someone opt out                                                                                                           |
| RNE003 | to do   | Operational: mark every team browser and device before 2026-10-26                                                                            |

## US007 – Daily catalog update

| Item   | Status  | Evidence                                                                                                                                                            |
| ------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1     | done    | `.github/workflows/sync-catalog.yml`; scheduled run #3 succeeded on `main` on 2026-10-11, but started at 12:53 UTC, 6.5 hours after the 06:17 cron (see note below) |
| C2     | done    | `src/application/sync-catalog.ts` (floor, genres, theme keywords, availability)                                                                                     |
| C3     | done    | `lastSyncedAt` set on every write; develop DB has `max(last_synced_at)` = 2026-10-11 12:53 UTC                                                                      |
| C4     | done    | Only paths in `schema.ts`                                                                                                                                           |
| RNE003 | pending | Titles that leave the floor are kept; decision still open in 04 (D6)                                                                                                |

Note: `daily:pick` writes today's and tomorrow's picks on every run, so a late run does not leave the home screen empty. A run that fails for more than a day would leave it empty. The home screen would then show the CM002 error.

## 02 – Non-functional requirements

| Item  | Status   | Evidence                                                                                                                                                                             |
| ----- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| RNF01 | partial  | Full flow passes in Chromium (Blink). **Safari on iPhone and Firefox not tested** (no WebKit or Gecko in this session)                                                               |
| RNF02 | done     | E2E: no horizontal scroll at 360, 375, 1280 and 1440 on the home screen, filters and title screen                                                                                    |
| RNF03 | partial  | E2E keyboard-only flow (home → filters → recommendation → another option) at 375 and 1280; named controls; visible pause; no focus hidden behind the dock. Screen readers not tested |
| RNF04 | done     | E2E: no visible target under 44px (the 1px inputs are visually hidden radios inside 44px labels); `contrast.test.ts`; `max-w-measure` on running text                                |
| RNF05 | done     | Record only                                                                                                                                                                          |
| RNF06 | unknown  | Neon setting, not visible from the code                                                                                                                                              |
| RNF07 | partial  | `'use cache: remote'` in `_data/home.ts`, `_data/title.ts`, `_data/candidates.ts`. It relies on the host's remote cache handler (Vercel provides one); not measured on Vercel        |
| RNF08 | done     | Paths only in the DB; `ui/TmdbImage.tsx` uses a plain `<img>` from `image.tmdb.org`, without `next/image`                                                                            |
| RNF09 | done     | `anonymous_usage_events` has no IP column (`schema.ts`); only the random browser id                                                                                                  |
| RNF10 | not done | Nothing deletes the events yet. Due by 2026-11-15, after the test, so it does not block it (D7)                                                                                      |
| RNF11 | done     | No `@vercel/*` packages; Neon HTTP driver; sync on GitHub Actions; secrets in env vars                                                                                               |

## 03 – Week 0 measurement

| Item                                 | Status   | Evidence                                                                                                                                                                                                     |
| ------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Six events                           | done     | `src/domain/usage-events.ts`, emitted from `AppOpened.tsx` and `TitleView.tsx`; E2E: all six read back from the DB for one browser id                                                                        |
| `recommendation_source`              | done     | `daily_pick`, `filtered`, `surprise_me`; a title opened by link is recorded with no source (D3)                                                                                                              |
| Rotation and reel make no events     | done     | Code reading: `DailyPicks.tsx` and `TodayReel.tsx` do not call `track`                                                                                                                                       |
| Anonymous browser id                 | done     | `browserId()` (random UUID in localStorage); `browser-storage.test.ts`                                                                                                                                       |
| ME04 team exclusion                  | done     | See US006                                                                                                                                                                                                    |
| A failed write never breaks a screen | done     | `recordUsageEvent` in `src/application/usage-events.ts` never rejects; `track` never throws; `usage-events.test.ts`, `measure.test.ts`; E2E with every event request aborted, and with HTTP 500: flow intact |
| ME01–ME03 and the five criteria      | not done | Computed after the test from the events; no queries written yet. Not needed to run the test                                                                                                                  |

## Out of scope for this audit

- The 18+ rule is still open and is not implemented, as instructed.
- Login, profile and everything else listed under "Fica para depois" in 00.

## Decisions pending

- **D1 – Resolved: GitHub write access.** It was missing during the audit and was restored the same day. Each task now has its own branch and PR into `develop`: `docs/branch-workflow`, `fix/ci-on-develop`, `fix/event-write-safety`, `docs/guest-mode-readiness`.
- **D2 – Daily picks floor.** The code draws the daily picks only among titles rated 7.0 or more with at least 2,000 votes. US001 RNE001 says RNG001 (6.4, 500). Either update RNE001 in the Drive and `docs/requisitos`, or lower the constants in `src/domain/daily-picks.ts`. Smaller, same kind: the rating slider starts at 6.4, not at the 6.0 of the US002 C1 table. No title is under 6.4, so nothing changes in practice.
- **D3 – Source for titles opened by link.** `recommendation_shown` from a shared link is recorded with `recommendation_source` null, because 03 lists only three values. It still counts for Conclusão (ME02). If you want it told apart, add `'link'` to the check constraint (migration) and to 03.
- **D4 – "Entrar" button.** It is visible and does nothing (open in 04). Participants will tap it. Options: hide it for the test, or show a short "em breve" message.
- **D5 – 18+ rule.** Still open; not implemented.
- **D6 – Titles that leave the floor** (US007 RNE003). Still open in 04; nothing is deleted.
- **D7 – Deleting the test events** (RNF10). Who runs it, and how (one SQL statement or a script), by 2026-11-15.
- **D8 – Deploys during the test.** After a new deploy, an open tab still holds the old server action ids. Its draws and event writes fail until the page reloads. Draws show a toast, and events are lost silently. Suggest freezing deploys from 2026-10-26 to 2026-11-01, or accepting that loss.
- **D9 – Sync schedule.** GitHub ran the 03:17 sync 6.5 hours late on its first scheduled day. If the picks must exist exactly at midnight, the job already writes tomorrow's picks, so the risk is only a run missed for a whole day. A manual `workflow_dispatch` covers that.
- **D10 – Polish notes file.** Existing notes live in `docs/refinos.md`. New ones went to `docs/refinements.md` as asked, without renaming the old file. Say if you want them merged.
- **D11 – What "Ver recomendação" shows with default filters.** The top 10 by rating over all titles is mostly animation and anime: "Como Mágica", "Avatar: A Lenda de Aang", "Frieren". That follows RNE003 as written. Say if the test should start from a different default.

## Before 2026-10-26 (only you can do these)

- [ ] Merge the PR into `develop`, then `develop` into `main` (production).
- [ ] Vercel production: `DATABASE_URL_POOLED` and `TEAM_SECRET_PATH` set; deploy from `main`.
- [ ] Production DB: migrations `0000` and `0001` applied; catalog synced; today's picks exist.
- [ ] Neon: compute fixed at 0.25 CU (RNF06).
- [ ] Run the full flow on Safari (iPhone) and on Firefox (RNF01, US004 C9 and C11).
- [ ] Mark every team browser and device through the secret path (US006 RNE003).
- [ ] Empty `anonymous_usage_events` of the trial rows from development before the test starts. The develop DB already holds rows from this audit.
