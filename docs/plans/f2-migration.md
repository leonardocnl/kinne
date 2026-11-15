# F2 migration plan: layers to modules

Status: **approved by the owner on 2026-11-15**, with the recommended option in D1 to D4. D1 is transitional: see [ADR 0012](../architecture/adr/0012-module-dependencies-after-f2-mapping.md).

Phase F2 of the [foundation plan](../plano-fundacao.md) moves `src/{domain,application,infrastructure,app}` into `src/modules/*` and `src/shared`. This document is the map and the order. The rules it applies are in [ADR 0001](../architecture/adr/0001-modular-monolith.md) to [0005](../architecture/adr/0005-ui-placement.md) and [boundaries.md](../architecture/boundaries.md); they are not repeated here.

Written from `develop` at `1f96f90` (2026-11-15). File names below are the ones in that commit.

## 1. Decisions needed before the first PR

The current code does not fit the dependency table of ADR 0001 in four places. Each one needs the owner's answer, because the fix changes an ADR or `.dependency-cruiser.cjs`. The rest of this plan assumes the recommended option.

### D1. Who owns the account's taste, "Já vi" and streamings

Today `src/domain/accounts.ts` imports `streaming` (catalog) and `taste-signals` (taste), and the seven `user*` tables are written only through the `kinne_*` functions of migration 0011, which take the session token and do the sign-in merge atomically. ADR 0001 says `accounts` imports no business module and `taste` owns the taste signals.

| Option                                                                                                                                                                            | Cost                                                                                                                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A (recommended).** `accounts` owns all seven `user*` tables as "my data" and may import `catalog` and `taste`. `taste` owns the graph and the visitor's signals in the browser. | One line changes in the ADR 0001 table. Pure move: no function, query or test assertion changes.                                                                                                                                 |
| B. Keep the table as written: `taste` owns `user_taste_signals` and `user_watched`, `accounts` stays import-free.                                                                 | `taste` would call session-keyed `kinne_*` functions without being allowed to import `accounts`; the sign-in merge would be split across two modules while one SQL function does it. Not a move: it redesigns the accounts flow. |

With A, no server module other than `accounts` stores data linked to an account, so `AccountDeleted` has no subscriber yet. `src/shared/events` is then not created in F2; it arrives with the first subscriber (`library`).

### D2. `room` uses the account state

`Lobby.tsx` reads `useAccountStatus()` and `_data/room.ts` loads the member's account taste. `room` may import only `taste` and `catalog`.

- **Recommended:** allow `room → accounts`, as `discovery` already has. No cycle is possible (`accounts` never imports `room`).
- Alternative: pass the account state in from the route as props. It changes the component contract of `RoomApp`, so it is not a move.

### D3. The title screen records usage events

`TitleView.tsx` calls `track()` and belongs with the draw (`discovery`). No module is allowed to import `analytics`.

- **Recommended:** allow `discovery → analytics`. `analytics` imports nothing, so it stays a leaf.
- Alternative: keep `TitleView` in `src/app` as route composition. It is 374 lines with rules in it, which is what ADR 0005 moves out of `app`.

### D4. Order of the module PRs

The foundation plan says `shared → catalog → taste → discovery → room → accounts → analytics`. `discovery` and `room` import `accounts`, and a file in `src/modules` may not import `src/app` (`no-routes-from-below`), so `discovery` cannot move before `accounts`.

- **Recommended:** `shared → catalog → taste → accounts → analytics → discovery → room`, the dependency order.

### Resulting dependency table (if D1 to D3 are accepted)

| Module      | May import                          | Change |
| ----------- | ----------------------------------- | ------ |
| `catalog`   | none                                |        |
| `taste`     | catalog                             |        |
| `accounts`  | catalog, taste                      | D1     |
| `analytics` | none                                |        |
| `discovery` | taste, catalog, accounts, analytics | D3     |
| `room`      | taste, catalog, accounts            | D2     |
| `library`   | catalog, taste, accounts            |        |

Recorded in a new ADR 0012 that amends the table of ADR 0001, plus `ALLOWED_MODULE_DEPS`, `overview.md` and `kinne-standards`.

## 2. Target tree

Rules that apply to every row of the tables below:

- A test file moves with the file it tests and keeps its name. Only its imports change.
- Every module gets `index.ts` (public API) and `README.md`. `index.ts` never re-exports table definitions.
- Server actions (`"use server"`) live in `ui/actions/`, because the module's client components import them. Cached loaders (`"use cache"`, `createDb()`) live in `infrastructure/`.
- "split" means the file is cut along existing export boundaries; no function body changes.

### 2.1 `src/shared`

