import "server-only";
import { execFileSync } from "node:child_process";
import { PgDialect } from "drizzle-orm/pg-core";
import { localDatabaseProblem } from "./local-guard";
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

/** Antes de qualquer comando: o ambiente tem de apontar para esta máquina (B7). */
function assertLocalDatabase() {
    const problem = localDatabaseProblem();
    if (problem) {
        throw new Error(`Banco recusado: ${problem}. Os testes de banco só rodam localmente.`);
    }
}

/**
 * Põe a instrução no formato "uma linha de JSON com todas as linhas": consultas viram subconsulta,
 * escritas com RETURNING viram CTE, e escritas sem RETURNING rodam e devolvem [].
 */
function asJson(text: string): string {
    if (!/^\s*(insert|update|delete)\b/i.test(text)) {
        return `select coalesce(json_agg(t), '[]'::json) from (${text}) t`;
    }
    return /\breturning\b/i.test(text)
        ? `with t as (${text}) select coalesce(json_agg(t), '[]'::json) from t`
        : `${text}; select '[]'::json`;
}

function psql(text: string): string {
    assertLocalDatabase();
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
            const out = psql(`set role ${role}; ${asJson(text)}`);
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
    const out = psql(`set role ${role}; ${asJson(text)}`);
    return JSON.parse(
        out
            .split("\n")
            .filter((l) => l !== "SET" && l !== "")
            .join(""),
    );
}

/** O SQL de uma instrução já com os parâmetros no lugar, para montar roteiros de várias instruções. */
export function renderSql(statement: SQL): string {
    const { sql, params } = dialect.sqlToQuery(statement);
    return sql.replace(/\$(\d+)/g, (_, n) => literal(params[Number(n) - 1]));
}

/**
 * Um roteiro de várias instruções numa sessão só (tabelas temporárias vivem na sessão), com o papel
 * dado. Devolve o que a última consulta imprimiu.
 */
export function runScript(role: string, script: string): string {
    assertLocalDatabase();
    const out = execFileSync("psql", ["-v", "ON_ERROR_STOP=1", "-qAt", "-f", "-"], {
        input: `set role ${role};\n${script}`,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
    });
    return out
        .split("\n")
        .filter((l) => l !== "SET" && l !== "")
        .join("\n");
}

/** Como `runAs`, mas sem travar o processo: várias conexões ao mesmo tempo (testes de corrida). */
export async function runAsAsync(role: string, statement: SQL): Promise<Record<string, unknown>[]> {
    assertLocalDatabase();
    const { promisify } = await import("node:util");
    const { execFile } = await import("node:child_process");
    const text = renderSql(statement);
    const { stdout } = await promisify(execFile)(
        "psql",
        [
            "-v",
            "ON_ERROR_STOP=1",
            "-qAt",
            "-c",
            `set role ${role}; select coalesce(json_agg(t), '[]'::json) from (${text}) t`,
        ],
        { encoding: "utf8" },
    );
    return JSON.parse(
        stdout
            .split("\n")
            .filter((l) => l !== "SET" && l !== "")
            .join(""),
    );
}
