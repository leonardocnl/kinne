# Threat analysis — Group room (US011)

Status: approved 2026-10-23. Every mitigation marked **AC** is an acceptance criterion with a covering test (or, for headers and cookies, an automated check) in the branch that implements it.

## Scope

Several phones join a short-lived room by QR code or 8-character code. Each member marks streamings and genres; the creator sets type and runtime; the server proposes 3–5 finalists ranked by the least satisfied member's taste; members vote by approval; everyone sees the winner. Phones poll the room state every 2.5 s.

New: routes `/sala` and `/sala/[code]`; server actions `createRoom`, `joinRoom`, `updatePreferences`, `startRoom`, `vote`, `closeVoting`, `nextRound`, `leaveRoom`, `roomState`; tables `group_rooms`, `group_room_members`, `group_room_finalists`, `group_room_votes`; a member cookie.

## Assets

| Asset                     | Why it matters                                                                    |
| ------------------------- | --------------------------------------------------------------------------------- |
| Room membership           | Only people who were given the code may see or act in the room                    |
| Vote integrity            | One member, one ballot per round; nobody can vote for someone else                |
| Members' data             | Preferences, "Já vi" and taste lists are personal; kept only while the room lives |
| Free tiers (Neon compute) | Polling keeps the database awake; Neon free compute hours are limited             |
| Catalog suitability       | Finalists obey every hard rule (18+, blocked, floor)                              |

## Entry points and trust boundaries

1. Browser → room actions: **untrusted** code, preferences, taste lists, votes, phase commands.
2. Member cookie → server: **untrusted** until its hash matches a live member row.
3. QR code / shared code → third parties: the code leaves the room's control as soon as it is shown.
4. Server → browser: room state (phase, counts, finalists, result), the only data other members can see.

## Threats

### A. Spoofing

| #   | Threat                                                         | L / I | Mitigation                                                                                                                                                                                                                     |
| --- | -------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A1  | Guessing codes to join strangers' rooms                        | M / M | AC: 8 chars from 31 symbols (~40 bits) from `crypto.getRandomValues`; join attempts limited per IP with the existing token bucket (`kinne_take_tokens`), e.g. 10 per 10 min; one generic error for all failures (US011 RNE003) |
| A2  | Forging or stealing a member cookie to act as someone else     | L / H | AC: 32 random bytes, stored only as SHA-256 hash; cookie `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/sala`, expiry = room expiry; every action resolves member by cookie hash, never by an id in the body                     |
| A3  | Acting as the creator (start, close, next round) without being | M / M | AC: creator-only actions check `member.is_creator` from the cookie lookup; a test calls each one with a non-creator cookie and expects refusal                                                                                 |
| A4  | Joining a room that already started or is full                 | M / L | AC: join is rejected after start and at 8 members, with the generic error (RNE003)                                                                                                                                             |

### B. Tampering

| #   | Threat                                                           | L / I | Mitigation                                                                                                                                                             |
| --- | ---------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Voting several times or for titles that are not finalists        | M / M | AC: unique `(round_id, member_id, catalog_title_id)`; a vote for a title not among the round's finalists is rejected; a second "Votar" replaces the ballot, never adds |
| B2  | Forged preferences pulling unsuitable titles in                  | M / M | AC: strict zod on preferences; finalists computed only from recommendable, floor-passing, non-18 titles (RNE005); preferences can only narrow the pool                 |
| B3  | Forged taste lists skewing the group                             | M / L | Same bounds as `feelings-and-taste-ui.md` A3; a member can only shift their own percentile, and the group uses the minimum, so forging cannot force a title through    |
| B4  | Replaying old state transitions (start twice, vote after result) | M / L | AC: every write checks the room phase in the same transaction (`select … for update`); actions in the wrong phase are refused                                          |

### C. Information disclosure

| #   | Threat                                                     | L / I | Mitigation                                                                                                                                               |
| --- | ---------------------------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Code leaking through the URL (history, referrer, logs)     | M / M | AC: code only in the path of the QR target, replaced by `/sala` right after join (RNE002); `Referrer-Policy: no-referrer` on `/sala*`; code never logged |
| C2  | Members' taste, "Já vi" and preferences outliving the room | M / M | AC: rows deleted on expiry (lazy on read plus a cleanup step in the daily job); no copy in events; retention noted in the privacy text                   |
| C3  | Free-text names used for abuse or XSS                      | M / M | By design there are no names in this version (RNE004); members are "Pessoa N"                                                                            |
| C4  | Seeing who voted for what                                  | M / L | AC: `roomState` returns only counts and, after the result, totals per finalist; never member→vote                                                        |
| C5  | Inferring a member's taste from the finalists              | L / L | Accepted: finalists come from everyone combined; with two people some inference is possible, as when choosing together in person                         |

### D. Denial of service / cost

| #   | Threat                                                    | L / I | Mitigation                                                                                                                                                            |
| --- | --------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Room creation spam                                        | M / M | AC: 3 rooms per browser id per hour and a per-IP token bucket; rooms expire (US011 C10, RNE008)                                                                       |
| D2  | Polling keeping Neon awake and burning free compute hours | H / M | AC: poll only while the tab is visible, stop at result/expiry, back off to 10 s in the lobby after 2 minutes idle; `roomState` is one indexed read. Measure in the PR |
| D3  | Finalist computation per round being slow                 | L / L | One spread per member (≤ 8) on the cached graph: ~8 ms each                                                                                                           |

### E. Repudiation

| #   | Threat                          | L / I | Mitigation                                                               |
| --- | ------------------------------- | ----- | ------------------------------------------------------------------------ |
| E1  | No trace when a room misbehaves | L / L | Server logs carry room id and phase changes only, no member data or code |

## Accepted risks

- Anyone who sees the code or the QR during the lobby can join until the creator starts (like a physical invitation). Mitigated by the 8-member cap and starting closing the room.
- Room state is anonymous; a member can leave and rejoin as a new "Pessoa N" before the start.
