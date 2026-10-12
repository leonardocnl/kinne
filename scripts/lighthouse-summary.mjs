// Resumo do Lighthouse CI (lighthouse.yml) no resumo da execução: a execução representativa de
// cada endereço, com as métricas do orçamento. Lê .lighthouseci/, escrito pelo `lhci autorun`.
import { appendFileSync, existsSync, readFileSync } from "node:fs";

const MANIFEST = ".lighthouseci/manifest.json";
if (!existsSync(MANIFEST)) {
    console.log("No Lighthouse results.");
    process.exit(0);
}

const lines = [
    "### Lighthouse",
    "",
    "| URL | Score | LCP | CLS | TBT |",
    "| --- | ---: | ---: | ---: | ---: |",
];
for (const run of JSON.parse(readFileSync(MANIFEST, "utf8")).filter((r) => r.isRepresentativeRun)) {
    const { audits, categories } = JSON.parse(readFileSync(run.jsonPath, "utf8"));
    const ms = (id) => `${Math.round(audits[id].numericValue)} ms`;
    lines.push(
        `| ${new URL(run.url).pathname} | ${Math.round(categories.performance.score * 100)} | ${ms("largest-contentful-paint")} | ${audits["cumulative-layout-shift"].numericValue.toFixed(3)} | ${ms("total-blocking-time")} |`,
    );
}
console.log(lines.join("\n"));
if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join("\n")}\n`);
