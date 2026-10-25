# Threat analysis — Accounts: sign-in by email code, onboarding, profile (US012–US015)

Status: approved 2026-10-23; data model approved with the adjustments of 2026-10-24 (section "Data model decisions"); security review of PR #34 applied 2026-10-24 (section "Review of PR #34"). Implements `docs/security.md` §13 (adapted from magic link to a 6-digit code, owner decision of 2026-10-23: nothing secret in URLs). Every mitigation marked **AC** is an acceptance criterion with a covering test, and every test in section "Attack tests" must try the attack for real (forged requests against the server actions), not only unit-check a helper.

## Scope

1. Request a 6-digit code by email; verify it; create the account on first successful verification.
2. Server-side sessions with a `__Host-` cookie; sign out; sign out everywhere.
3. Onboarding (3 loved, 3 disliked, streamings) saved per step.
4. Profile: edit streamings, taste and "Já vi"; download my data; delete my account (needs a fresh code).
5. Browser taste, "Já vi" and streamings merged into the account on sign-in, cleared from the browser on sign-out.
6. Feelings restricted to signed-in people.
7. Email through Resend (`RESEND_API_KEY`); a development transport that prints the code, outside production only.

New tables: `users`, `sign_in_codes`, `user_sessions`, `user_streamings`, `user_taste_signals`, `user_watched`, `user_onboarding` (migration `0011_accounts`, after the group room's `0010`; its snapshot chain must be regenerated when #28 merges). New secrets: `AUTH_SECRET` (HMAC key for codes and email hashes, separate from `RATE_LIMIT_SECRET`) and `RESEND_API_KEY`.

## Assets

| Asset                      | Why it matters                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------ |
| Account access             | Whoever holds a session sees and changes a person's taste and can delete the account |
| Email addresses            | The only personal data; leaks enable phishing and reveal who uses the Kinne          |
| Taste, "Já vi", streamings | Personal; reveal habits                                                              |
| Email sending reputation   | Abuse (mail bombing) gets the domain blocked and spends the free quota               |
| Anonymous metrics          | Must stay unlinkable to accounts (US012 RNE008)                                      |

## Entry points and trust boundaries

1. Browser → sign-in actions (`requestCode`, `verifyCode`): **untrusted** email and code.
2. Browser → profile and onboarding actions: **untrusted** bodies; identity only from the session cookie.
3. Session cookie → server: untrusted until its hash matches a live session.
4. Server → Resend: outbound, with a secret.
5. Email inbox → person: outside the Kinne's control (shared inboxes, forwarding).

## Threats

### A. Spoofing

| #   | Threat                                                     | L / I | Mitigation                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --- | ---------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Guessing the 6-digit code (10⁶ space)                      | M / H | AC: 5 attempts per code, 10-minute validity, one live code per email (a new one voids the old), at most 5 codes per email per hour and per-IP buckets on verify. **Only the browser that asked for the code can spend its attempts or use it** (challenge cookie, review M1), and from the 3rd burned code in 24 h the next request waits 1 h, doubling up to 24 h. Worst case for someone who holds the challenge cookie ≈ 25 guesses per email per hour until the wait kicks in |
| A2  | Stealing or forging a session cookie                       | L / H | AC: 32 random bytes; DB keeps SHA-256 only; `__Host-kinne_session`, `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`; rotated on sign-in; sliding 30 days, absolute 90 days; every action resolves the user from the cookie only                                                                                                                                                                                                                                                    |
| A3  | Session fixation (attacker plants a cookie before sign-in) | L / M | AC: sign-in always creates a new session and ignores any session cookie sent with `verifyCode`                                                                                                                                                                                                                                                                                                                                                                                    |
| A4  | Acting on another account by putting a user id in the body | M / H | AC: no action takes a user id; schemas reject unknown keys; a test sends another user's ids and expects no effect                                                                                                                                                                                                                                                                                                                                                                 |
| A5  | Reusing a code (replay) or a code from another email       | M / H | AC: codes are bound to the email hash and marked used atomically (`update … where used_at is null returning`); a second use fails                                                                                                                                                                                                                                                                                                                                                 |

### B. Tampering

| #   | Threat                                                                    | L / I | Mitigation                                                                                                                   |
| --- | ------------------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------- |
| B1  | Oversized or malformed onboarding, profile or merge payloads              | M / L | AC: strict zod; at most 3 ids per onboarding step, 200 per signal list, ids must exist in the catalog; unknown keys rejected |
| B2  | Sending taste lists with a session to override the account (US015 RNE003) | M / L | AC: with a session, browser-sent lists are ignored by the draw actions; a test checks it                                     |
| B3  | Feeling used without an account by calling the action directly            | M / L | AC: the server refuses `feeling` without a session (US015 RNE005), not only the UI                                           |
| B4  | Deleting the account with a stolen session                                | L / H | AC: deletion needs a fresh code sent to the email (US014 RNE001)                                                             |
| B5  | Cross-site request to sign out, delete or change data                     | L / M | Next.js server actions origin check stays on (security §13); `SameSite=Lax`; deletion also needs the code                    |

### C. Information disclosure

| #   | Threat                                                            | L / I | Mitigation                                                                                                                                                                                                     |
| --- | ----------------------------------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Account enumeration through responses or timing                   | H / M | AC: identical response body and status for known and unknown emails; email sending runs after the response (`after()`), so timing does not depend on the account; the account is created only on verify        |
| C2  | Email or code in logs, errors, events or URL                      | M / H | AC: never logged (a test greps the server log output of the flow); generic errors; no URL parameter; events keep no user id or email                                                                           |
| C3  | Code readable by others in development output reaching production | L / H | AC: the console transport exists only with `NODE_ENV=development` and no `VERCEL_ENV` (an allow-list, review B3); any other value, production included, fails closed: no email, generic error, nothing printed |
| C4  | Data export leaking internals or other people's data              | L / M | AC: export built from the session's user only; no session ids, hashes or internal ids beyond catalog title ids                                                                                                 |
| C5  | Taste of the previous person left on a shared computer            | M / M | AC: sign-out and deletion clear `kinne:taste`, `kinne:watched`, `kinne:streamings` (US015 RNE004)                                                                                                              |
| C6  | Database leak exposing usable secrets                             | L / H | Codes and session tokens stored only as hashes; email in clear (needed to send the code), readable only by the roles that need it (column grants)                                                              |

### D. Denial of service / abuse

| #   | Threat                                                | L / I | Mitigation                                                                                                                                                                                                                                                                                                 |
| --- | ----------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Mail bombing someone's inbox through "Receber código" | M / M | AC: per-email cooldown 60 s and 5 per hour; per-IP bucket (10 per 10 min) and 15 per IP per day; the daily cap is split into 60 sign-in requests and 20 reserved for people with a session (delete-account codes); reaching a cap writes one warning per hour to the server log, without email, IP or code |
| D2  | Exhausting the free Resend quota                      | M / M | Same as D1 (60 + 20 stays under Resend's 100/day); when a cap is hit the answer is the generic "limited" message. Residual risk in "Accepted risks"                                                                                                                                                        |
| D3  | Session table growth                                  | L / L | Expired sessions and codes are deleted by `kinne_purge_expired_auth`, which `catalog:sync` calls every day (review B2); a failed purge fails the job                                                                                                                                                       |

### E. Privileges and secrets

| #   | Threat                                             | L / I | Mitigation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --- | -------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1  | `RESEND_API_KEY` reaching the client bundle        | L / H | AC: read only in a `server-only` module; no `NEXT_PUBLIC_`; `npm run bundle:check` scans every client chunk for the secret names and for key shapes (`re_…`, database URLs) and fails the build (review B6)                                                                                                                                                                                                                                                                                                                        |
| E2  | App role able to read or change more than it needs | L / H | AC: `kinne_app` has no access at all to any account table (`sign_in_codes`, `user_sessions`, `users` — not even `id`/`created_at` — and the four taste tables), no DML, and cannot create temporary tables. It reaches accounts only through `SECURITY DEFINER` functions (`search_path = pg_catalog, pg_temp`, qualified objects) that take the session token hash, including `kinne_load_account` and `kinne_load_taste` for reads; `kinne_sync` only executes the purge function and reads the title column of the taste tables |

## Data model decisions (2026-10-24)

1. **Keyed hashes.** `AUTH_SECRET` (at least 32 characters, server-only, never `NEXT_PUBLIC_`) keys two HMAC-SHA-256 uses: the email hash of a pending code (`HMAC(AUTH_SECRET, "email|" + email)`) and the code hash (`HMAC(AUTH_SECRET, "code|" + purpose + "|" + email + "|" + code)`). A code is therefore only valid for the email and the purpose it was issued for (A5). Without `AUTH_SECRET`, no code is issued (fail closed). Session tokens are 32 random bytes stored as plain SHA-256 (high entropy, no key needed).
2. **Every function that acts on an account takes the session's `token_hash`** and resolves the user inside the database (`kinne_user_of`, not granted to `kinne_app`). No function has a `user_id` parameter, so the database itself guarantees that only a valid session changes or reads its own account. _Revised by the review of PR #34:_ `kinne_app` has no `SELECT` on any account table, not even `users (id, created_at)` or the four taste tables; the profile, the export and the draws read through `kinne_load_account(token_hash)` and `kinne_load_taste(token_hash)`, and the email through `kinne_session_email(token_hash)`. The site holds no user id at all. Definer functions use `search_path = pg_catalog, pg_temp` with every object schema-qualified; the already-applied ones keep `public` but get `pg_temp` last; `TEMPORARY` is revoked on the database.
3. **Merge on sign-in (US015 RNE002).** On a conflict for the same title the browser wins (it was touched in this very session, before the login); "Já vi" is a union; streamings: the account's if it has any, else the browser's. Limits: 200 per signal list, 2000 "Já vi", 10 sessions per account (the oldest goes first).
4. **The catalog sync keeps titles that people reference.** `titleReferenced` includes `user_taste_signals` and `user_watched`; `kinne_sync` gets `SELECT (catalog_title_id)` on both (no cascade: a title that leaves the streamings turns inactive and the person keeps it).
5. **Deleting the account** uses a code bound to the user (`purpose = delete_account`, `user_id` set, no email hash), issued only to a valid session and checked, with the same 5-attempt rule, inside `kinne_delete_account(token_hash, code_hash)`.
6. **Limits** (all through `kinne_take_tokens`): per email 1 request per 60 s and 5 per hour; per IP 10 requests per 10 min and 15 per day; per IP 20 verify attempts per 10 min; 60 sign-in emails per UTC day plus 20 reserved for people with a session. Delete-account codes: per account 1 per 60 s and 5 per hour (own buckets), per IP 5 per 10 min. Per code: 5 attempts, spent only by the browser that holds the challenge cookie; 3 burned codes in 24 h start an escalating wait (1 h, doubling, up to 24 h). Sessions renew at most once an hour.
7. **CI.** The attack tests need a real PostgreSQL (the functions are the guarantee). They run in a dedicated CI job with a PostgreSQL service; locally they run with `npm run test:db`.

## Review of PR #34 (2026-10-24)

An adversarial review of the first implementation found the items below. Each has an attack test that failed before the fix.

| #   | Finding                                                                                                                           | Fix                                                                                                                                                                                              | Test (src/…)                                                 |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| C1  | Without `pg_temp` in `search_path`, whoever can run SQL as `kinne_app` shadows `user_sessions` / `sign_in_codes` with temp tables | New functions use `pg_catalog, pg_temp` with qualified objects; already-applied definer functions get `pg_temp` last by `ALTER FUNCTION` in 0011; `REVOKE TEMPORARY` from PUBLIC and `kinne_app` | `infrastructure/db/accounts.db.test.ts` "C1"                 |
| A1  | One IP drains the single daily cap and blocks everyone                                                                            | 15 requests per IP per day; 60/20 split of the daily cap; log alert at the cap                                                                                                                   | `app/_actions/account.db.test.ts` "A1 e M2"                  |
| M1  | Anyone who knows an email can burn the live code or spend its attempts; guesses accumulate                                        | Challenge cookie bound to the code (hash in `sign_in_codes.challenge_hash`); escalating wait after 3 burned codes in 24 h                                                                        | `account.db.test.ts` "M1", `accounts.db.test.ts` "M1"        |
| M2  | Delete-account codes shared the sign-in buckets                                                                                   | `auth:del:*` buckets per account, `auth:ip:del:*` per IP, member pool                                                                                                                            | `account.db.test.ts` "A1 e M2"                               |
| M4  | `kinne_app` could read every taste table for any `user_id`                                                                        | `kinne_load_account(token)` / `kinne_load_taste(token)`; table and `users` grants removed; the site no longer holds a user id                                                                    | `accounts.db.test.ts` "permissões do banco"                  |
| M5  | Sign-out cleared the cookie and the browser before the database confirmed                                                         | Database first, cookie after; `leaveAccount` returns false and clears nothing on failure; the profile shows a retry                                                                              | `account.db.test.ts` "M5", `marks.test.ts`                   |
| B1  | Filters and the open draw run (with the account's "Já vi") stayed in `sessionStorage` after sign-out                              | `clearAccountTraces` on sign-out and on deletion                                                                                                                                                 | `marks.test.ts`                                              |
| B2  | The purge function was never called                                                                                               | `catalog:sync` calls it                                                                                                                                                                          | `accounts.db.test.ts` "B2", `auth-purge.test.ts`             |
| B3  | The console transport was allowed everywhere except production                                                                    | Allow-list: `NODE_ENV=development` and no `VERCEL_ENV`                                                                                                                                           | `account.db.test.ts` "10"                                    |
| B4  | Email validation accepted lists, `<>`, quotes                                                                                     | Strict dot-atom subset, the same regex in `normalizeEmail` and the `users_email_check`                                                                                                           | `domain/accounts.test.ts`, "B4" in both db tests             |
| B5  | `idListSchema` had no upper bound on ids                                                                                          | `.max(MAX_TITLE_ID)`                                                                                                                                                                             | `account.db.test.ts` "B5"                                    |
| B6  | Claimed bundle check and concurrency safety were not tested                                                                       | Secret scan in `bundle:check`; multi-connection tests for the 5-attempt limit and single-use codes                                                                                               | `scripts/bundle-secrets.test.ts`, `accounts.db.test.ts` "B6" |
| B7  | The local-only guards could be bypassed by `PGHOSTADDR`, `PGSERVICE`, host lists, URI `PGDATABASE`                                | One guard (`src/test/local-guard.ts`) used by the test helper and mirrored in `apply-migrations-local.sh`                                                                                        | `src/test/local-guard.test.ts`                               |

M3 (HTTP security headers, security.md §10) was fixed in its own PR (`feat/security-headers`); the one gap left, `'unsafe-inline'` in `script-src`, is an accepted risk in security.md §17.

## Attack tests (required)

The implementing session writes these as automated tests that call the real server actions (or route handlers) with forged inputs, and fail if the attack works:

1. Brute-force: 6 wrong codes on one code → the 6th and the right code both fail.
2. Replay: the right code twice → the second fails.
3. Cross-email: a code issued for A used with email B → fails.
4. Enumeration: response for a known and an unknown email is byte-identical, and timing differs by less than a set threshold over N runs.
5. Fixation: a cookie set before verify is not the session after verify.
6. IDOR: every profile action called with another user's ids in the body has no effect on that user.
7. Feeling without session → refused.
8. Deletion with a valid session but no fresh code → refused.
9. Sign-out → the old cookie no longer works on any action.
10. Production guard: with `NODE_ENV=production` and no `RESEND_API_KEY`, `requestCode` sends nothing and prints no code.
11. Cross-account: with the session token of account A, call every function that acts on an account (sign-out, sign-out everywhere, streamings, signals, "Já vi", onboarding step, delete code, delete account, email) with arguments built to hit account B (B's title ids, B's code hash, B's token hash as an argument, a token of another length or case); account B must be unchanged afterwards. A static check also fails if any `kinne_*` account function has a `user_id` parameter.

Added by the review of PR #34 (all call the real actions or the real `kinne_*` functions):

12. Temp-table shadowing: as `kinne_app` (with `TEMPORARY` granted back for the test), create a fake `user_sessions` and a fake `sign_in_codes` with forged rows; `kinne_session_email` must not return the victim's email and `kinne_sign_in` must not open a session. Also: every definer function has `pg_temp` last in its `search_path`, and `kinne_app` has no `TEMPORARY` privilege.
13. A browser without the challenge cookie sends 7 wrong guesses and the right code: nothing is spent and nothing signs in; a cookie from another request does not work; after 3 burned codes the request waits, then doubles.
14. Quotas: one IP cannot pass 15 requests per day even waiting out the 10-minute bucket; with the anonymous pool empty, a person with a session still gets the delete code; the cap alert is logged once with no email, IP or code; sign-in and delete buckets do not starve each other.
15. Sign-out with the database down is refused and the cookie stays; the same for sign-out everywhere.
16. Concurrency: 20 simultaneous wrong guesses spend exactly 5 attempts; 10 simultaneous right codes open one session; right and wrong guesses at the limit never both succeed and lock.
17. Tooling guard: `PGHOST` lists, `PGHOSTADDR`, `PGSERVICE` and URI-like `PGDATABASE` are refused by the test helper and by `apply-migrations-local.sh` before any connection.

18. Group room (US015 C2, RNE003): a member with a session who sends forged taste, watched and streaming lists when creating or joining a room, or forged streamings in `updatePreferences`, ends up stored with the account's lists (the room result is computed from the stored rows); an account with nothing stored gets empty lists, never the forged ones; without a session the browser's lists still apply. Genres stay a per-room choice.
19. Schema: `kinne_app` has no `CREATE` on `public`, directly or through `PUBLIC` (migration 0011 revokes it; PostgreSQL 14 and older grant it by default).

## Accepted risks

- Whoever controls the person's inbox controls the account (as with any passwordless sign-in).
- The email is stored in clear; it is needed to send codes.
- **Daily cap (A1, D1, D2).** The 60-email anonymous pool can still be emptied by an attacker who spreads requests over at least four IPs (15 per IP per day); until the next UTC midnight nobody new receives a code, while people with a session keep the 20 reserved for them. The cap protects Resend's free quota and the domain's reputation; the log alert tells the owner. A proof of work or CAPTCHA was left out on purpose (no new dependency); revisit if it ever happens.
- **Targeted delay (M1).** Someone who knows an email can still make that person wait: each request they make spends the person's 5-per-hour budget, and from their own browser they can burn three codes to trigger the escalating wait. They cannot sign in, spend the person's attempts or read the code. Fixing it needs a proof the requester is human or owns the email, which is out of scope.
- **Leftovers on a shared computer (B8).** Taste, "Já vi" and streamings left in a browser by a previous visitor (someone who never had an account, or never signed out) are merged into the next account that signs in there, and the browser wins conflicts (US015 RNE002). Accepted by design: the alternative drops data people expect to keep. Signing out always clears them (RNE004).
- **Residual after SQL access to `kinne_app`.** With the app credential, an attacker can still call the public `kinne_*` functions with forged arguments, but cannot forge a session, read emails or any account table, and needs `AUTH_SECRET` to produce a valid code hash.
