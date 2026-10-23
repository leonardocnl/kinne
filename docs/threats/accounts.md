# Threat analysis — Accounts: sign-in by email code, onboarding, profile (US012–US015)

Status: proposed 2026-10-23, awaiting the owner's approval. Implements `docs/security.md` §13 (adapted from magic link to a 6-digit code, owner decision of 2026-10-23: nothing secret in URLs). Every mitigation marked **AC** is an acceptance criterion with a covering test, and every test in section "Attack tests" must try the attack for real (forged requests against the server actions), not only unit-check a helper.

## Scope

1. Request a 6-digit code by email; verify it; create the account on first successful verification.
2. Server-side sessions with a `__Host-` cookie; sign out; sign out everywhere.
3. Onboarding (3 loved, 3 disliked, streamings) saved per step.
4. Profile: edit streamings, taste and "Já vi"; download my data; delete my account (needs a fresh code).
5. Browser taste, "Já vi" and streamings merged into the account on sign-in, cleared from the browser on sign-out.
6. Feelings restricted to signed-in people.
7. Email through Resend (`RESEND_API_KEY`); a development transport that prints the code, outside production only.

New tables (names indicative; the implementing session proposes the model for approval): users, sign-in codes, sessions, user streamings, user taste signals, user watched titles, onboarding progress. New secret: `RESEND_API_KEY`.

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

| #   | Threat                                                     | L / I | Mitigation                                                                                                                                                                                                                         |
| --- | ---------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Guessing the 6-digit code (10⁶ space)                      | M / H | AC: 5 attempts per code, 10-minute validity, one live code per email (a new one voids the old), at most 5 codes per email per hour and per-IP buckets on verify. Worst case ≈ 25 guesses per email per hour: ≈ 2.5 × 10⁻⁵ per hour |
| A2  | Stealing or forging a session cookie                       | L / H | AC: 32 random bytes; DB keeps SHA-256 only; `__Host-kinne_session`, `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`; rotated on sign-in; sliding 30 days, absolute 90 days; every action resolves the user from the cookie only     |
| A3  | Session fixation (attacker plants a cookie before sign-in) | L / M | AC: sign-in always creates a new session and ignores any session cookie sent with `verifyCode`                                                                                                                                     |
| A4  | Acting on another account by putting a user id in the body | M / H | AC: no action takes a user id; schemas reject unknown keys; a test sends another user's ids and expects no effect                                                                                                                  |
| A5  | Reusing a code (replay) or a code from another email       | M / H | AC: codes are bound to the email hash and marked used atomically (`update … where used_at is null returning`); a second use fails                                                                                                  |

### B. Tampering

| #   | Threat                                                                    | L / I | Mitigation                                                                                                                   |
| --- | ------------------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------- |
| B1  | Oversized or malformed onboarding, profile or merge payloads              | M / L | AC: strict zod; at most 3 ids per onboarding step, 200 per signal list, ids must exist in the catalog; unknown keys rejected |
| B2  | Sending taste lists with a session to override the account (US015 RNE003) | M / L | AC: with a session, browser-sent lists are ignored by the draw actions; a test checks it                                     |
| B3  | Feeling used without an account by calling the action directly            | M / L | AC: the server refuses `feeling` without a session (US015 RNE005), not only the UI                                           |
| B4  | Deleting the account with a stolen session                                | L / H | AC: deletion needs a fresh code sent to the email (US014 RNE001)                                                             |
| B5  | Cross-site request to sign out, delete or change data                     | L / M | Next.js server actions origin check stays on (security §13); `SameSite=Lax`; deletion also needs the code                    |

### C. Information disclosure

| #   | Threat                                                            | L / I | Mitigation                                                                                                                                                                                              |
| --- | ----------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Account enumeration through responses or timing                   | H / M | AC: identical response body and status for known and unknown emails; email sending runs after the response (`after()`), so timing does not depend on the account; the account is created only on verify |
| C2  | Email or code in logs, errors, events or URL                      | M / H | AC: never logged (a test greps the server log output of the flow); generic errors; no URL parameter; events keep no user id or email                                                                    |
| C3  | Code readable by others in development output reaching production | L / H | AC: the console transport refuses to load when `NODE_ENV=production` or `VERCEL_ENV=production`; production without `RESEND_API_KEY` fails closed (no email, generic error), never prints               |
| C4  | Data export leaking internals or other people's data              | L / M | AC: export built from the session's user only; no session ids, hashes or internal ids beyond catalog title ids                                                                                          |
| C5  | Taste of the previous person left on a shared computer            | M / M | AC: sign-out and deletion clear `kinne:taste`, `kinne:watched`, `kinne:streamings` (US015 RNE004)                                                                                                       |
| C6  | Database leak exposing usable secrets                             | L / H | Codes and session tokens stored only as hashes; email in clear (needed to send the code), readable only by the roles that need it (column grants)                                                       |

### D. Denial of service / abuse

| #   | Threat                                                | L / I | Mitigation                                                                                                                    |
| --- | ----------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------- |
| D1  | Mail bombing someone's inbox through "Receber código" | M / M | AC: per-email cooldown 60 s and 5 per hour; per-IP bucket; global daily cap below Resend's free 100/day with an alert in logs |
| D2  | Exhausting the free Resend quota                      | M / M | Same as D1; when the cap is hit, the same generic message as C6 of US012                                                      |
| D3  | Session table growth                                  | L / L | Expired sessions and codes deleted in the daily job                                                                           |

### E. Privileges and secrets

| #   | Threat                                             | L / I | Mitigation                                                                                                                                |
| --- | -------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| E1  | `RESEND_API_KEY` reaching the client bundle        | L / H | AC: read only in a `server-only` module; no `NEXT_PUBLIC_`; bundle check covers the key pattern                                           |
| E2  | App role able to read or change more than it needs | L / H | AC: `kinne_app` gets only the grants each table needs (column-level where possible); `kinne_sync` only deletes expired sessions and codes |

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

## Accepted risks

- Whoever controls the person's inbox controls the account (as with any passwordless sign-in).
- The email is stored in clear; it is needed to send codes.
