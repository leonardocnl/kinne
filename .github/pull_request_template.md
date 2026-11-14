## Summary

<!-- What changes and why. Cite the story/criteria, e.g. US001 C2. -->

## Classification

Fill all three. A PR with an empty field is not ready for review.

- **Module(s) affected** (`catalog`, `taste`, `discovery`, `room`, `accounts`, `analytics`, `shared`, or "none" for docs, CI and tooling; while the code is still in layers, name the module the code will belong to):
- **Risk** (`high`, `visual` or `low`, decided by the changed paths, see [ADR 0009](../docs/architecture/adr/0009-review-and-auto-merge.md); the classifier's label wins if they differ):
- **Documentation updated** (required: list the module READMEs, ADRs, guides or `DESIGN.md` changed, or write "not needed" and say why):

## Security checklist

See [docs/security.md](../docs/security.md). Fill every item; write "none" where nothing applies. An empty checklist blocks review.

- **OWASP 2025 categories touched** (A01–A10, with the rule that covers each):
- **New inputs and their zod schemas** (server actions, route handlers, storage reads):
- **New secrets** (name, where stored, server-only confirmed, no `NEXT_PUBLIC_`):
- **New dependencies** (name, why, audit result):
- **Accepted risks** (also add them to "Accepted risks" in docs/security.md):

## Checks

- [ ] No query params in URLs, no `dangerouslySetInnerHTML`, no console output in production
- [ ] User-facing errors are generic
- [ ] `format:check`, `lint`, `typecheck`, `test`, `build` pass
- [ ] Documentation of what this PR touched is updated, or the "Documentation updated" field says why it is not needed