| Current file                                                                                          | Destination                       | Note                                                                                        |
| ----------------------------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------- |
| `domain/day.ts`, `rate-limit.ts`, `qr.ts`, `pix.ts`, `contact.ts`                                     | `shared/lib/`                     |                                                                                             |
| `domain/usage-events.ts` (`isBrowserId` only)                                                         | `shared/lib/browser-id.ts`        | split; used by room, analytics and browser storage                                          |
| `infrastructure/memory-limiter.ts`, `client-ip.ts`                                                    | `shared/lib/`                     |                                                                                             |
| `app/_data/draw-limit.ts`                                                                             | `shared/lib/draw-limit.ts`        | used by discovery and analytics actions; only shared imports                                |
| `infrastructure/browser-storage.ts` (`read`, `write`, `remove`, `idList`, the key-name constants)     | `shared/lib/browser-storage.ts`   | split; the per-module stores go to each module (see below)                                  |
| `infrastructure/search-config.ts`, `sync-env.ts`                                                      | `shared/config/`                  |                                                                                             |
| `infrastructure/db/client.ts`                                                                         | `shared/db/client.ts`             | drops `{ schema }`: nothing uses `db.query.*`, so `shared` needs no module tables           |
| `infrastructure/db/rate-limiter.ts`                                                                   | `shared/db/rate-limiter.ts`       | the `Admission` type moves from `application/title-search.ts` to `shared/lib/rate-limit.ts` |
| `infrastructure/db/schema.ts` (`rateLimitBuckets`, `meta`)                                            | `shared/db/schema.ts`             | split                                                                                       |
| `application/migration-guard.ts`                                                                      | `shared/db/migration-guard.ts`    |                                                                                             |
| `test/local-guard.ts`, `test/local-pg.ts`                                                             | `shared/db/`                      |                                                                                             |
| `infrastructure/http/security-headers.ts`                                                             | `shared/http/security-headers.ts` | `next.config.ts` and `e2e/headers.e2e.ts` import it                                         |
| `app/_components/ui/*` except `Navbar.tsx`, `navItem.ts`                                              | `shared/ui/`                      | 26 components and helpers                                                                   |
| `app/_components/StateScreen.tsx`, `NotFoundScreen.tsx`, `InputModality.tsx`, `layout.ts`, `toast.ts` | `shared/ui/`                      | no business import                                                                          |
| `domain/README.md`, `application/README.md`, `infrastructure/README.md`                               | deleted in the closing PR         | replaced by the module READMEs                                                              |

Not created in F2: `shared/logger` (F5), `shared/events` (see D1), `shared/ui/tokens` (F3; `globals.css` stays in `src/app`).

### 2.2 `catalog`

| Current file                                                                                                    | Destination                                      | Note                                                                                        |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `domain/catalog.ts`, `catalog-sync.ts`, `credits.ts`, `genre.ts`, `streaming.ts`                                | `catalog/domain/`                                |                                                                                             |
| `domain/search.ts`, `search-cases.ts`, `person-search.ts`                                                       | `catalog/domain/`                                |                                                                                             |
| `domain/origin.ts`                                                                                              | `catalog/domain/origin.ts`                       | how a person reached a title page                                                           |
| `domain/rounds.ts` (`WEIGHT_VOTES`, `weightedRating`, `meanRating`, `rankTitles`)                               | `catalog/domain/rating.ts`                       | split in the untangle PR (section 3)                                                        |
| `domain/filters.ts` (`TypeChoice`), `domain/surprise.ts` (`SurpriseCandidate`), `application/titles.ts` (types) | `catalog/domain/candidate.ts`                    | split in the untangle PR                                                                    |
| `application/sync-catalog.ts`, `title-search.ts`, `titles.ts`                                                   | `catalog/application/`                           |                                                                                             |
| `infrastructure/db/schema.ts` (16 tables, section 4)                                                            | `catalog/infrastructure/db/schema.ts`            | split                                                                                       |
| `infrastructure/db/catalog-repository.ts`                                                                       | `catalog/infrastructure/db/`                     | `titleReferenced` and the purges are registered exceptions (section 4.3)                    |
| `infrastructure/db/titles-repository.ts` (`bySlug`, `candidates`, `popularTitles`, `feelingData`, helpers)      | `catalog/infrastructure/db/`                     | `candidates()` stops calling `feelingMask` (section 4.4); `neighborEdges()` goes to `taste` |
| `infrastructure/db/taste-graph-repository.ts` (`load()`, `ProfileRow`)                                          | `catalog/infrastructure/db/title-profiles.ts`    | split; it reads only catalog tables                                                         |
| `infrastructure/db/search-repository.ts`, `people-repository.ts`                                                | `catalog/infrastructure/db/`                     |                                                                                             |
| `infrastructure/tmdb/*` (4 files)                                                                               | `catalog/infrastructure/tmdb/`                   |                                                                                             |
| `infrastructure/revalidation.ts`                                                                                | `catalog/infrastructure/revalidation.ts`         | cache tags of the catalog; `app/api/revalidate/route.ts` imports it through `index.ts`      |
| `infrastructure/browser-storage.ts` (`titleOrigin`)                                                             | `catalog/infrastructure/browser/title-origin.ts` | split                                                                                       |
| `app/_data/candidates.ts`, `title.ts`, `search.ts`, `people.ts`, `person-limit.ts`, `onboarding.ts`             | `catalog/infrastructure/`                        | cached loaders; `onboarding.ts` is the popular-titles list                                  |
| `app/_actions/search.ts`, `people.ts`, `onboarding.ts`                                                          | `catalog/ui/actions/`                            |                                                                                             |
| `app/_components/search/SearchLauncher.tsx`, `SearchPanel.tsx`                                                  | `catalog/ui/`                                    |                                                                                             |
| `app/_components/home/PersonField.tsx`                                                                          | `catalog/ui/`                                    | person search field                                                                         |
| `app/_components/title/origin.ts` (`titleHref`, `goToTitle`, `useOrigin`)                                       | `catalog/ui/origin.ts`                           | split; `RECOMMENDATION_SOURCE` goes to `analytics`                                          |

