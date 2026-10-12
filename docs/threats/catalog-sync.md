# Threat analysis — Full catalog sync (step 1)

Status: approved 2026-10-12. Every mitigation marked **AC** is an acceptance criterion of the step 1 implementation. Items marked **Later** are scheduled for the step named.

## Scope

Daily GitHub Actions job (plus manual dispatch) that reads every subscription title on Netflix, Max, Prime Video, Disney+ and Globoplay in region BR from TMDB, validates it, and writes catalog, availability, certification and credits data to Neon. Pages read that data through cached server components.

## Assets

| Asset                                                           | Why it matters                                                          |
| --------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Production database (catalog, availability, usage events)       | Test metrics and the whole site depend on it                            |
| `TMDB_TOKEN`, `DATABASE_URL` for the sync role                  | Leak gives API abuse under the owner's account or database write access |
| Catalog integrity and suitability                               | Wrong, offensive or adult content in front of test users                |
| Availability (site up, Neon quota, Actions minutes, TMDB quota) | Free tiers are the only infrastructure                                  |
| Stable title URLs (slugs)                                       | Shared links and event references                                       |

## Trust boundaries

1. TMDB API → sync process: **untrusted**. Community-edited data, third-party service.
2. Sync process → database: trusted code, restricted role.
3. Database → cached pages → browser: rendered as text only.
4. GitHub repository → workflow → secrets: only code on `main` runs with secrets.
5. Developer machine → database: environment selection by humans (error-prone).

## Threats

Likelihood and impact are estimates (L/M/H).

### A. Data coming from TMDB (Tampering, Information disclosure)

| #   | Threat                                                                                             | L / I | Mitigation                                                                                                                                                                                                             |
| --- | -------------------------------------------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Script or HTML in title, synopsis, tagline or person name (stored XSS)                             | L / H | AC: strict zod schema per field; text only; React escaping; `dangerouslySetInnerHTML` forbidden; CSP (§10 of security.md)                                                                                              |
| A2  | Forged image path pointing elsewhere (`//evil.com/x.jpg`, `../`)                                   | L / M | AC: `^/[A-Za-z0-9]+\.(jpg\|png)$`; store the path only, the app builds `https://image.tmdb.org/t/p/...`                                                                                                                |
| A3  | Forged trailer key or non-YouTube video site                                                       | L / M | AC: accept only `site === "YouTube"`, key `^[A-Za-z0-9_-]{11}$`; embed via `youtube-nocookie.com` built by the app                                                                                                     |
| A4  | Invisible or direction-override Unicode (zero-width, bidi) creating look-alike titles or odd slugs | L / M | AC: NFC normalisation; strip `\p{Cc}` and `\p{Cf}` except ordinary whitespace; collapse whitespace                                                                                                                     |
| A5  | Oversized text fields (megabyte synopsis) bloating DB and pages                                    | L / M | AC: length caps (title 300, synopsis 2,000, tagline 300, person name 200); overflow rejects the field, not the run                                                                                                     |
| A6  | Out-of-range numbers (vote average 11, negative votes, runtime 10^9, year 3000)                    | L / L | AC: numeric ranges in schema; invalid → title rejected                                                                                                                                                                 |
| A7  | Adult content wrongly flagged (`adult:false`, no BR certification) reaching daily picks            | M / H | AC: `include_adult=false` on every call; BR certification stored; fallback to US certification mapped to BR age; no certification at all → `is_recommendable=false` for daily and surprise; 18 → only via the 18+ chip |
| A8  | Offensive but valid plain text in a synopsis                                                       | L / M | Accepted risk, reduced by A21 (manual block) and C4 (cache invalidation)                                                                                                                                               |
| A9  | Wrong provider data (title listed on a streaming it is not on)                                     | M / L | Accepted: TMDB/JustWatch is the source of truth; attribution shown                                                                                                                                                     |
| A10 | Duplicate or merged TMDB entries changing ids                                                      | L / M | AC: key is (`tmdb_id`, `type`); an id that disappears follows the removal rules (B6)                                                                                                                                   |
| A11 | Person data (cast/crew) — privacy                                                                  | L / L | AC: store only TMDB person id, name, role, order; no photos, birthdays, biographies or other personal data                                                                                                             |

