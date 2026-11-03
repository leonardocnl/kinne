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

## To fix in F1

- **Flaky test:** `src/app/_actions/room-account.db.test.ts` failed once on #87 and passed on a rerun. It searches stored data for the substring "9398", which may match an unrelated generated value; this cause is not confirmed.
- **Flaky timing test:** "custo do gosto (C2)" in `src/application/filtered-draw-taste.test.ts` asserts that `spreadTaste` takes under 100 ms of wall-clock time. It failed with 111 ms under load in the full suite, and passed when run alone. In F1 it should measure the amount of work (for example, nodes or edges visited) instead of wall-clock time.

## To fix in F2 (discovery module) or F5

- **`filterCandidates` sends the whole recommendable catalog** (about 8,680 titles) to the browser on every call, so the counter can count locally. The target design filters on the server and returns only what the panel needs. The rate limit added in `fix/filter-candidates-rate-limit` is a temporary protection, not the solution.
