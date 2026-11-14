# Review bot: setup guide

Step by step for the owner. Nothing in this guide has been done yet: the workflow
(`.github/workflows/review-bot.yml`) does nothing useful until the GitHub App, the Environment and the
ruleset change below exist. Until the repository variable `REVIEW_APP_CLIENT_ID` is set (section 3),
the `disarm` and `review` jobs are skipped and the `risk` job only labels pull requests.

Do the steps in this order. In particular, change the ruleset (section 5) before you allow
auto-merge (section 4 is listed first only because it is short): the ruleset is what guarantees
that a push after an approval cannot be merged without a new review.

## What is already in place (in the repository)

- `scripts/review/risk-rules.mjs`: the path and content rules that decide the risk class.
- `scripts/review/classify.mjs`: the classifier (tests in `classify.test.ts`).
- `scripts/review/verdict.mjs`: validates the reviewer's verdict file and builds the review (tests in
  `verdict.test.ts`).
- `.github/review/reviewer-prompt.md`: the reviewer's instructions.
- `.github/workflows/review-bot.yml`: the workflow.

## 1. What the robot does and does not do

The rules are in [ADR 0009](../architecture/adr/0009-review-and-auto-merge.md) (it arrives in another
pull request).

It does:

- Label every pull request `risk: high`, `risk: visual` or `risk: low`. The class is decided by code,
  from the changed paths and changed lines. The label is only for people to read.
- Review pull requests from this repository with Claude, and post the review as your GitHub App:
  approve or request changes, pinned to the commit it read.
- For a low risk pull request from you into `develop`, when the review approves it, arm auto-merge.
  GitHub then merges (merge commit) when every required check is green.

It does not:

- Write commits, push, or touch branches.
- Merge into `main`, ever.
- Review or merge pull requests from forks, or from Dependabot. Forks are classified only.
- Let the model decide risk, post, approve or merge. The model writes one JSON file; code validates it.
- Merge anything high or visual risk. Only you do.

Every new push to a pull request disarms auto-merge first, before anything else.

## 2. Create the GitHub App

1. Open GitHub, click your avatar, **Settings**, then at the bottom of the left menu **Developer
   settings**, **GitHub Apps**, **New GitHub App**.
2. Fill in:
   - **GitHub App name**: `kinne-review-bot` (the name must be unique on GitHub; add a suffix if it is
     taken).
   - **Description**: `Reviews pull requests of leonardocnl/kinne and arms auto-merge for low risk ones.`
   - **Homepage URL**: `https://github.com/leonardocnl/kinne`.
   - **Identifying and authorizing users**: leave the callback URL empty; leave "Expire user
     authorization tokens" as it is; leave the other checkboxes in that section off.
   - **Post installation**: leave "Setup URL" empty, "Redirect on update" off.
   - **Webhook**: uncheck **Active**. The workflow does not need webhooks.
