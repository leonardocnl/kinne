# Release checklist — guest mode to production

For the owner, in order. Every command is copy-paste ready; replace only the `<...>` placeholders. Secrets go straight from a password manager into the dashboard, or into the terminal through `read -rs` (no echo, no shell history): never typed inline in a command, never into a file, a chat or a PR. `unset` them when the step is done.

**Dates.** Release cut-off **22/10/2026**: everything for the test is merged into `develop` and promoted to `main` by then.

## 1. Merge and verify `develop`

1. Merge the open PRs into `develop` in this order: #21 (layout), #22 (credits), #23 (person search), #24 (rounds), then this PR (release prep). Each one's CI must be green; `npm-audit-dev` only writes a summary.
2. On the Vercel Preview of `develop` (Preview env vars point at the Neon **develop** branch, title-search I1):
   - run the full flow on Chrome, Safari (iPhone) and Firefox: home, filters with a person and the 18+ chip, rounds to the end, surprise, search, title page;
   - check the Lighthouse workflow result on that deployment (Actions → Lighthouse), or run it by hand: Actions → Lighthouse → Run workflow → the preview URL.

## 2. Security checks on the preview

1. ZAP baseline (passive scan) against the preview URL:

   ```sh
   docker run --rm -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t https://<preview-host>.vercel.app -I
   ```

   Read every WARN/FAIL. The §10 headers are implemented. Expect ZAP to flag `script-src`/`style-src` `'unsafe-inline'` (CSP: script-src unsafe-inline, style-src unsafe-inline), which is the accepted risk in security.md §17; anything else on headers is a regression. Before release, check the HSTS `preload` decision (security.md §10) and curl the production home: `curl -sI https://<production domain>/ | grep -iE 'content-security|strict-transport|x-content|referrer|permissions|cross-origin'`.

2. Your manual OWASP ASVS level 1 pass (security.md §14), with the threat models in `docs/threats/` as the list of what each feature promises.

## 3. Production database (Neon, production branch, owner role)

Use the **owner's direct connection to the production branch**, from your password manager. Run these SQL steps with `psql` (not the Neon SQL Editor, which keeps a query history). Check the target first:

```sql
select key, value from meta;
select id, created_at from drizzle.__drizzle_migrations order by id;
```

1. Apply migrations 0002 onward (0002 full catalog, 0003 `kinne_sync`, 0004 revoke delete, 0005 search tables, 0006 search functions and `kinne_app`, 0007 limiter `SECURITY DEFINER`, 0008 person-name index). From a clean checkout of `main`:

   ```sh
   npm ci
   # drizzle.config.ts loads .env.local; create an empty one only if there is none
   [ -e .env.local ] || { touch .env.local; CREATED_ENV=1; }
   read -rs DATABASE_URL && export DATABASE_URL   # paste the owner direct production URL
   npx drizzle-kit migrate   # an exported variable wins over .env.local
   unset DATABASE_URL
   [ -n "$CREATED_ENV" ] && rm .env.local; unset CREATED_ENV
   ```

2. Mark the branch as production (the sync refuses to run on a branch whose `meta.environment` differs from its target, catalog-sync C3):

   ```sql
   insert into meta (key, value) values ('environment', 'production')
   on conflict (key) do update set value = excluded.value;
   ```

3. Give both roles a login password. Generate each with `openssl rand -base64 32` and keep them only in your password manager. In `psql`, `\password` asks for the password without echo and sends only a SCRAM hash, so it stays out of the history and the server logs:

   ```sql
   alter role kinne_sync with login;
   alter role kinne_app with login;
   \password kinne_sync
   \password kinne_app
   ```

4. Check the grants landed, and that what the threat models promise is absent really is (all of the second query must be `false`):

   ```sql
   select r, t, has_table_privilege(r, t, 'SELECT') as can_select
   from unnest(array['kinne_app', 'kinne_sync']) r,
        unnest(array['catalog_titles', 'people', 'title_credits', 'daily_picks']) t;

   select
     has_table_privilege('kinne_app', 'anonymous_usage_events', 'DELETE') as app_deletes_events,
     has_table_privilege('kinne_app', 'catalog_titles', 'UPDATE') as app_updates_catalog,
     has_table_privilege('kinne_app', 'rate_limit_buckets', 'SELECT') as app_reads_limiter,
     has_table_privilege('kinne_sync', 'anonymous_usage_events', 'DELETE') as sync_deletes_events,
     has_table_privilege('kinne_sync', 'people', 'DELETE') as sync_deletes_people;
   ```

5. Neon compute fixed at 0.25 CU minimum and maximum (RNF06).

### Automatic migrations on develop (`migrate-develop.yml`)