### B. Sync process (Denial of service, Tampering)

| #   | Threat                                                                                              | L / I | Mitigation                                                                                                                                                            |
| --- | --------------------------------------------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | TMDB outage or empty/partial response mass-deleting or inactivating the catalog                     | M / H | AC: safety valve — abort before writing removals if more than 5% of active titles would be removed or inactivated in one run                                          |
| B2  | TMDB schema change making validation reject thousands of titles, read as "gone"                     | M / H | AC: a rejected title is left untouched, never counted as missing; abort if more than 2% of responses fail validation; record in `sync_runs`                           |
| B3  | Discover 10,000-result cap silently truncating the catalog                                          | H / M | AC: split queries (per provider × type × release-year range) until each query is under 10,000 results; log a warning and fail the run if any split still hits the cap |
| B4  | First load (~22k titles) interrupted                                                                | M / M | AC: idempotent upserts; a transaction per batch; resumable from the last completed batch; rerunning yields the same state                                             |
| B5  | Rate limit (429) or 5xx bursts                                                                      | M / L | AC: honour `Retry-After`; exponential backoff with jitter; capped retries; bounded concurrency (≤ 8 parallel requests)                                                |
| B6  | Removal deleting rows referenced by usage events (losing test metrics)                              | M / H | AC: delete only titles no event references; otherwise `is_active=false`. Removal of availability rows also goes through the safety valve                              |
| B7  | Hanging request or huge response body                                                               | L / M | AC: per-request timeout (15 s); response size cap (5 MB); workflow `timeout-minutes`                                                                                  |
| B8  | Two runs at once (manual + scheduled) corrupting batches and the safety-valve math                  | M / M | AC: workflow `concurrency` group with no cancel; Postgres advisory lock; second run exits cleanly and records `skipped`                                               |
| B9  | Slug hijack: a new title takes the slug of an existing one, or a renamed title changes its slug     | M / M | AC: slug fixed at creation and never regenerated; collision gets a numeric suffix; unique index; slug from `[a-z0-9-]` only, ≤ 120 chars                              |
| B10 | Dominant-colour extraction: decompression bomb, new native dependency (`sharp`), SSRF via redirects | L / M | Later (step 5): dominant colour moves to the hero step. Step 1 stores backdrop path and width only; no image download                                                 |
| B11 | Partial run leaving the catalog half old, half new and pages reading mid-write                      | M / L | AC: removals and `is_recommendable` recomputation happen only after all fetches succeed; cache invalidation at the end                                                |
| B12 | Clock or timezone errors in incremental `/changes` windows (missed changes)                         | M / L | AC: windows stored in UTC in `sync_runs`; each window overlaps the previous one by one day; full availability refresh daily regardless                                |

### C. Database and delivery (Elevation of privilege, Denial of service, Tampering)

| #   | Threat                                                                      | L / I | Mitigation                                                                                                                                                                                               |
| --- | --------------------------------------------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Sync running with owner or over-broad rights                                | M / H | AC: role `kinne_sync`: SELECT/INSERT/UPDATE/DELETE on catalog tables, SELECT on usage events (reference check), no DDL; created by a migration; only its connection string in the workflow secret        |
| C2  | Neon free tier (512 MB) exhausted, site down                                | L / H | AC: at most 10 cast members + directors per title; `sync_runs` records database size; run summary warns above 70%                                                                                        |
| C3  | Sync run pointed at the wrong database (production from a laptop)           | M / H | AC: required `SYNC_TARGET=develop\|production`; the script checks it against the database (a `meta.environment` row seeded per branch) and aborts on mismatch; production only from the workflow         |
| C4  | Cached pages keep showing corrected or blocked content                      | H / M | AC: tag-based revalidation for changed titles at the end of each run (Vercel revalidation endpoint protected by a secret, or `revalidateTag` from a server route — decided in the PR with justification) |
| C5  | No way to pull a bad title immediately                                      | M / M | AC: `is_blocked` column, set manually, never overwritten by the sync; blocked titles are excluded everywhere and their page returns the not-found view                                                   |
| C6  | SQL injection via TMDB strings                                              | L / H | AC: Drizzle with bound parameters only; no `sql.raw` with external data                                                                                                                                  |
| C7  | Recomputation of `is_recommendable` drifting from the rules                 | M / M | AC: single pure function with unit tests: pt-BR synopsis present, backdrop present, ≥ 50 votes, certification known, not blocked, active                                                                 |
| C8  | Revalidation endpoint (if C4 uses one) becoming a new public attack surface | M / M | AC: POST only, secret in header compared in constant time, strict body schema, rate limited, 404 on anything else                                                                                        |