### 2.3 `taste`

| Current file                                                          | Destination                                       | Note                                                            |
| --------------------------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------- |
| `domain/taste-graph.ts`, `taste-signals.ts`                           | `taste/domain/`                                   |                                                                 |
| `domain/surprise.ts` (`SURPRISE_MAX_EXCLUDED`)                        | `taste/domain/taste-signals.ts`                   | split; it caps the "Já vi" and shown lists used by four modules |
| `app/_data/taste.ts`                                                  | `taste/application/taste-schema.ts`               | zod schema of the browser's signals                             |
| `app/_data/surprise.ts` (`idListSchema`)                              | `taste/application/taste-schema.ts`               | split                                                           |
| `infrastructure/db/schema.ts` (`titleNeighbors`)                      | `taste/infrastructure/db/schema.ts`               | split                                                           |
| `infrastructure/db/taste-graph-repository.ts` (`replaceNeighbors`)    | `taste/infrastructure/db/neighbors-repository.ts` | split                                                           |
| `infrastructure/db/titles-repository.ts` (`neighborEdges`)            | `taste/infrastructure/db/neighbors-repository.ts` | split                                                           |
| `app/_data/taste-graph.ts`                                            | `taste/infrastructure/neighbor-graph.ts`          | cached loader                                                   |
| `infrastructure/browser-storage.ts` (`watchedTitles`, `tasteSignals`) | `taste/infrastructure/browser/`                   | split                                                           |
| `app/_data/taste-privacy.test.ts`                                     | `taste/application/`                              |                                                                 |

### 2.4 `accounts`

| Current file                                                                                               | Destination                            | Note                                                                                                     |
| ---------------------------------------------------------------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `domain/accounts.ts`                                                                                       | `accounts/domain/`                     |                                                                                                          |
| `application/accounts.ts`                                                                                  | `accounts/application/`                |                                                                                                          |
| `infrastructure/auth/config.ts`, `crypto.ts`, `mailer.ts`                                                  | `accounts/infrastructure/auth/`        | path still matches ESLint rule 5                                                                         |
| `infrastructure/db/accounts-repository.ts`, `accounts-sql.ts`, `accounts.db.test.ts`, `auth-purge.test.ts` | `accounts/infrastructure/db/`          |                                                                                                          |
| `infrastructure/db/schema.ts` (7 `user*` tables)                                                           | `accounts/infrastructure/db/schema.ts` | split                                                                                                    |
| `app/_data/account.ts`                                                                                     | `accounts/infrastructure/account.ts`   | session and composition                                                                                  |
| `app/_actions/account.ts`, `account.db.test.ts`, `limits.test.ts`                                          | `accounts/ui/actions/`                 | `limits.test.ts` only if it tests account limits; checked in the PR                                      |
| `app/_components/account/*` except `PageFrame.tsx`                                                         | `accounts/ui/`                         | 15 files                                                                                                 |
| `infrastructure/browser-storage.ts` (`clearAccountKeys`, `clearAccountTraces`)                             | `accounts/infrastructure/browser/`     | split; they use the key names in `shared/lib/browser-storage.ts`, so they import no other module's store |

### 2.5 `analytics`

| Current file                                                     | Destination                             | Note                                                    |
| ---------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------- |
| `domain/usage-events.ts` (all but `isBrowserId`)                 | `analytics/domain/`                     |                                                         |
| `application/usage-events.ts`, `delete-test-events.ts`           | `analytics/application/`                |                                                         |
| `infrastructure/db/usage-events-repository.ts`                   | `analytics/infrastructure/db/`          |                                                         |
| `infrastructure/db/schema.ts` (`anonymousUsageEvents`)           | `analytics/infrastructure/db/schema.ts` | split                                                   |
| `infrastructure/browser-storage.ts` (`browserId`, `teamBrowser`) | `analytics/infrastructure/browser/`     | split                                                   |
| `app/_actions/events.ts`                                         | `analytics/ui/actions/`                 |                                                         |
| `app/_components/measure.ts`, `AppOpened.tsx`                    | `analytics/ui/`                         |                                                         |
| `app/_components/title/origin.ts` (`RECOMMENDATION_SOURCE`)      | `analytics/ui/recommendation-source.ts` | split                                                   |
| `app/[secret]/TeamMark.tsx`                                      | stays in `src/app/[secret]/`            | route component; imports `analytics` through `index.ts` |

### 2.6 `discovery`