The **develop** database is migrated by `.github/workflows/migrate-develop.yml`; production is still migrated by hand (step 3.1).

- Triggers: `push` to `develop` and `workflow_dispatch` (never `pull_request`). The job runs only when the ref is `develop`, in the GitHub environment `develop`, with `permissions: contents: read` and a fixed `concurrency` group (`cancel-in-progress: false`, so a migration is never cut in half).
- Order: `npm run db:migrate:guard` reads `meta.environment` **before any migration SQL** and exits 1 with a generic message if it is not exactly `develop` (absent, empty or `production` all refuse); then `npm run db:migrate` (`drizzle-kit migrate`); then `npm run db:migrate:verify` counts the rows in `drizzle.__drizzle_migrations` and fails if the database has fewer than the repository's `drizzle/meta/_journal.json`.
- No step prints the database URL; the secret is masked by GitHub and the scripts print only counts and generic messages.
- Secret: `MIGRATE_DATABASE_URL`, an **environment secret of `develop`** (Settings → Environments → develop), not a repository secret. Value: Neon **direct** (not pooled) URL of the develop branch as the owner role. Restrict the environment to the `develop` branch (Deployment branches) so no other branch can read it.
- **There is no production version yet**: the production database is still on migration 0001 and its rise (step 3) is planned and done by hand with the owner's eyes on every migration. Automating it would apply 0002–0010 to production unattended. A production workflow (environment `production`, `meta.environment = 'production'`, trigger on `main`) is a separate decision after launch; the guard in `src/application/migration-guard.ts` would then take the target as a parameter.

## 4. GitHub Actions secrets (repository settings → Secrets and variables → Actions)

| Secret              | Value                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------- |
| `TMDB_TOKEN`        | Already set; keep                                                                        |
| `SYNC_DATABASE_URL` | Direct (not pooled) production URL **as `kinne_sync`** with password 1                   |
| `REVALIDATE_ORIGIN` | `https://<production domain>` (no path, no trailing slash)                               |
| `REVALIDATE_SECRET` | New value: `openssl rand -hex 32`; the **same** value goes to Vercel Production (step 5) |

## 5. Vercel Production environment variables

| Variable                                                    | Value                                                                                  |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `DATABASE_URL_POOLED`                                       | Pooled production URL **as `kinne_app`** with password 2 (never the owner role)        |
| `RATE_LIMIT_SECRET`                                         | New value, 32+ random characters (`openssl rand -base64 48`); not the preview's value  |
| `SEARCH_TMDB_FALLBACK`                                      | `on` for the test (`off` turns the TMDB fallback off with a redeploy, title-search I2) |
| `TMDB_TOKEN`                                                | The TMDB token (used only by the search fallback)                                      |
| `REVALIDATE_SECRET`                                         | Same value as the GitHub secret                                                        |
| `TEAM_SECRET_PATH`                                          | Long random path (US006); not sent to participants                                     |
| `SEARCH_CATALOG_PER_MINUTE` and the other `SEARCH_*` limits | Leave empty for the defaults (600, 60, 30, 2000) unless the test shows a need          |

Preview keeps the **develop** branch values: no production credential in Preview (security §4).

## 6. Promote `develop` to `main`

Open the PR `develop` → `main`, wait for CI, merge. Vercel deploys Production from `main`.

`.github/workflows/sync-catalog.yml` is already in its production form (`ref: main`, `SYNC_TARGET: production`, `secrets.SYNC_DATABASE_URL` in the three steps that use a database, and the `REVALIDATE_ORIGIN` / `REVALIDATE_SECRET` env lines); the temporary rows in security §17 and in catalog-sync trust boundary 4 are gone. The develop database is refreshed by hand with `.github/workflows/sync-develop.yml` (Actions → **Sync catalog (develop)** → Run workflow), which has no schedule.

**Order matters.** The repository's default branch is `develop`, and scheduled workflows run the file on the default branch, but the job checks out `main`. Until `main` carries the new code (`SYNC_TARGET`, `graph:build`, the account tables), a scheduled run fails early on the old code. So: finish steps 3–5 first, merge the sync PR into `develop`, then promote to `main` right away, before the next 06:17 UTC run. If that is not possible, Actions → Sync catalog → ⋯ → **Disable workflow** until `main` is promoted, then enable it again. Do this before the first production sync (§7).

## 7. First production sync

