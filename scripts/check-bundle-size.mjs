// Orçamento de JS da tela inicial: soma, em gzip, o JS que um navegador moderno baixa para "/"
// (os <script> e preloads do HTML pré-renderizado), sem o pacote noModule de polyfills, que só
// navegadores sem módulos ES baixam. Roda depois de `npm run build`. Uso: npm run bundle:check
import { appendFileSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { scanDirectory } from "./bundle-secrets.mjs";

const BUDGET_KB = 151; // era 150; o dono subiu para o horizonte animado do rodapé (25/10/2026)
const PAGE = ".next/server/app/index.html";

const html = readFileSync(PAGE, "utf8");
const scripts = (pattern) => new Set([...html.matchAll(pattern)].map((m) => m[1]));
const legacy = scripts(/<script src="(\/_next\/static\/[^"]+\.js)"[^>]*noModule/g);
const modern = [...scripts(/(?:src|href)="(\/_next\/static\/[^"]+\.js)"/g)].filter(
    (src) => !legacy.has(src),
);

const gzipKb = (src) =>
    gzipSync(readFileSync(`.next${src.replace("/_next", "")}`), { level: 9 }).length / 1024;
const rows = modern.map((src) => ({ src, kb: gzipKb(src) })).sort((a, b) => b.kb - a.kb);
const total = rows.reduce((sum, r) => sum + r.kb, 0);
const legacyKb = [...legacy].reduce((sum, src) => sum + gzipKb(src), 0);
const ok = total <= BUDGET_KB;

const lines = [
    `### Home JS: ${total.toFixed(1)} KB gzip (budget ${BUDGET_KB} KB) ${ok ? "✅" : "❌"}`,
    "",
    "| File | KB gzip |",
    "| ---- | ------: |",
    ...rows.map(
        (r) => `| \`${r.src.replace("/_next/static/chunks/", "")}\` | ${r.kb.toFixed(1)} |`,
    ),
    "",
    `Not counted: ${legacyKb.toFixed(1)} KB gzip of \`noModule\` polyfills, downloaded only by browsers without ES modules.`,
];
console.log(lines.join("\n"));
if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join("\n")}\n`);
if (!ok) {
    console.error(`Home JS over budget by ${(total - BUDGET_KB).toFixed(1)} KB.`);
    process.exit(1);
}

// Nenhum segredo no JS do navegador, de nenhuma página (ameaças de contas E1)
const leaks = scanDirectory(".next/static");
if (leaks.length > 0) {
    for (const leak of leaks)
        console.error(`Segredo no JS do cliente: ${leak.file}: ${leak.found.join(", ")}`);
    process.exit(1);
}
console.log("Nenhum nome de segredo nem chave no JS do cliente.");
