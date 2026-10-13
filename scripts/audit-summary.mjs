// Resumo do npm audit de todas as dependências (job npm-audit-dev do security.yml): escreve os
// achados no resumo da execução e termina com sucesso. Quem bloqueia é o npm-audit, que olha só
// as dependências de produção (security §11). Uso: node scripts/audit-summary.mjs audit.json
import { appendFileSync, readFileSync } from "node:fs";

const SEVERITIES = ["critical", "high", "moderate", "low", "info"];

let report;
try {
    report = JSON.parse(readFileSync(process.argv[2], "utf8"));
} catch {
    console.log("npm audit did not produce a readable report.");
    process.exit(0);
}

// npm audit falhou (registro fora do ar, rede): sem relatório, nada de "nenhum achado"
if (report.error || !report.metadata) {
    const line = "### npm audit (all dependencies): failed, results unknown";
    console.log(line);
    if (process.env.GITHUB_STEP_SUMMARY)
        appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${line}\n`);
    process.exit(0);
}

const counts = report.metadata.vulnerabilities ?? {};
const rows = Object.entries(report.vulnerabilities ?? {})
    .map(([name, v]) => ({
        name,
        severity: v.severity,
        direct: v.isDirect ? "yes" : "no",
        // o primeiro aviso com título; senão, o pacote pelo qual chega
        advisory:
            (v.via ?? []).find((x) => typeof x === "object")?.url ??
            `via ${(v.via ?? []).filter((x) => typeof x === "string").join(", ")}`,
        fix:
            v.fixAvailable === true
                ? "yes"
                : v.fixAvailable
                  ? `${v.fixAvailable.name}@${v.fixAvailable.version}${v.fixAvailable.isSemVerMajor ? " (major)" : ""}`
                  : "no",
    }))
    .sort((a, b) => SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity));

// só nome de pacote, severidade e link de aviso: nada vem de fora da árvore de dependências
const cell = (text) => String(text).replace(/[|\n\r]/g, " ");
const lines = [
    `### npm audit (all dependencies): ${counts.total ?? rows.length} finding(s)`,
    "",
    SEVERITIES.map((s) => `${s}: ${counts[s] ?? 0}`).join(" · "),
    "",
    ...(rows.length
        ? [
              "| Package | Severity | Direct | Advisory | Fix |",
              "| --- | --- | --- | --- | --- |",
              ...rows.map(
                  (r) =>
                      `| ${cell(r.name)} | ${cell(r.severity)} | ${r.direct} | ${cell(r.advisory)} | ${cell(r.fix)} |`,
              ),
          ]
        : ["No findings."]),
    "",
    "Visibility only: the blocking gate is the npm-audit job (production dependencies).",
];
console.log(lines.join("\n"));
if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join("\n")}\n`);