1. Actions → **Sync catalog** → Run workflow, **Use workflow from: `main`**, and tick **Carga completa** (`full`, which sets `SYNC_FULL=1`). The first load reads about 22k titles; the job allows 150 minutes (the full load takes about an hour). Later runs leave `full` unticked (daily, incremental). Never start it before the promotion (§6) and the production migrations (§3). A run aborts, with no write, if the database's `meta.environment` is not `production`.
2. Check the run summary (counts only), then the database:

   ```sql
   select id, target, status, started_at, finished_at, fetched_count, total_count,
          recommendable_count, rejected_count, abort_reason
   from sync_runs order by id desc limit 1;

   select count(*) as total, count(*) filter (where is_recommendable) as recommendable
   from catalog_titles;

   select pick_date, count(*) from daily_picks
   where pick_date >= (now() at time zone 'America/Sao_Paulo')::date
   group by 1 order by 1;
   ```

   Expect `status` = `ok` (other values: `aborted`, `failed`, `skipped`), `target` = production, about 22k titles with about 8.6k recommendable (develop had 21,968 and 8,599 on 12/10), and 5 picks for today and tomorrow.

3. Open the production home and a title page; both must show data.

## 8. End-to-end revalidation

The sync calls `/api/revalidate` at the end of every run. Check the route by hand (every failure answers the same empty 404):

```sh
read -rs REVALIDATE_SECRET && export REVALIDATE_SECRET   # paste the secret
# no secret: 404
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://<production domain>/api/revalidate
# wrong method: 404
curl -s -o /dev/null -w '%{http_code}\n' https://<production domain>/api/revalidate
# right secret, valid body: 204
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://<production domain>/api/revalidate \
  -H 'content-type: application/json' -H "x-revalidate-secret: $REVALIDATE_SECRET" \
  -d '{"tags":["catalog:lists"]}'
unset REVALIDATE_SECRET
```

Then reload the home: it must still render (the lists were rebuilt). The third call spends one of the route's 30 tokens per minute, which is harmless. The sync summary of step 7 also reports how many revalidation requests succeeded.

## 9. Before the test starts (by 25/10)

- Mark every team browser and device through `https://<production domain>/<TEAM_SECRET_PATH>` (US006).
- Delete trial events from production if any (RNF10 script, dry run first). It needs the owner role: no other role has `DELETE` on the events table.

  ```sh
  read -rs DATABASE_URL_POOLED && export DATABASE_URL_POOLED   # owner production pooled URL
  npm run events:delete -- --from 2026-10-01 --to 2026-10-25
  npm run events:delete -- --from 2026-10-01 --to 2026-10-25 --confirm
  unset DATABASE_URL_POOLED
  ```

- `npm run smoke:title -- https://<production domain>`.
- After the test: delete the test events by 15/11/2026 (RNF10) with the same script, `--from 2026-10-26 --to 2026-11-01`.

## 10. Rollback

- **App:** Vercel → Deployments → the last good Production deployment → Instant Rollback (or Promote). The schema changes in 0002–0008 are additive, so the previous build runs on the current database.
- **Search misbehaving (TMDB or its budget):** set `SEARCH_TMDB_FALLBACK=off` and redeploy the same build (title-search I2).
- **Sync misbehaving:** Actions → Sync catalog → ⋯ → Disable workflow. The site keeps serving the last good catalog from its cache and database. The safety valve already aborts a run that would remove more than 5% of active titles (catalog-sync B1).
- **Suspected secret leak:** rotate first, investigate after (security §4): new `kinne_app` / `kinne_sync` password (`\password <role>` in `psql`), update Vercel or GitHub, redeploy; new `REVALIDATE_SECRET` in both places; new `RATE_LIMIT_SECRET` in Vercel.

## 11. After the merge into `main`

Final steps, in this order. Do not skip ahead: (b) reads the code on `main`, and (d) can show that the platform changed something the code did not.

1. **Make `main` the default branch.** Settings → General → Default branch → switch to `main`. Scheduled workflows run the file on the default branch, so until then the daily 06:17 UTC run uses the `develop` copy of `sync-catalog.yml` (§6). Keep `develop` for the task branches and its PRs.
2. **First full load on production.** Actions → **Sync catalog** → Run workflow, **Use workflow from: `main`**, tick **Carga completa**. It takes about an hour (the job allows 150 minutes). Details and the abort rules are in §7.1.
3. **Verify the load.** Run the three queries of §7.2 against production (`sync_runs`, the `catalog_titles` totals, `daily_picks` for today and tomorrow) and compare with the expected numbers there. Then open the production home and a title page (§7.3).
4. **Check the security headers in production.** The platform (Vercel) can override or add headers, so test the live domain, not only the build:

   ```sh
   curl -I https://kinne.com.br
   ```

   The response must carry all six, with the values of security.md §10: `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` and `Cross-Origin-Opener-Policy: same-origin`. There must be no `X-Powered-By`. A missing or different header is a regression: fix it before announcing the site.
