# Baseline

Reference numbers taken before the foundation work (phase F0 of [plano-fundacao.md](plano-fundacao.md)), to compare later phases against.

Measured on 2026-11-01 at commit `2ab751b` (`develop`), on the development machine: Fedora, 12 threads, 23 GB of RAM, Node 24.18.0.

## Tests and build

| Command         | Wall time | Result                                                    |
| --------------- | --------- | --------------------------------------------------------- |
| `npm test`      | 7.2 s     | 89 files (86 passed, 3 skipped), 1179 tests (127 skipped) |
| `npm run build` | 15.5 s    | Success, starting without `.next`                         |

## Bundle

`npm run bundle:check`: **151.5 KB gzip** of home JS, budget 152 KB, passing. Not counted: 38.6 KB of `noModule` polyfills. No secret names or keys found in client JS.

## Lighthouse

`next start` on the local build, against the Neon `develop` database, Lighthouse from `@lhci/cli@0.15.1` in headless Chrome. Medians of 3 runs per route. Scores are performance / accessibility / best practices / SEO.

### Desktop preset (the one in `lighthouserc.json`)

| Route                            | Scores              | LCP    | CLS   | TBT       |
| -------------------------------- | ------------------- | ------ | ----- | --------- |
| `/`                              | 90 / 100 / 100 / 92 | 1.51 s | 0.007 | 156 ms    |
| `/titulo/beleza-verdadeira-2020` | 67 / 100 / 100 / 83 | 1.23 s | 0.000 | 15,545 ms |
| `/sala`                          | 57 / 100 / 100 / 58 | 0.60 s | 0.242 | 16,563 ms |
| `/sobre`                         | 98 / 100 / 100 / 92 | 0.60 s | 0.000 | 130 ms    |

### Mobile (Lighthouse default throttling)

| Route                            | Scores              | LCP    | CLS   | TBT        |
| -------------------------------- | ------------------- | ------ | ----- | ---------- |
| `/`                              | 62 / 100 / 100 / 92 | 4.45 s | 0.081 | 939 ms     |
| `/titulo/beleza-verdadeira-2020` | 59 / 100 / 100 / 83 | 3.71 s | 0.036 | 155,354 ms |
| `/sala`                          | 46 / 100 / 100 / 58 | 2.26 s | 0.618 | 4,423 ms   |
| `/sobre`                         | 98 / 100 / 100 / 92 | 2.39 s | 0.000 | 77 ms      |

### How to read these

- The budget in `DESIGN.md` applies to the Vercel preview, which the `lighthouse` workflow measures. These runs are local, so compare them only with other local runs.
- Other work was running on the machine during the mobile runs of the title and `/sala`, so those two rows are noisier. `/` and `/sobre` were measured again with the machine idle, and those are the numbers above.
- On `/sala`, a one-run diagnosis attributes nearly all the blocking time to one JS chunk loaded after the page opens, and the layout shift to the footer's horizon container. The likely cause is the footer's WebGL horizon, which loads when the footer is near the viewport and renders in software in headless Chrome. The title screen shows the same pattern but was not diagnosed separately. A device with a GPU should block far less; this was not measured.
- `/sala` and the title screen miss the desktop budget in this setup (CLS on `/sala`, TBT on both). Treat that as an open question for the preview run, not as a confirmed production regression.

## Points of attention for F5

- **Home JS budget:** see "Home JS budget change" below.
- **High TBT on `/titulo` and `/sala`:** 15.5 s and 16.6 s on desktop. The footer's WebGL horizon is the suspect; confirm on the Vercel preview.
- **CLS on `/sala`:** 0.242 on desktop, attributed to the footer's horizon container. The budget is 0.05.

## Home JS budget change

On 2026-11-01 the owner raised the budget from 152 KB to 160 KB gzip. The home measured **152.3 KB** with the three MVP adjustment PRs (#87, #88, #89) combined. The reason is to leave margin during the foundation work. Review the limit after F3 (design system), based on the size measured after the code cleanup.

## Fixed in F1

- **Flaky test** `src/app/_actions/room-account.db.test.ts`: it searched the whole stored row, as JSON, for short substrings such as "9398", which can also appear inside unrelated generated values. It now checks that no forged service is in `streamings` and no forged title id is in any of the four id lists of any member.
- **Flaky timing test** "custo do gosto (C2)" in `src/application/filtered-draw-taste.test.ts`: the 100 ms wall-clock limit on `spreadTaste` is replaced by a count of work (graph lookups at most `(steps + 1) × titles`, edges walked at most `(steps + 1) × adjacency entries`). Without the strength cache it reads 91,892 times against a limit of 12,000, so the test still catches a regression. The plan test in the same block ("o plano inteiro") had a 500 ms limit; it now counts the same graph work plus every property read on the candidates, bounded by `4 × n·log₂n` (59,284 reads today for 3,000 titles; recomputing the catalog mean for each title reads 9,059,284). No unit test depends on wall-clock time.

## To fix in F2 (discovery module) or F5

- **`filterCandidates` sends the whole recommendable catalog** (about 8,680 titles) to the browser on every call, so the counter can count locally. The target design filters on the server and returns only what the panel needs. The rate limit added in `fix/filter-candidates-rate-limit` is a temporary protection, not the solution.

## Timing checks outside the required set

No required test depends on wall-clock time. The one measurement kept, the email enumeration timing of `src/app/_actions/account.db.test.ts` (medians of 12 requests with and 12 without an account, within 150 ms), runs only with `KINNE_TIMING_TEST=1`, every night in `.github/workflows/timing-checks.yml` (five runs; it fails when three or more fail, and then opens an issue). The required check of the same attack compares the statements sent to the database (see docs/security.md §14).
