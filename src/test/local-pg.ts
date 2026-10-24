import "server-only";
import { execFileSync } from "node:child_process";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

// Banco de verdade para os testes de ataque das contas (docs/threats/accounts.md): as funções
// kinne_* são a garantia, e só um Postgres confere isso. Liga com KINNE_TEST_DB=1 e as variáveis
// PG* de um banco DESCARTÁVEL com as migrations aplicadas (npm run test:db). Sem isso, os testes
// que o usam são pulados.

export const dbTestsEnabled = process.env.KINNE_TEST_DB === "1";

const dialect = new PgDialect();

function literal(value: unknown): string {
    if (value === null || value === undefined) return "NULL";
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    return `'${String(value).replaceAll("'", "''")}'`;
}

function psql(text: string): string {
    return execFileSync("psql", ["-v", "ON_ERROR_STOP=1", "-qAt", "-c", text], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
    });
}

/** SQL como dono do banco, para montar cenários e conferir o que o site não enxerga. */
export function admin(text: string): string {
    return psql(text).trim();
}

/**
 * Um `Db` de mentira que roda no psql com o papel do site (kinne_app), com as permissões dele:
 * `execute` devolve as linhas como o driver HTTP devolve.
 */
export function localDb(role = "kinne_app") {
    return {
        async execute(statement: SQL) {
            const { sql, params } = dialect.sqlToQuery(statement);
            const text = sql.replace(/\$(\d+)/g, (_, n) => literal(params[Number(n) - 1]));
            const out = psql(
                `set role ${role}; select coalesce(json_agg(t), '[]'::json) from (${text}) t`,
            );
            const json = out
                .split("\n")
                .filter((line) => line !== "SET" && line !== "")
                .join("");
            return { rows: JSON.parse(json) as Record<string, unknown>[] };
        },
    };
}

/** Roda uma instrução qualquer com o papel dado e devolve as linhas; lança se o banco recusar. */
export function runAs(role: string, statement: SQL): Record<string, unknown>[] {
    const { sql, params } = dialect.sqlToQuery(statement);
    const text = sql.replace(/\$(\d+)/g, (_, n) => literal(params[Number(n) - 1]));
    const out = psql(`set role ${role}; select coalesce(json_agg(t), '[]'::json) from (${text}) t`);
    return JSON.parse(
        out
            .split("\n")
            .filter((l) => l !== "SET" && l !== "")
            .join(""),
    );
}