| Current file                                                                                                            | Destination                              | Note                                                             |
| ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------- |
| `domain/filters.ts`, `rounds.ts`, `draw-order.ts`, `surprise.ts`, `genre-conflicts.ts`, `feelings.ts`, `daily-picks.ts` | `discovery/domain/`                      | minus the parts split out in section 3                           |
| `domain/taste-golden.ts`                                                                                                | `discovery/domain/feelings-golden.ts`    | it is keyed by `Feeling`; in `taste` it would import `discovery` |
| `application/filtered-draw.ts`, `daily-picks.ts`                                                                        | `discovery/application/`                 | with `filtered-draw-taste.test.ts`                               |
| `app/_data/filters.ts`, `surprise.ts` (`surpriseRequestSchema`, `parseSurpriseRequest`)                                 | `discovery/application/`                 | zod input schemas                                                |
| `infrastructure/db/daily-picks-repository.ts`                                                                           | `discovery/infrastructure/db/`           | reads catalog tables: read model, section 4.3                    |
| `infrastructure/db/schema.ts` (`dailyPicks`)                                                                            | `discovery/infrastructure/db/schema.ts`  | split                                                            |
| `app/_data/home.ts`, `feelings.ts`                                                                                      | `discovery/infrastructure/`              | cached loaders                                                   |
| new, 10 lines                                                                                                           | `discovery/infrastructure/candidates.ts` | cached wrapper that adds the feeling mask (section 4.4)          |
| `infrastructure/browser-storage.ts` (streamings, filters, `filteredRun`, `shownTitles`, `filtersOnArrival`)             | `discovery/infrastructure/browser/`      | split                                                            |
| `app/_actions/filters.ts`, `surprise.ts`                                                                                | `discovery/ui/actions/`                  |                                                                  |
| `app/_components/home/*` except `PersonField.tsx`, `HomeSkeleton.tsx`                                                   | `discovery/ui/home/`                     | 10 files                                                         |
| `app/_components/title/*` except `origin.ts`                                                                            | `discovery/ui/title/`                    | 9 files                                                          |
| `app/_components/StreamingProfile.tsx`                                                                                  | `discovery/ui/`                          | ADR 0011                                                         |

### 2.7 `room`

| Current file                                                                                      | Destination                        | Note                                   |
| ------------------------------------------------------------------------------------------------- | ---------------------------------- | -------------------------------------- |
| `domain/group-room.ts`                                                                            | `room/domain/`                     |                                        |
| `application/group-room.ts`                                                                       | `room/application/`                |                                        |
| `infrastructure/db/group-room-repository.ts`, `group-room-sql.ts`, `group-room-migration.test.ts` | `room/infrastructure/db/`          |                                        |
| `infrastructure/db/schema.ts` (4 `groupRoom*` tables)                                             | `room/infrastructure/db/schema.ts` | split                                  |
| `infrastructure/group-room-session.ts`                                                            | `room/infrastructure/`             |                                        |
| `app/_data/room.ts`                                                                               | `room/infrastructure/room.ts`      |                                        |
| `app/_actions/room.ts`, `room-account.db.test.ts`                                                 | `room/ui/actions/`                 | it takes the candidates from `catalog` |
| `app/_components/room/*`                                                                          | `room/ui/`                         | 11 files                               |

### 2.8 `library`

Post-MVP. No file exists and none is created. Its line in `ALLOWED_MODULE_DEPS` already exists.

### 2.9 What stays in `src/app`

| File                                                                                                  | Destination       | Why                                                                                                                |
| ----------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| every `page.tsx`, `layout.tsx`, `error.tsx`, `not-found.tsx`, `route.ts`, `globals.css`, icons        | unchanged         | routes                                                                                                             |
| `app/design/**`, `app/sobre/PixCopy.tsx`, `app/[secret]/TeamMark.tsx`                                 | unchanged         | route-local components                                                                                             |
| `_components/Shell.tsx`, `TopBar.tsx`, `ToastHost.tsx`, `ui/Navbar.tsx`, `ui/navItem.ts`              | `src/app/_shell/` | the page frame composes `catalog` (search), `accounts` (button, undo) and `shared/ui`; no single module may own it |
| `_components/account/PageFrame.tsx`, `home/HomeSkeleton.tsx`                                          | `src/app/_shell/` | they import `TopBar` and `Shell`                                                                                   |
| `app/routes.test.ts`, `design-tokens.test.ts`, `sala/sala.test.ts`, `sobre/page.test.ts`              | unchanged         |                                                                                                                    |
| `src/eslint-rules.test.ts`, `next-config.test.ts`, `server-only.test.ts`, `instrumentation-client.ts` | unchanged         | `eslint-rules.test.ts` updates its two probe paths in the closing PR                                               |

After the last PR, `src/app/_components`, `_data` and `_actions` do not exist.

### 2.10 Files outside `src` that follow the moves

`drizzle.config.ts`, `next.config.ts`, `package.json` (`test:db`), `.github/workflows/timing-checks.yml` (one test path), `scripts/*.ts` (8 scripts import `src`), `e2e/headers.e2e.ts`, `.claude/hooks/doc-review.sh`, the brigade agents in `.claude/agents/`. Scripts are composition roots like routes: they import modules through `index.ts`.

## 3. Breaking the three baselined cycles

