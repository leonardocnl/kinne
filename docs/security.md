# Kinne — Security baseline

Security by design: every feature is specified, built and reviewed against these rules. A change that breaks a rule is a bug, not a trade-off, unless the exception is recorded in "Accepted risks" with a reason.

## 1. Principles

- **Deny by default.** Anything not explicitly allowed (route, method, input field, origin, script source) is rejected.
- **Least privilege.** Every credential, database role, workflow and integration gets the minimum access it needs, nothing more.
- **Never trust the client.** The browser, its storage and every request it sends are attacker-controlled. The server re-checks every rule the UI enforces.
- **Fail closed.** On error, the system denies, shows a generic message and logs the detail server-side only.
- **Minimal surface.** Fewer endpoints, fewer dependencies, fewer secrets, less data stored.
- **Defense in depth.** No single control is relied on; each layer assumes the one before it failed.
- **No security by obscurity** as the only control. The team capability path (US006) is the one accepted exception, recorded below.

## 2. Threat model

| Actor                         | Goal                                                                        | Main controls |
| ----------------------------- | --------------------------------------------------------------------------- | ------------- |
| Automated scanners and bots   | Find `.env`, `.git`, source maps, admin panels, debug endpoints, known CVEs | §3, §4, §10   |
| Script against server actions | Forge or flood events, distort test metrics, exhaust database or TMDB quota | §5, §7        |
| Scraper                       | Copy the catalog at scale                                                   | §7            |
| Malicious page or extension   | XSS, clickjacking, data theft from storage                                  | §6, §8, §9    |
| Supply chain                  | Compromised npm package or GitHub Action                                    | §11           |
| Credential leak               | Key in repo, logs, client bundle or chat                                    | §4, §11       |

## 3. Attack surface

- Only routes defined in `src/app` exist. No catch-all route that echoes the requested path.
- No `/api/*` route handlers unless a feature requires one; prefer server actions. Every route handler declares its allowed methods; unsupported methods return 404, not 405, so a route that must stay hidden (`/api/revalidate`) is not confirmed to exist.
- Unknown paths return the standard 404 page. Probes such as `/.env`, `/.git/config`, `/wp-admin`, `/server-status` must return 404 with no detail.
- `public/` contains only static assets meant to be public. Nothing generated from environment variables.
- `poweredByHeader: false` (no `X-Powered-By`).
- `productionBrowserSourceMaps: false` (no source maps in production).
- No debug, health or admin pages in production. Dev-only pages (e.g. `/design`) are excluded from production builds or gated.

## 4. Secrets

