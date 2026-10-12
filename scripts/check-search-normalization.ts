// G14: confere que kinne_normalize (banco) e normalizeSearchText (TypeScript) dão o mesmo
// resultado nos casos de src/domain/search-cases.ts. Uso: npm run search:check-normalization
import { neon } from "@neondatabase/serverless";
import { normalizeSearchText } from "@/domain/search";
import { NORMALIZATION_CASES } from "@/domain/search-cases";
import { dbEnvErrors } from "@/infrastructure/sync-env";

async function main() {
    const errors = dbEnvErrors(process.env);
    if (errors.length) throw new Error(errors.join("; "));
    const sql = neon(process.env.DATABASE_URL_POOLED!);
    let failed = 0;
    for (const [input, expected] of NORMALIZATION_CASES) {
        const [row] = await sql`select kinne_normalize(${input}) as n`;
        const ts = normalizeSearchText(input);
        const ok = row.n === expected && ts === expected;
        if (!ok) failed++;
        console.log(
            `${ok ? "ok  " : "FAIL"} ${JSON.stringify(input)} banco=${JSON.stringify(row.n)} ts=${JSON.stringify(ts)}`,
        );
    }
    if (failed) process.exit(1);
}

main().catch(() => {
    console.error("Conferência falhou (detalhe omitido)");
    process.exit(1);
});
