# 0009: Review and automatic merge

## Context

One person owns Kinne and AI agents write most of its code. Reviewing every pull request by hand does not scale, and merging without review is not acceptable. Some changes can break security, data or the look of the product in ways the automated checks do not see. Others, such as documentation and tests, are cheap to revert.

## Decision

**Review.** Every pull request is reviewed by a reviewer agent that did not write the code. It runs as the project's own GitHub App and reviews against the `kinne-standards` skill, `DESIGN.md`, the security rules and the over-engineering review. Its review blocks the merge. The owner can override it.

**Risk is decided by the changed paths, mechanically.** The agent's judgment never lowers the risk of a pull request.

| Risk   | What it covers                                                                                                                                                                       | Who merges                                                 |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| High   | accounts; security (CSP, headers, rate limits, `server-only`, server actions); database schema and migrations; configuration and environment; CI; dependencies; the rules themselves | only the owner                                             |
| Visual | anything a person sees: components, styles, assets, `DESIGN.md`                                                                                                                      | only the owner                                             |
| Low    | documentation, tests, and changes to pure logic outside the areas above                                                                                                              | the robot, if every check is green and the review approved |

- **The rules fail closed.** A pull request is low risk only when every changed file matches the list of low-risk paths and none matches a high or visual path. A path no rule knows is high risk. A renamed file counts under both its old and its new path.
- **The path list has one source:** the rule file read by the classifier. Other documents describe the categories and link to it; they do not copy the list.
- **"The rules themselves"** includes `CLAUDE.md`, `.claude/`, the boundary and lint configuration, the git hooks, the classifier and its rules, the ADRs, the security rules and the requirements.
- **Automatic merge happens only into `develop`**, never into `main`, and only for low risk.
- **The robot only approves and merges.** It never writes commits.
- Each automatic merge produces a summary. Any of them can be reverted.

## Alternatives

- **The owner merges everything.** Rejected: the owner becomes the bottleneck for changes that carry little risk.
- **The agent decides the risk.** Rejected: a judgment can be talked into the wrong answer by the content of the pull request it is reading. A path list cannot.
- **A list of risky paths, with everything else low.** Rejected: a new folder would be low risk by omission. The list of low-risk paths is the one that is closed.
- **Visual risk decided by changed screenshots.** This was the plan of 2026-11-01. Changed on 2026-11-14 with [ADR 0008](0008-design-system-code-as-source.md): screenshots are being retired, so visual risk is decided by paths.
- **Automatic merge into `main`.** Rejected: production is released by the owner, following the release checklist.

## Consequences

- The classifier and its rules are security code. A pull request that changes them is high risk, and the classification of a pull request always runs the version on the base branch, never the version the pull request brings.
- The wide visual and high classes mean the robot merges little at first. Paths move to low risk only by a change to the rule file, which the owner merges.
- Path rules follow the folder layout, so they are reviewed when F2 moves the code to `src/modules`.
- Creating the GitHub App needs the owner's account. The steps are in `docs/guides/review-bot.md`, added with the workflows.

## Status

Accepted, 2026-11-01. Amended 2026-11-14 (visual risk by paths; fail-closed list). The classifier, the workflows and the guide arrive with F1 item 9; until the App exists, the owner merges everything.