### D. Workflow and secrets (Information disclosure, Tampering, Spoofing)

| #   | Threat                                                                    | L / I | Mitigation                                                                                                                                                              |
| --- | ------------------------------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Token or connection string printed in logs                                | M / H | AC: token sent only in the `Authorization` header; never log URLs with query strings, request headers or response bodies; errors log status code and endpoint path only |
| D2  | Log injection: TMDB text with newlines forging log lines                  | L / L | AC: logs contain ids and counts only, never TMDB text                                                                                                                   |
| D3  | A PR changing the workflow to exfiltrate secrets                          | L / H | AC: scheduled run checks out `main`; no `pull_request_target`; secrets not exposed to PR workflows; actions pinned by SHA; `permissions: contents: read`                |
| D4  | Compromised npm dependency inside the job with secrets in its environment | L / H | AC: no new runtime dependencies for step 1 beyond what is in the repo; `npm ci`; existing audit gates                                                                   |
| D5  | TMDB token with write power (session token instead of read token)         | L / L | Owner check: confirm the secret is the "API Read Access Token"                                                                                                          |
| D6  | Manual dispatch by someone else                                           | L / M | Only the owner has write access; `workflow_dispatch` inputs (if any) validated by a closed enum                                                                         |
| D7  | Secrets leaked through a failing run's artifacts                          | L / H | AC: the job uploads no artifacts; the run summary contains only counts                                                                                                  |

### E. Repudiation and monitoring

| #   | Threat                          | L / I | Mitigation                                                                                                                                                                                                |
| --- | ------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1  | No record of what a run changed | M / M | AC: `sync_runs` table: start, end, target, status (`ok`/`aborted`/`failed`/`skipped`), counts (fetched, inserted, updated, inactivated, deleted, rejected, recommendable), abort reason; no personal data |
| E2  | Silent failure for days         | M / M | AC: non-zero exit on failure or abort, so GitHub emails the owner; run summary written to `$GITHUB_STEP_SUMMARY`                                                                                          |

### F. Legal and terms

| #   | Threat                                            | L / I | Mitigation                                                                      |
| --- | ------------------------------------------------- | ----- | ------------------------------------------------------------------------------- |
| F1  | Breaking TMDB terms (attribution, non-commercial) | L / M | Existing attribution kept; no bulk re-export of TMDB data                       |
| F2  | Provider data credited wrongly                    | L / L | "Dados de disponibilidade: JustWatch via TMDB" kept where availability is shown |

## Accepted risks

- A8: valid but offensive text can appear until blocked (C5) or fixed upstream.
- A9: provider availability can be wrong when TMDB/JustWatch is wrong.
- B2 residual: a malformed but schema-valid TMDB response can overwrite fields of the titles in its batch (up to 200, or more before the 2% check starts at 1,000 responses) before the run aborts, because each batch is saved on arrival so an interrupted run can resume (B4). Mitigated by the degraded-field check (a non-null synopsis, backdrop, certification or title that comes back empty keeps the stored value and counts as a rejection) and by the recommendability valve (B1) before `finalize`. Fields that change to another valid value are not detected.
- Forged anonymous events (see security.md §17) — unchanged.
