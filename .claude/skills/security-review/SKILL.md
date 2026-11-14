---
name: security-review
description: Security checklist for reviewing a diff, based on the OWASP Top 10 and common web app flaws. Use when reviewing code before a commit or PR.
---

# Security review

Check the diff against each item. Report only what you can show with a concrete scenario.

## Access control

- Every server action, API route and page that reads private data checks who the user is
  and whether they may access that specific resource (no IDOR).
- Authorization happens on the server, never only in the UI.

## Input and injection

- All input validated with a strict schema (unknown keys rejected) at the boundary.
- No string-built SQL, shell commands or HTML. No `dangerouslySetInnerHTML` or equivalent.
- Redirect targets and URLs from input are checked against an allowlist (open redirect).

## Secrets and data exposure

- No secrets in client bundles (e.g. `NEXT_PUBLIC_` on a secret, secret module without
  `server-only`). No secrets in logs, errors or commits.
- Errors shown to users are generic. Responses do not leak fields the client does not need.
- Sensitive data does not go in URLs (query params end up in logs and history).

## Sessions and auth

- Cookies: `HttpOnly`, `Secure`, `SameSite`. Tokens expire and are single-use when they should be.
- Rate limiting on login, codes, and any expensive or abusable endpoint.

## Dependencies and CI

- New dependencies: maintained, no known critical CVEs, justified.
- Workflows: least-privilege `permissions`, no untrusted input interpolated into `run:`.

## Project rules

- Every non-negotiable rule in `docs/security.md` and `CLAUDE.md`. Cite the section when it is
  broken: §4 secrets, §5 input validation, §6 output, errors and logging, §7 rate limiting,
  §8 URLs (no query params), §9 browser storage, §10 headers and CSP, §11 supply chain and CI,
  §12 data and privacy, §13 authentication.
- Database changes keep the role model of §4 (`kinne_app` without direct table access to
  account data, SECURITY DEFINER functions with a fixed `search_path`).
- The feature's threat analysis in `docs/threats/`: every mitigation marked as an acceptance
  criterion has code and a test.
- An exception is valid only if it is recorded in §17 "Accepted risks".