The three entries in `.dependency-cruiser-known-violations.json` are:

1. `rounds → filters → surprise → draw-order → rounds`
2. `genre-conflicts → rounds → filters → genre-conflicts`
3. `rounds → filters → surprise → rounds`

All three pass through one edge: `rounds.ts` imports the type `TypeChoice` from `filters.ts`. Removing that edge removes the three cycles. A second problem sits on the same files: `room` uses `rankTitles`, `weightedRating`, `TypeChoice` and `FilterCandidate`, which today live in `discovery` files that `room` may not import.

One PR, done in place in `src/domain` before any module moves (PR 2):

| Step | Change                                                                                                                                                                          | Effect                                                                      |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1    | New `domain/candidate.ts` with `TypeChoice`, `SurpriseCandidate`, and the catalog part of `FilterCandidate` (everything except `feelings`).                                     | `rounds` no longer imports `filters`: all three cycles are gone.            |
| 2    | New `domain/rating.ts` with `WEIGHT_VOTES`, `weightedRating`, `meanRating`, `rankTitles`. `rounds.ts` keeps the round building.                                                 | `genre-conflicts`, `draw-order`, `surprise` and `group-room` import a leaf. |
| 3    | `filters.ts` keeps `FilterCandidate` as the catalog candidate plus `feelings: number`. `group-room.ts` bounds its generics by the catalog candidate; it never reads `feelings`. | `room` no longer needs a `discovery` type.                                  |
| 4    | `SURPRISE_MAX_EXCLUDED` moves to `taste-signals.ts`; `idListSchema` moves to `_data/taste.ts`.                                                                                  | `accounts` and `room` stop importing `surprise`.                            |
| 5    | `isBrowserId` moves to a new `domain/browser-id.ts`.                                                                                                                            | `room` and browser storage stop importing `usage-events`.                   |
| 6    | `taste-golden.ts` is renamed `feelings-golden.ts`.                                                                                                                              | Its destination is `discovery`.                                             |
| 7    | `.dependency-cruiser-known-violations.json` becomes `[]`, then the file is deleted and `--ignore-known` is removed from `arch:check`, the Claude hook and `pre-commit`.         | New cycles fail immediately.                                                |

The old names are not re-exported from the old files: every importer is updated. Graph after the change, inside what becomes `discovery`: `filters → genre-conflicts`, `filters → surprise (type)`, `surprise → draw-order → feelings`, `rounds → (catalog only)`. No cycle.

Step 7 edits `package.json`, `.githooks/` and `.claude/`, which are high-risk paths: the owner merges this PR.

## 4. Splitting `schema.ts`

### 4.1 Tables per module

| Module      | Tables                                                                                                                                                                                                                                                                                                                                    | Count |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| `catalog`   | `catalog_titles`, `genres`, `catalog_title_genres`, `theme_keywords`, `catalog_title_theme_keywords`, `streaming_services`, `streaming_availability`, `people`, `title_credits`, `production_companies`, `catalog_title_production_companies`, `tmdb_recommendations`, `sync_runs`, `search_cache`, `circuit_breakers`, `search_counters` | 16    |
| `taste`     | `title_neighbors`                                                                                                                                                                                                                                                                                                                         | 1     |
| `accounts`  | `users`, `sign_in_codes`, `user_sessions`, `user_streamings`, `user_taste_signals`, `user_watched`, `user_onboarding`                                                                                                                                                                                                                     | 7     |
| `analytics` | `anonymous_usage_events`                                                                                                                                                                                                                                                                                                                  | 1     |
| `discovery` | `daily_picks`                                                                                                                                                                                                                                                                                                                             | 1     |
| `room`      | `group_rooms`, `group_room_members`, `group_room_finalists`, `group_room_votes`                                                                                                                                                                                                                                                           | 4     |
| `shared`    | `rate_limit_buckets`, `meta`                                                                                                                                                                                                                                                                                                              | 2     |
|             |                                                                                                                                                                                                                                                                                                                                           | 32    |

`tmdb_recommendations` is raw TMDB data written by the sync, so it is `catalog`'s; the graph build reads it through `catalog`'s `index.ts`. `meta` holds the environment marker read by the sync and by the migration guard, so it is `shared`'s.

### 4.2 Cross-module foreign keys

Every cross-module key today points to `catalog_titles.id`. With D1 option A, the `user*` keys to `users.id` are inside `accounts`.

| From (module)                                   | To                  |
| ----------------------------------------------- | ------------------- |
| `title_neighbors` ×2 (taste)                    | `catalog_titles.id` |
| `user_taste_signals`, `user_watched` (accounts) | `catalog_titles.id` |
| `anonymous_usage_events` (analytics)            | `catalog_titles.id` |
| `daily_picks` (discovery)                       | `catalog_titles.id` |
| `group_room_finalists` (room)                   | `catalog_titles.id` |

All follow ADR 0004. None points to another module's non-ID column, and no key to `users.id` leaves `accounts`.

### 4.3 Registered exceptions

Each one needs a line in `.dependency-cruiser.cjs` or an ADR, so the owner merges it.

