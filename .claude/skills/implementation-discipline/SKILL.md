---
name: implementation-discipline
description: How to implement a task with minimal, verifiable changes that respect the project's architecture. Use when writing or changing application code.
---

# Implementation discipline

## Before writing

- Find where similar code already lives and copy its patterns (naming, error handling, layering).
- Confirm every function, type, route and env var you plan to use exists. Grep for it.
- If the project has layers, check which layer the change belongs to and that imports only
  point inward.

## While writing

- Smallest change that completes the task. No drive-by refactors; list them as suggestions.
- Validate all external input at the boundary (forms, server actions, API routes, env).
- Handle errors explicitly. User-facing errors are generic; details go to server logs.
- No secrets in client code. No commented-out code. No TODO without an explanation.
- Security beats the minimal-code rule: zod validation, `server-only`, CSP, headers, rate
  limits and session checks are never removed as "slop" or "unneeded code". When in doubt, ask.
- Kinne server actions: strict zod schema (unknown keys rejected) → use case → generic
  user-facing error on failure; nothing goes in the URL; no console output in production.

## Before finishing

- Run the project's checks: `npm run format:check && npm run lint && npm run typecheck &&
npm test && npm run build`, and `npm run arch:check`.
- Re-read your diff as if reviewing someone else's code.
- Report decisions you took and why, and anything you deliberately left out.
