# Branch rulesets

`develop` and `main` are protected by two repository rulesets, `protect-develop` (id `25820492`) and `protect-main` (id `24885588`). Changing them needs the owner's account.

## Current state (2026-11-05, F1 PR #99)

Both rulesets have the same rules:

- PR required (0 approvals for now; the review bot changes this in F1 item 9), no force push, no deletion, no bypass actors.
- Required checks, with "branches must be up to date before merging" (`strict`):
  - GitHub Actions (`integration_id` 15368): `format`, `lint`, `typecheck`, `test`, `build`, `bundle`, `arch`, `generated-docs`, `security-headers`, `visual`, `accounts-db` (`ci.yml`), and `gitleaks`, `semgrep`, `npm-audit`, `codeql` (`security.yml`).
  - Code scanning (`integration_id` 57789): `CodeQL`.
- Not required: `npm-audit-dev` (never fails; findings go to the run summary), `lighthouse` (runs on the Vercel preview, not on the PR), the timing checks (nightly, `timing-checks.yml`).

Every required check comes from a workflow with no path or event filter, triggered on `pull_request` into `main` and `develop`. A check that does not run on some PR would block that PR forever, so a new required check must keep that property.

To see the live state:

```sh
gh api repos/leonardocnl/kinne/rulesets/25820492   # protect-develop
gh api repos/leonardocnl/kinne/rulesets/24885588   # protect-main
```

## Rolling back

`rulesets/*.before.json` are the rulesets as they were before PR #99, read with `gh api` on 2026-11-05. They required the old single `checks` job, so a rollback makes sense only together with reverting `ci.yml` to that job. The rollback sends only the writable fields (a `PUT` replaces the whole ruleset):

```sh
for pair in 25820492:protect-develop 24885588:protect-main; do
    id=${pair%%:*}
    name=${pair#*:}
    jq '{name, target, enforcement, conditions, bypass_actors, rules}' \
        "docs/operations/rulesets/$name.before.json" |
        gh api -X PUT "repos/leonardocnl/kinne/rulesets/$id" --input -
done
```