| #   | Exception                                                                                                                                                                 | How it is registered                                                                                                                                                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| E1  | A module's `schema.ts` imports `catalog`'s or `accounts`'s `schema.ts`, only to write `.references()`. Drizzle needs the table object.                                    | `module-own-tables` and `module-public-api` get one `pathNot`: from `.../db/schema.ts` to `(catalog\|accounts)/infrastructure/db/schema.ts`. ADR 0004 gets a line saying so.                                                                                 |
| E2  | `titleReferenced` in the catalog repository asks whether five tables of other modules still point to a title, so the sync deactivates it instead of deleting it.          | It becomes raw SQL with the table names as text in `catalog/infrastructure/db/title-references.ts` (no TypeScript import), named in ADR 0012. A test lists every key to `catalog_titles` found in `drizzle/meta` and fails if one is missing from the query. |
| E3  | The daily sync also purges `rate_limit_buckets`, expired `group_rooms` and expired sign-in codes (`kinne_purge_expired_auth`). It is already raw SQL run as `kinne_sync`. | Kept as is in F2 and named in ADR 0012. Follow-up after F2: `scripts/sync-catalog.ts` calls a purge exported by `room`, `accounts` and `shared`.                                                                                                             |
| E4  | `DailyPicksRepository` joins `daily_picks` with five catalog tables.                                                                                                      | Read model `daily-picks`, short ADR 0013, and a `pathNot` for that one file in `module-own-tables`.                                                                                                                                                          |

Not exceptions: `scripts/seed.ts` and `scripts/test-group-room-repo.ts` import tables directly; scripts are outside `src/modules`, so no rule covers them. They get a comment naming the modules they touch.

### 4.4 The filtered draw needs no read model

ADR 0004 names the filtered draw as the example of a read model. The code does not need one: `candidates()` and `feelingData()` read only catalog tables. The one thing tying them to `discovery` is that `candidates()` calls `feelingMask()` while mapping rows. So:

- `catalog` keeps both queries. `candidates()` returns the catalog candidate without `feelings`.
- `discovery/infrastructure/candidates.ts` is a cached function that calls `catalog`'s loader and adds `feelings: feelingMask(c.genreTmdbIds, c.certification)`, the same expression as today.
- `feelingData()` returns a structural type defined in `catalog`; `discovery`'s `FeelingData` becomes an alias of it.

The result is one more cached copy of the candidate list (about 9 thousand small rows). ADR 0004 is updated to say the example no longer applies.

### 4.5 Mechanics

- `drizzle.config.ts`: `schema: ["./src/modules/*/infrastructure/db/schema.ts", "./src/shared/db/schema.ts", "./src/infrastructure/db/schema.ts"]`. The last entry is removed in the PR that empties the old file.
- Each module PR moves its own tables out of the old file. Tables not yet moved import the moved ones from the new path.
- After every move: `npm run db:generate` must print "No schema changes". The snapshot in `drizzle/meta` must not change. If a migration file appears, the PR stops and the diff goes to the owner. The cause is always a constraint or index name that changed, never data.
- `createDb()` stops receiving `{ schema }`. Verified: no code calls `db.query.*`.

## 5. PR sequence

Ten PRs, each into `develop`, each from an up-to-date `develop`. No PR changes behavior. Every PR passes the full gate before review:

```
npm run format:check && npm run lint && npm run typecheck && npm test && npm run build
npm run arch:check && npm run db:generate   # no schema changes
npm run test:visual                          # 42 screenshots, zero diff, never --update
npm run test:db && npm run test:e2e
```

`test:visual` and `test:db` are run by Fable or by the owner, not by a subagent (brigade rule). `git mv` is used for every move so history follows the file.

Out of scope for all ten: slop cleanup, the standard action answer shape, the per-module `createDb()` factory and the module README beyond a first version. They change code inside functions, so each becomes its own PR per module after F2 ("structure, then cleanup" in the foundation plan).

| PR  | Branch                      | Content                                                                                                                                                                                                                                        | Risk label | Merged by |
| --- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------- |
| 1   | `docs/adr-0012-module-deps` | ADR 0012 (D1 to D4, E1 to E3, the `ui/index.ts` client entry of section 6), ADR 0013 (E4), ADR 0004 note, `ALLOWED_MODULE_DEPS`, `overview.md`, `boundaries.md`, `kinne-standards`                                                             | high       | owner     |
| 2   | `refactor/untangle-domain`  | Section 3, in place                                                                                                                                                                                                                            | high       | owner     |
| 3   | `refactor/module-shared`    | Section 2.1, `src/app/_shell`, split of the storage primitives, `shared/db/schema.ts`                                                                                                                                                          | high       | owner     |
| 4   | `refactor/module-catalog`   | Section 2.2, 16 tables, E1 and E2 rules                                                                                                                                                                                                        | high       | owner     |
| 5   | `refactor/module-taste`     | Section 2.3                                                                                                                                                                                                                                    | high       | owner     |
| 6   | `refactor/module-accounts`  | Section 2.4, `test:db` paths, `timing-checks.yml` path                                                                                                                                                                                         | high       | owner     |
| 7   | `refactor/module-analytics` | Section 2.5                                                                                                                                                                                                                                    | high       | owner     |
| 8   | `refactor/module-discovery` | Section 2.6, E4 rule                                                                                                                                                                                                                           | high       | owner     |
| 9   | `refactor/module-room`      | Section 2.7; old `schema.ts` and `browser-storage.ts` are now empty and deleted                                                                                                                                                                | high       | owner     |
| 10  | `refactor/f2-closing`       | Delete the three `legacy-*` rules and the empty folders; add the rule "`src/app` and `scripts` import a module only through `index.ts`"; update the brigade paths, `doc-review.sh`, `eslint-rules.test.ts` probes; regenerate `docs/generated` | high       | owner     |

