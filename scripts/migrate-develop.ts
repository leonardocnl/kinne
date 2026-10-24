// Apoio do workflow migrate-develop. Dois passos, sempre sobre DATABASE_URL (conexão direta, papel dono):
//   guard   confere meta.environment = 'develop' ANTES de qualquer migration; recusa com exit 1.
//   verify  depois da migration, confere que o banco não ficou atrás do repositório.
// Nenhuma saída traz a URL nem o erro do driver: só mensagens genéricas (security §6).
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import { migrationsBehind, migrationTargetAllowed } from "@/application/migration-guard";

const POSTGRES_URL = /^postgres(ql)?:\/\/[^"'\s]+$/;

function fail(message: string): never {
    console.error(message);
    process.exit(1);
}

function expectedMigrations(): number {
    const journal: unknown = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8"));
    const entries = (journal as { entries?: unknown }).entries;
    if (!Array.isArray(entries) || entries.length === 0) throw new Error("journal inválido");
    return entries.length;
}

async function main() {
    const step = process.argv[2];
    const url = process.env.DATABASE_URL ?? "";
    if (step !== "guard" && step !== "verify") fail("Uso: migrate-develop.ts guard|verify");
    if (!POSTGRES_URL.test(url)) fail("DATABASE_URL ausente ou inválida");
    const sql = neon(url);

    if (step === "guard") {
        const rows = await sql`select value from meta where key = 'environment'`;
        if (!migrationTargetAllowed(rows[0]?.value as string | undefined)) {
            fail("Banco recusado: não é o banco develop. Nenhuma migration foi aplicada.");
        }
        console.log("Banco confirmado como develop.");
        return;
    }

    const rows = await sql`select count(*)::int as n from drizzle.__drizzle_migrations`;
    const applied = Number(rows[0]?.n);
    const expected = expectedMigrations();
    if (migrationsBehind(applied, expected)) {
        fail(`Banco atrás do repositório: ${applied} aplicadas de ${expected}.`);
    }
    console.log(`Migrations aplicadas: ${applied} de ${expected} no repositório.`);
}

main().catch(() => fail("Falha ao conferir o banco (detalhe omitido por segurança)"));
