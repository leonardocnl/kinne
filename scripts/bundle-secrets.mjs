// O JS que vai ao navegador não pode conter o nome de um segredo nem algo com cara de chave
// (ameaças de contas E1). Usado por `npm run bundle:check`, depois do build, e pelos testes.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const SECRET_NAMES = [
    "AUTH_SECRET",
    "AUTH_EMAIL_FROM",
    "RESEND_API_KEY",
    "RATE_LIMIT_SECRET",
    "REVALIDATE_SECRET",
    "TMDB_TOKEN",
    "TEAM_SECRET_PATH",
    "DATABASE_URL",
    "DATABASE_URL_POOLED",
    "KINNE_APP_DATABASE_URL_POOLED",
    "SYNC_DATABASE_URL",
];

const SHAPES = [
    { label: "chave re_", pattern: /\bre_[A-Za-z0-9]{20,}/ },
    { label: "URL de banco", pattern: /postgres(?:ql)?:\/\/[^\s"'`]*@/ },
];

/** O que o texto traz de segredo: nomes de variável e formatos de chave. */
export function findSecrets(text) {
    const names = SECRET_NAMES.filter((name) => text.includes(name));
    return [...names, ...SHAPES.filter((s) => s.pattern.test(text)).map((s) => s.label)];
}

/** Todos os .js de um diretório, em qualquer profundidade, com o que cada um traz de segredo. */
export function scanDirectory(dir) {
    const found = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) found.push(...scanDirectory(path));
        else if (entry.name.endsWith(".js")) {
            const secrets = findSecrets(readFileSync(path, "utf8"));
            if (secrets.length > 0) found.push({ file: path, found: secrets });
        }
    }
    return found;
}
