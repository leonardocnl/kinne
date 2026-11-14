---
name: threat-analysis
description: STRIDE threat analysis that must be approved before a Kinne user story is built (docs/security.md §16.1). Used by the architect when planning each story; the docs agent writes the approved result to docs/threats/.
---

# Threat analysis

`docs/security.md` §16.1: a story without an approved threat analysis is not ready to build.
The architect runs this while planning the story; Leonardo approves it; the `docs` agent writes
it to `docs/threats/<feature>.md`.

## Before writing

- Read `docs/security.md`, the story in `docs/requisitos/`, the code the story touches, and the
  existing analyses in `docs/threats/` (copy their structure, e.g. `group-room.md`).
- If an analysis for the feature already exists, extend it with a dated section instead of
  starting a new file.

## Structure (English, like the existing files)

1. Title `# Threat analysis — <feature> (USxxx)` and a status line
   (`Status: proposed <date>`; Leonardo changes it to approved).
2. **Scope:** what the feature does; new routes, server actions, tables, cookies, storage keys.
3. **Assets:** table asset | why it matters.
4. **Entry points and trust boundaries:** every input that crosses from the browser, TMDB or
   another service into the server.
5. **Threats** by STRIDE: Spoofing, Tampering, Repudiation, Information disclosure, Denial of
   service (including cost: Neon hours, TMDB quota, Vercel invocations), Elevation of privilege.
   Each threat: scenario, likelihood, impact, mitigation, and the rule of `docs/security.md`
   it relies on.
6. Mark each mitigation that must become an acceptance criterion with **AC**; list them so the
   story's "Segurança" section can cite them.
7. **Accepted risks:** only with a reason; they also go to `docs/security.md` §17 once approved.

## Rules

- Only threats you can tie to a concrete entry point of this feature. No generic padding.
- Never weaken an existing rule of `docs/security.md` to make the feature easier.
- Likelihood, impact and accepted risks are Leonardo's call: propose, label assumptions, ask.