Every PR touches a schema file, `infrastructure/` or tooling, so the classifier marks all ten as high risk: none is auto-merged.

If PR 4 or PR 8 is too large to review (each moves about 60 files), it is cut in two: server side first (`domain`, `application`, `infrastructure`), then `ui`.

### Who does what in each PR

The Sonnet subagent is `dev` unless noted. It receives this document, the section numbers of its PR and the list of files, and nothing else to decide.

| PR  | Sonnet subagent executes                                                                                                                                      | Fable reviews                                                                                                                                                                                                                                                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `docs`: write the two ADRs and the doc edits from section 1 and 4.3. `devops`: the `ALLOWED_MODULE_DEPS` lines.                                               | Fable writes the ADR decisions itself; checks that `arch:check` still passes and that no rule was loosened beyond D1 to D3.                                                                                                                                                                                                              |
| 2   | The seven steps of section 3; update every importer; run the gate without the visual and database suites.                                                     | The diff contains only moved declarations and import lines (`git diff --color-moved`); the known-violations file is empty because the cycles are gone, not because a rule changed; `group-room.ts` type bound compiles without a cast.                                                                                                   |
| 3   | `git mv` per section 2.1 and 2.9; cut `browser-storage.ts` primitives; fix imports; `next.config.ts`, `e2e/headers.e2e.ts`.                                   | `shared` imports no module; `server-only` is still the first import of every file that had it; security headers output is byte-identical (`security-headers.test.ts`, `e2e`); the storage key names are unchanged strings.                                                                                                               |
| 4   | `git mv` per section 2.2; `banco`: move the 16 tables, `drizzle.config.ts`, run `db:generate`; write `index.ts` exporting only what other code imports today. | `db:generate` output and an unchanged `drizzle/meta`; the E2 query lists the same five tables as `titleReferenced` today; `candidates()` output differs from before only by the missing `feelings`; `index.ts` exports no table; `scripts/sync-catalog.ts` still runs `--help`/dry path.                                                 |
| 5   | `git mv` per section 2.3; `banco`: `title_neighbors`; split the graph repository.                                                                             | `load()` and `replaceNeighbors()` bodies are unchanged; `scripts/build-taste-graph.ts` and `calibrate-feelings.ts` compile and import through `index.ts`; taste goldens pass untouched.                                                                                                                                                  |
| 6   | `git mv` per section 2.4; `banco`: the 7 tables; update `test:db` and `timing-checks.yml` paths.                                                              | Line by line, because it is the security core: zod schemas still strict, session checks and rate limits in the same order, `accounts-sql.ts` unchanged, `server-only` kept, no email or token reaches a log; `test:db` 127 passing as before; the timing test still selected by name. Then the `revisor` agent and `security-checklist`. |
| 7   | `git mv` per section 2.5; split `origin.ts`.                                                                                                                  | The team browser still sends nothing (`measure.test.ts`); event names and sources unchanged; nothing but `discovery` and routes imports `analytics`.                                                                                                                                                                                     |
| 8   | `git mv` per section 2.6; add the 10-line candidates wrapper; `banco`: `daily_picks`.                                                                         | The algorithm goldens (`filtered-draw*.test.ts`, `rounds`, `feelings`, `genre-conflicts`, `daily-picks`) pass with import edits only; the wrapper's mask expression equals the old one; cache tags and `cacheLife` of every loader are unchanged; visual baseline.                                                                       |
| 9   | `git mv` per section 2.7; `banco`: the 4 tables; delete the two emptied files.                                                                                | `room` imports only `taste`, `catalog`, `accounts`; `group-room-sql.ts` unchanged; room code is never logged; `test:db` and the room action tests pass.                                                                                                                                                                                  |
| 10  | `devops`: rule edits and hook paths. `docs`: overview "where the code is today", brigade agent paths.                                                         | The old folders are gone; `arch:check` runs with zero known violations and zero legacy rules; the dependency diagram shows only allowed arrows.                                                                                                                                                                                          |

For every PR Fable also: reads the whole diff with `--color-moved=dimmed-zebra` to confirm no line inside a function changed; runs `test:visual`, `test:db` and `test:e2e`; calls `testes` if a test file needed more than import edits (it should not); calls `revisor` before the PR is opened; and stops for the owner if `db:generate` is not empty, a screenshot differs or a test assertion would have to change.

## 6. Risks and rollback