3. **Repository permissions**, and nothing else (leave Organization and Account permissions at "No
   access"):
   - **Pull requests**: Read and write. To post the review, post the merge summary comment, and
     enable or disable auto-merge.
   - **Contents**: Read and write. The GitHub REST page for the merge endpoint ("Merge a pull
     request") lists Contents: write as its required permission, and arming auto-merge ends in a
     merge.
   - **Metadata**: Read-only appears by itself and cannot be removed.
4. **Subscribe to events**: none.
5. **Where can this GitHub App be installed?**: **Only on this account**.
6. Click **Create GitHub App**.
7. On the App page, copy the **Client ID** (it looks like `Iv…`). You need it in step 3. (The App ID
   number also exists, but the pinned `actions/create-github-app-token` v3.3.0 marks its `app-id` input
   as deprecated in favor of `client-id`.)
8. Scroll to **Private keys** and click **Generate a private key**. A `.pem` file downloads. Step 3
   says where it goes.
9. In the left menu click **Install App**, then **Install** next to your account. Choose **Only select
   repositories**, pick `leonardocnl/kinne`, and click **Install**.

What I verified and what I did not: the permission tables of GitHub's REST documentation list
Contents: write for "Merge a pull request" and Pull requests: write for "Create a review for a pull
request" and for the labels and comments endpoints. I did not find, and could not test, the permission
list for the GraphQL mutation that arms auto-merge (`gh pr merge --auto`). The two permissions above
are what GitHub's own tooling asks for. The first test (section 6) proves it: if arming fails with
"Resource not accessible by integration", read the message, add the missing permission on the App
page, and accept the new permission request under **Install App**.

## 3. Store the credentials

The workflow reads them through the Environment `review-bot`. Names only here; never paste values in a
file, an issue or a chat.

1. In the repository: **Settings**, **Environments**, **New environment**, name `review-bot`.
2. Under **Deployment branches and tags** choose **Selected branches and tags**, then **Add deployment
   branch or tag rule** twice: `develop` and `main`. Why: with `pull_request_target` the job runs on the
   base branch, so the secrets are reachable only from protected branches. A pull request cannot widen
   this, and a branch that nobody protects cannot read them.
3. Leave "Required reviewers" off (the robot must run unattended) and "Prevent self-review" as you
   like.
4. The Client ID is not a secret and is a **repository** variable, because the workflow uses it to
   decide whether the robot is switched on: **Settings**, **Secrets and variables**, **Actions**,
   **Variables**, **New repository variable**, name `REVIEW_APP_CLIENT_ID`, value the Client ID from
   step 2.7. Set it last, after the secrets below: setting it switches the robot on.
5. Under **Environment secrets** click **Add secret**:
   - `REVIEW_APP_PRIVATE_KEY`: paste the whole content of the `.pem` file, including the `BEGIN` and
     `END` lines.
   - `CLAUDE_CODE_OAUTH_TOKEN`: on your own machine run `claude setup-token`, complete the browser
     sign-in, and copy the token it prints. (This is the command the pinned claude-code-action's setup
     documentation gives for Pro and Max plans. Check `claude setup-token --help` if your Claude Code
     version prints something different.)
6. Optional: the repository variable (Settings, Secrets and variables, Actions, Variables)
   `REVIEW_MODEL` changes the reviewer model. Without it the workflow uses the alias `sonnet`.
7. The `.pem` file: put it in your password manager now, then delete the downloaded file. Delete the
   terminal history or clipboard entry of the Claude token too. GitHub never shows a secret again; if
   you lose one, generate a new one.

## 4. Repository settings

**Settings**, **General**, **Pull Requests**:

- Check **Allow merge commits** (already on today; the robot merges with a merge commit).
- Check **Allow auto-merge** (off today).

## 5. Rulesets

Today `protect-develop` (id `25820492`) requires a pull request with 0 approvals and has no bypass
actors. For the reviewer's approval to mean something it must be required, and you must be able to
override it. The change to `protect-develop`:

| Field in the `pull_request` rule  | Now     | New    |
| --------------------------------- | ------- | ------ |
| `required_approving_review_count` | `0`     | `1`    |
| `dismiss_stale_reviews_on_push`   | `false` | `true` |
| `require_last_push_approval`      | `false` | `true` |

Plus one bypass actor: your repository admin role, `{"actor_id": 5, "actor_type": "RepositoryRole",
"bypass_mode": "pull_request"}` (5 is the admin role, as in GitHub's own ruleset files; `pull_request`
means you bypass only through a pull request, not by pushing).

These commands are **not run by the agent that wrote this guide**. Review them first. A `PUT` replaces
the whole ruleset, so the file you send must be the current one with only these changes.

```sh
# 1. Read the current ruleset and keep a copy
gh api repos/leonardocnl/kinne/rulesets/25820492 > /tmp/protect-develop.current.json

# 2. Make the new version: only the writable fields, with the changes above
jq '{name, target, enforcement, conditions, rules, bypass_actors}
    | .rules |= map(
        if .type == "pull_request" then
            .parameters.required_approving_review_count = 1
            | .parameters.dismiss_stale_reviews_on_push = true
            | .parameters.require_last_push_approval = true
        else . end)
    | .bypass_actors = [{"actor_id": 5, "actor_type": "RepositoryRole", "bypass_mode": "pull_request"}]' \
    /tmp/protect-develop.current.json > /tmp/protect-develop.new.json

# 3. Read the difference. Only the lines above should differ.
diff <(jq -S . /tmp/protect-develop.current.json) <(jq -S . /tmp/protect-develop.new.json)

# 4. Apply
gh api -X PUT repos/leonardocnl/kinne/rulesets/25820492 --input /tmp/protect-develop.new.json
```

Then update `docs/operations/branch-rulesets.md` in a pull request to record the new state.

`protect-main`: leave it as it is. The robot never merges into `main`; you merge the release pull
request yourself. The workflow still reviews pull requests into `main` (the review is advice there),
but no approval is required, so a failed or skipped review cannot block a release. If you want the
same rule on `main`, apply the same `jq` to `24885588`, and know that your admin bypass is then what
lets you release.

**What I could not verify:** whether the approval of a GitHub App counts toward
`required_approving_review_count`. GitHub's documentation I could read says reviews from people with
write access count; it does not say clearly that an App's review does. Test it before relying on it:

1. Apply the ruleset change.
2. Open a throwaway docs-only pull request into `develop` (section 6, first test).
3. When the robot has approved, look at the merge box. If it says "1 approving review" (or the
   "Review required" notice is gone), App approvals count, and auto-merge will work.
4. If the review shows as approved but the box still says a review is required, they do not count.
   Then the robot cannot unblock a merge on its own: either you approve (the flow still saves you the
   review work), or the reviewer must be a machine user account with write access instead of an App,
   which is a different setup and a change to the workflow.

## 6. First test

Do these in order, on throwaway branches from `develop`, and delete them afterwards.

1. **Docs-only pull request.** Change one line in `docs/baseline.md`, push, open a pull request into
   `develop`. Expected: the label `risk: low` appears; the `review` job runs; the App posts a review
   (approve); a comment says auto-merge was armed; when the required checks are green GitHub merges
   it with a merge commit.
2. **`package.json`.** Change nothing meaningful (for example add a blank line inside the file), push,
   open a pull request into `develop`. Expected: `risk: high`; the `review` job runs and posts a review;
   no comment about auto-merge; the merge button waits for you. Close the pull request.
3. **Push to an armed pull request.** Open a docs-only pull request, and while its checks are still
   running (before it merges) push another commit to the branch. Expected: the `Disarm auto-merge` step
   runs first; the earlier approval is dismissed (the ruleset's "dismiss stale approvals"); a new
   review comes for the new commit, and auto-merge is armed again only if it approves.

If a run fails, open the run page: the first red step names the problem. The most likely first-run
errors are a wrong variable or secret name (the `Create the App token` step fails) and a permission
the App lacks (see the note in section 2).

## 7. Turning it off

- Stop it right away: delete the repository variable `REVIEW_APP_CLIENT_ID` (the robot's jobs are
  then skipped and only the label remains), or **Actions**, **Review bot**, **...**, **Disable
  workflow**. Pull requests then
  only need the checks. Auto-merge that is already armed stays armed: disarm it on each pull request
  with `gh pr merge <number> --disable-auto`.
- Remove the App: **Settings**, **GitHub Apps**, **Configure** next to the App, **Uninstall**, then
  delete the secrets from the `review-bot` Environment.
- Revert the ruleset: send the file you saved in section 5, step 1 (only the writable fields) with
  `gh api -X PUT repos/leonardocnl/kinne/rulesets/25820492 --input <file>`.

## 8. Threat notes

- **Prompt injection of the reviewer.** The pull request text, files and diff are untrusted, and the
  prompt says so, but a model can still be fooled. What it can do when fooled is limited by structure:
  the reviewer step has no shell, no network tools and no MCP server, only read tools and one file to
  write; it never receives the App token (the step gets the job's read-only token, because the action
  insists on some token); the verdict is validated by code and a `critical` or `high` finding forces
  "request changes"; the review is pinned to the commit that was read; and the class that allows
  auto-merge comes from the changed paths and lines, not from the model. The worst a fooled reviewer
  can do is approve a pull request that the path rules already call low risk (docs and pure code), and
  a check, the approval and your review of the merge summary remain. The residual risk that remains:
  the model can read the workspace, and the verdict text is posted publicly, so a model made to leak a
  secret would leak it there. The workflow refuses a verdict that contains the Claude token or the
  App token, and never puts the pull request's files on disk (the reviewer gets a diff), but it
  cannot catch an encoded leak.
- **Forks.** A fork pull request is classified (so you see its label) and never reviewed, never
  approved and never merged: the `review` job requires the head repository to be this repository, and
  the App token is created only in that job.
- **A compromised Claude token.** Revoke it in your Claude account (generate a new one with
  `claude setup-token`), and replace `CLAUDE_CODE_OAUTH_TOKEN` in the Environment. It can spend your
  plan's usage; it cannot touch the repository.
- **A compromised App private key.** Whoever has it can post reviews and merge as the App, on this
  repository. Delete the key on the App page (**Private keys**, **Delete**), generate a new one,
  replace `REVIEW_APP_PRIVATE_KEY`, and check the repository's merge history and the App's recent
  activity. If in doubt, uninstall the App (section 7).
- **A pull request that edits the workflow.** `pull_request_target` runs the workflow from the base
  branch, so a pull request that changes `review-bot.yml` is reviewed by the old version. The file is
  under `.github/`, so such a pull request is `risk: high` and only you merge it.