- Secrets live only in `.env.local` (gitignored), GitHub Actions secrets and Vercel environment variables. Never in code, commits, issues, PRs, logs, screenshots or chat.
- No secret ever uses the `NEXT_PUBLIC_` prefix.
- Every module that reads a secret or touches the database imports `server-only`, so importing it from client code breaks the build.
- Environment variables are validated at startup with a strict schema; the process refuses to start on missing or malformed values, and the error names the variable, never its value.
- **Database roles:**
  - `kinne_app` (used by the site, created by migration 0006): `SELECT` on catalog tables, `INSERT` on events and on `daily_picks` (the home page writes a missing day), `SELECT`/`INSERT`/`UPDATE` on `search_cache` and `search_counters`, and `EXECUTE` on `kinne_take_tokens` and `kinne_trip_breaker` (`SECURITY DEFINER`, migration 0007: the site never writes the limiter tables directly). No DDL, no `DELETE` anywhere, no `UPDATE` on catalog or events.
  - `kinne_sync` (used by the daily job): read/write on catalog tables, plus `SELECT`/`DELETE` on the search state (`search_cache`, `rate_limit_buckets`, `search_counters`) for the daily purge and run summary.
  - Accounts (migration `0011_accounts`, [docs/threats/accounts.md](threats/accounts.md)): `kinne_app` gets `EXECUTE` on the `kinne_*` account functions (`SECURITY DEFINER`, `search_path = pg_catalog, pg_temp`, schema-qualified objects; each acts on the session `token_hash` it receives and resolves the user inside, never a `user_id` from the app), including `kinne_load_account` / `kinne_load_taste` for reads and `kinne_session_email` for the email. It has **no** `SELECT` on any account table (`users`, `sign_in_codes`, `user_sessions`, the four taste tables) and, with `PUBLIC`, no `TEMPORARY` privilege on the database. `kinne_sync` gets `SELECT (catalog_title_id)` on signals and watched (the purge must not delete a referenced title) and `EXECUTE` on `kinne_purge_expired_auth`, which `catalog:sync` calls daily. Definer functions from earlier migrations (`kinne_take_tokens`, `kinne_trip_breaker`, the group room's) got `pg_temp` appended to their `search_path` by `ALTER FUNCTION` in 0011.
  - Owner role: migrations and the RNF10 deletion of test events (the only role with `DELETE` on events), used from a developer machine, never stored in Vercel or in a file; see docs/release-checklist.md.
- Preview deployments never receive production credentials.
- Rotation: on any suspected leak, rotate the key first and investigate after. Rotation steps are documented per secret.
- CI runs secret scanning (gitleaks) on every PR; GitHub secret scanning and push protection are enabled.

## 5. Input validation

- Every server action and route handler is a public endpoint and is treated as one, whatever the UI calls it.
- All input is parsed with a strict schema (zod): closed enums, numeric ranges, string length caps, array size caps, unknown keys rejected.
  - Example: rating 6.4–9.0 in steps of 0.1; genres only the five Kinne genres; type only `movie`/`series`/`both`; origin only `daily`/`filters`/`surprise`/`link`.
- Slugs match `^[a-z0-9]+(-[a-z0-9]+)*$` and a maximum length before any database lookup.
- The server derives everything it can (title IDs, dates, eligibility) instead of accepting it from the client.
- Database access goes only through Drizzle with bound parameters. No string-built SQL.
- Request bodies above a small size cap are rejected.

## 6. Output, errors and logging

- Users see only generic messages (`Não conseguimos carregar agora`). No stack traces, SQL, table names, file paths or library versions.
- `console.*` is removed from production client bundles (`compiler.removeConsole`, keeping only `error` if needed). The browser console stays empty in normal use.
- Server logs never contain secrets, connection strings, full request bodies or personal data.
- React escapes output by default; `dangerouslySetInnerHTML` is forbidden. TMDB text is always rendered as text.

## 7. Abuse and rate limiting

- Rate limits per client on every write and every expensive read: events, draws, filter list, surprise.
- Implementation stays portable (RNF11): a token bucket in Postgres (`kinne_take_tokens`, migration 0006) on expensive paths (TMDB search fallback, global TMDB budget, `/api/revalidate`), an in-memory per-instance limit plus caching on cheap paths (catalog search). No vendor-only store.
- The client IP comes only from `getClientIp()` (`src/infrastructure/client-ip.ts`), the one place that knows the host: on Vercel the platform-set `x-real-ip`, never the raw `X-Forwarded-For`. IPv6 is bucketed by /64.
- If the Postgres limiter cannot answer, the protected action is refused (fail closed).
- The client IP is used only in memory or as a salted, rotating hash for rate limiting (HMAC with a salt derived from `RATE_LIMIT_SECRET` and the UTC date, never stored); it is never stored with events.
- Events are idempotent where possible and deduplicated server-side within a short window.
- On limit: respond with a generic refusal; the UI degrades silently (events are best effort, never block the screen).

## 8. URLs and navigation

- URLs carry only the path (`/titulo/suzume-2022`). No query parameters for state, origin, filters, panels or tracking.
- Transient state lives in `sessionStorage` or `history.state`.
- External links use `rel="noopener noreferrer"` and open only to an allowlist of hosts (YouTube, streaming services, TMDB).

## 9. Browser storage

- `localStorage`/`sessionStorage` hold only non-sensitive data: anonymous browser id, marked titles, filter preferences. With an account, taste, "Já vi" and streamings live in the account; the browser deletes its copies on sign-in and on sign-out. The session token is only in the `__Host-kinne_session` cookie (`HttpOnly`), never in storage.
- Never tokens, credentials or anything that grants access.
- Everything read from storage is untrusted: parsed with a schema, and invalid data is discarded and reset.

## 10. HTTP security headers

Applied to every response:

- `Content-Security-Policy` with per-request nonces and `strict-dynamic`; `default-src 'self'`; `img-src 'self' image.tmdb.org`; `frame-src www.youtube-nocookie.com`; `object-src 'none'`; `base-uri 'none'`; `form-action 'self'`; `frame-ancestors 'none'`; `upgrade-insecure-requests`.
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`.
- `X-Content-Type-Options: nosniff`.
- `Referrer-Policy: strict-origin-when-cross-origin`.
- `Permissions-Policy` denying camera, microphone, geolocation, payment, USB and similar.
- `Cross-Origin-Opener-Policy: same-origin`.

Target: grade A+ on securityheaders.com and Mozilla Observatory.

## 11. Supply chain and CI/CD

- `package-lock.json` committed; installs use `npm ci`.
- CI runs `npm audit --omit=dev --audit-level=high` and fails on findings: the blocking audit covers production dependencies. Dev dependencies are audited by a second job (`npm-audit-dev`) that never fails and writes its findings as a table in the run summary (`scripts/audit-summary.mjs`), so they stay visible in every run.
- Dependabot enabled for npm and GitHub Actions.
- GitHub Actions pinned to commit SHAs; each workflow declares `permissions:` with the minimum (default `contents: read`).
- CodeQL analysis on PRs.
- `main` is protected: PR required, checks required, no force push, no deletion.
- Scheduled workflows check out `main` explicitly.
- Integrations (Vercel, Claude GitHub App) have access only to the kinne repository. Deploy hooks are deleted after use.

## 12. Data and privacy

- Collect the minimum: no names, emails, IPs or device fingerprints in the guest mode.
- Test events are deleted by the RNF10 deadline (`npm run events:delete`).
- Retention, purpose and contact are stated in the privacy text before any account feature ships (LGPD). `/privacidade` is a draft until the owner reviews it (US014 RNE003). Accounts keep an email (stored in plain only in `users`; pending sign-in codes keep only an HMAC of it), streamings, taste, "Já vi" and onboarding progress; the profile downloads and deletes them.

## 13. Authentication (6-digit email code)

Implemented in US012; decisions and attack tests in [docs/threats/accounts.md](threats/accounts.md). No library, only Node `crypto`.

- Nothing secret in a URL: the email carries a 6-digit code (`crypto.randomInt`), valid for 10 minutes, stored only as an HMAC-SHA-256 keyed by `AUTH_SECRET` over code, purpose and email. Five wrong attempts lock it; a used code never works again; one live code per email.
- Same response and same effect whether or not the email exists (no user enumeration); the account is created only when a code is confirmed.
- The code is bound to the browser that asked for it: `requestCode` sets the `__Host-kinne_challenge` cookie (`HttpOnly`, `Secure`, `SameSite=Lax`, 10 minutes) and the database keeps its hash with the code. Without that cookie nobody spends attempts or signs in. After 3 burned codes for an email in 24 h the next request waits 1 h, doubling up to 24 h.
- Rate limits (all-or-nothing buckets, fail closed): per email 1/60 s and 5/hour, per client on requests (10 per 10 min, 15 per day) and on confirmations, and a daily cap split into 60 sign-in emails and 20 reserved for people with a session; reaching a cap logs one warning an hour, without personal data. Delete-account codes have their own per-account and per-IP buckets.
- Session cookie `__Host-kinne_session`: `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, no `Domain`; 32 random bytes, only their SHA-256 in the database; a new token on every sign-in (no fixation); 30 days sliding with a 90-day cap; invalidated on sign-out and on "sign out everywhere"; at most 10 sessions per account.
- Deleting the account needs a fresh code bound to that account.
- The development mailer (console) exists only with `NODE_ENV=development` and no `VERCEL_ENV` (an allow-list); with no mailer, nobody signs in.
- Sign-out ends the session in the database first; the cookie and the browser's copies go only after it confirms.
- Email addresses are a strict dot-atom subset, the same regex in the app and in the `users` CHECK.
- Server actions keep Next.js origin checking enabled; no custom endpoint skips it.

## 14. Verification

- Automated checks in CI:
  - Probe list (`/.env`, `/.git/config`, `/.env.local`, `/_next/../`, etc.) returns 404.
  - Security headers present on `/`, `/titulo/*` and a 404 page.
  - Production bundle contains no secret patterns and no source maps.
  - Server action schemas reject out-of-range and unknown-key payloads (unit tests).
- OWASP ZAP baseline scan against the preview deployment on PRs into `main`.
- Manual test by the owner before each release to production, following OWASP ASVS level 1 as the checklist.

## 15. OWASP Top 10 (2025) coverage

Every PR states which categories it touches and how the rules below are met.

| OWASP 2025                                 | What it means for Kinne                                                                                                                                           | Rules        |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| A01 Broken Access Control                  | Guest mode has no private data today; any future account data is reachable only by its owner, checked on the server for every request; capability path documented | §5, §13, §15 |
| A02 Security Misconfiguration              | Headers, no source maps, no debug pages, no `X-Powered-By`, previews isolated from production                                                                     | §3, §4, §10  |
| A03 Software Supply Chain Failures         | Lockfile, `npm ci`, audit, Dependabot, pinned Actions, minimal workflow permissions                                                                               | §11          |
| A04 Cryptographic Failures                 | HTTPS only with HSTS; tokens from a CSPRNG and stored hashed; no homemade crypto                                                                                  | §10, §13     |
| A05 Injection                              | Strict schemas, Drizzle bound parameters, no `dangerouslySetInnerHTML`, CSP                                                                                       | §5, §6, §10  |
| A06 Insecure Design                        | Threat model, security section in every user story, abuse cases reviewed before build                                                                             | §2, §16      |
| A07 Authentication Failures                | Email-code rules (§13) implemented in US012                                                                                                                       | §13          |
| A08 Software or Data Integrity Failures    | Only CI-checked code reaches `main`; catalog sync validates TMDB data with a schema before writing; no unsigned remote scripts                                    | §5, §11      |
| A09 Security Logging and Alerting Failures | Server-side logs for refused requests and rate-limit hits, without secrets or personal data; alert on sync failure                                                | §6, §7       |
| A10 Mishandling of Exceptional Conditions  | Fail closed, generic messages, every external call has a timeout and a handled failure path                                                                       | §1, §6       |

## 16. How the rules are enforced

AI-assisted code follows these rules because the process checks them, not because the prompt asks nicely.

1. **Threat analysis before the story.** Before a user story is written, its attack vectors are mapped and approved: assets, entry points, trust boundaries, and threats by STRIDE (Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege), each with likelihood, impact and mitigation. Approved mitigations become acceptance criteria in the story's "Segurança" section, so they are built and tested like any other requirement. A story without this analysis is not ready to build.
2. **Agent instructions.** `CLAUDE.md` points to this file and lists the non-negotiable rules. Every session reads it.
3. **PR template.** Each PR fills a security checklist (OWASP categories touched, new inputs and their schemas, new secrets, new dependencies). An empty checklist blocks review.
4. **Automated gates in CI**, required to merge: lint with security rules, Semgrep (OWASP ruleset), gitleaks, `npm audit`, CodeQL, probe and header tests, bundle scan for secrets and source maps.
5. **Review.** A security review pass, run as a separate agent that did not write the code, before any PR into `develop`. Findings are fixed or recorded in "Accepted risks".
6. **Release check.** ZAP baseline on the preview and the owner's manual ASVS level 1 pass before `develop` goes to `main`.

## 17. Accepted risks

| Risk                                                                                                       | Why accepted                                                                                       | Mitigation                                                                                                                                                                                                                                                                                    |
| ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Anonymous events can be forged by a script that mimics the site                                            | Guest mode has no identity to verify                                                               | Strict schemas, rate limits, dedupe, analysis ignores outliers                                                                                                                                                                                                                                |
| Team capability path (US006) works for anyone who learns it                                                | Simplest exclusion without accounts                                                                | Long random path, rotated if leaked; impact limited to excluding that browser from metrics                                                                                                                                                                                                    |
| Missing titles return 200 with `noindex` (soft 404)                                                        | Next.js cacheComponents behaviour; real 404 would need a database query per visit                  | Documented in requirements doc 04                                                                                                                                                                                                                                                             |
| `braces` <=3.0.3 (GHSA-vfj7-8cjw-p6xm) via `eslint-config-next`                                            | Dev-only lint tooling; no patched release exists                                                   | Never reaches the production bundle; lint only processes repo-controlled paths; revisit when Dependabot opens a fix                                                                                                                                                                           |
| `sync-catalog.yml` checks out `develop` instead of `main` (catalog-sync trust boundary 4, D3)              | Production is still on migration 0001, so the daily sync targets the develop database until launch | Temporary. `develop` changes only through PRs the owner merges; the workflow holds only the develop `kinne_sync` secret (no production database, no revalidation secrets); `SYNC_TARGET: develop`. At launch: `ref: main`, `SYNC_TARGET: production`, production secrets, and remove this row |
| Sign-in emails can be exhausted for the day (accounts A1, D1)                                              | The 60-email pool protects Resend's free quota and the domain; no CAPTCHA or new dependency        | 15 requests per IP per day, 20 emails reserved for people with a session, one log warning per hour at the cap; revisit if it happens                                                                                                                                                          |
| Someone who knows an email can delay that person's sign-in (accounts M1)                                   | Needs proof the requester owns the email or is human, out of scope                                 | They cannot sign in, spend the person's attempts or read the code; escalating wait after burned codes                                                                                                                                                                                         |
| Leftover browser data of a previous visitor merges into the next account that signs in there (accounts B8) | By design (US015 RNE002); dropping it would lose data people expect to keep                        | Signing out always clears the browser (RNE004)                                                                                                                                                                                                                                                |

The temporary in-memory limit on `/api/revalidate` was replaced in step 2 by the Postgres token bucket (§7): only requests that carry the right secret take a token, so an anonymous flood cannot spend the sync's budget, and a limiter failure answers the same 404.