| Risk                                                                                                                                          | How it shows                                                                  | Mitigation                                                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The schema split changes a constraint or index name and Drizzle emits a migration.                                                            | `db:generate` writes a file.                                                  | Stop rule in 4.5. Nothing reaches a database: migrations are applied only on merge (`migrate-develop.yml`) and by hand in production.                                                 |
| A `server-only` import is dropped in a move and a secret reaches a client bundle.                                                             | `server-only.test.ts`, `bundle` job (`bundle-secrets.mjs`), ESLint rule 5.    | Fable checks the first line of each moved server file. ESLint rule 5 matches `infrastructure/(db\|auth\|tmdb)` at any depth, so it holds in modules; `ui/actions` are `"use server"`. |
| A cached loader moves and its cache key changes, so the first request after deploy is cold, or a tag is lost and revalidation misses a list.  | Slower first load; stale home after a sync.                                   | Loader bodies, tags and `cacheLife` are not edited. After each deploy of `develop`, run the revalidation check of the release checklist §8 on the preview.                            |
| The extra cached candidate list (4.4) raises memory or response time.                                                                         | Lighthouse and the baseline metrics in `docs/baseline.md`.                    | Compare after PR 8. If worse, compute the mask inside `catalog` behind a function passed in by `discovery`; that is a design change and goes to the owner.                            |
| `"use client"` and `"use server"` files move and a client component starts importing a server module through an `index.ts` that exports both. | Build error or ESLint rule 5.                                                 | A module with client code gets two entry files: `index.ts` (server and shared) and `ui/index.ts` (client components). Rule 1 is extended to accept both in PR 1.                      |
| Long-lived branches conflict with the moves.                                                                                                  | Merge conflicts in files that no longer exist.                                | Before each module PR, no other open PR touches that module's files. Feature work pauses on a module during its PR (one or two days each).                                            |
| The review is rubber-stamped because the diff is "only moves".                                                                                | A changed line hides among 60 renames.                                        | `--color-moved`, and the rule that a test assertion never changes. PR 6 gets a line-by-line read.                                                                                     |
| A script used only by a scheduled job breaks (`sync-catalog`, `graph:build`, `daily:pick`).                                                   | The 06:17 UTC run fails. It runs the code on `main`, so only after a release. | Typecheck covers scripts. Before the next release to `main`, run **Sync catalog (develop)** by hand on `develop` after PRs 4, 5 and 8.                                                |
| Production is released with F2 half done.                                                                                                     | —                                                                             | Any state between PRs is releasable: every PR is green and behavior-neutral. Still, prefer not to release between PR 3 and PR 10.                                                     |

**Rollback.** Every PR is one merge commit with no data change, so rollback is `git revert -m 1 <merge>` in a `fix/` branch and a PR into `develop`. PRs must be reverted in reverse order (10 → 1), because each one builds on the paths of the one before. No database rollback exists or is needed: F2 creates no migration. Production is untouched until a release PR, and Vercel's Instant Rollback covers the app if a release that includes F2 misbehaves.

## 7. Not verified while writing this plan

- `app/_actions/limits.test.ts`: assumed to test account limits; its destination is confirmed in PR 6.
- The exact export list of each `index.ts`: derived in each PR from what other code imports at that moment.
- Whether `Onboarding.tsx` needs anything from `discovery` (it would be a forbidden `accounts → discovery` import). The import list shows only `catalog` and `accounts` code today.

## 8. Changes to this plan during execution

The owner's rule for the execution is stricter than section 5: if a move needs a change inside a function, it is not done and goes to the post-F2 list.

| Where       | Planned                                                                                   | Done instead                                                                                                                                            |
| ----------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1, 4.5    | `db/client.ts` and `rate-limiter.ts` move to `shared/db`; `createDb()` drops `{ schema }` | Both stay in `src/infrastructure/db`. The old `schema.ts` re-exports every moved table, so `createDb()` and `drizzle.config.ts` are unchanged.          |
| 2.1         | `navItem.ts` in `src/app/_shell`                                                          | In `shared/ui`: it holds only class strings and `Button` imports it.                                                                                    |
| 1, ADR 0012 | Two entry files per module                                                                | Three: `index.ts` (safe anywhere), `server.ts` (server-only), `ui/index.ts` (client).                                                                   |
| 4.3 E2      | `titleReferenced` rewritten as raw SQL with a new test                                    | Untouched. It imports the other modules' tables through the old `schema.ts`.                                                                            |
| 4.4         | `candidates()` stops calling `feelingMask`                                                | Untouched. `catalog` imports `feelings` from `src/domain` until `discovery` moves; the owner decides then between the one-line change and a read model. |
| 2.2, 2.3    | `neighborEdges()` and the graph repository's `load()` split in the catalog PR             | Left for the `taste` PR.                                                                                                                                |

### Post-F2 list

1. `createDb()` without `{ schema }`, then `client.ts` and `rate-limiter.ts` move to `shared/db`, and the old `schema.ts` is deleted.
2. E2: `titleReferenced` as raw SQL in `catalog`, with the test that lists every foreign key to `catalog_titles`.
3. E3: the sync script calls a purge exported by each owner.
4. The feeling mask leaves `candidates()` (or the query becomes a read model).
