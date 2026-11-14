---
name: commit-and-pr
description: Conventional Commits, branch naming and PR description rules, with Leonardo as sole author. Use when committing, branching or opening a PR.
---

# Commits and PRs

## Commit message

- Format: `type(scope): summary` in the imperative, lowercase, no period, up to ~72 chars.
- Types: feat, fix, refactor, test, docs, style, chore, ci, perf, build.
- Scope: the area touched (e.g. `home`, `auth`, `db`).
- If the project has requirement IDs, cite them: `feat(home): rotate daily picks (US001 C2)`.
- Body (optional): why the change was made, wrapped at 72 chars.

## Authorship (hard rule)

- Leonardo is the only author. NEVER add `Co-Authored-By`, `Generated with Claude Code`,
  emojis tied to Claude, or any AI attribution, in commits or PRs.

## Branches

- One short-lived branch per task, kebab-case: `feat/…`, `fix/…`, `refactor/…`, `docs/…`,
  `chore/…`, `ci/…`, `test/…`.
- Branch off an up-to-date `develop` (`git fetch` first) and open the PR into `develop`.

## Hooks

- Never use `--no-verify` or otherwise skip the git hooks. If a hook fails, fix the cause.

## Pull request

- Title: same format as a commit.
- Body: what changed, why, how to test locally, requirement IDs covered, and
  `.github/pull_request_template.md` filled in, every security checklist item answered
  ("none" where nothing applies).
