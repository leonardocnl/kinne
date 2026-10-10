// Carga do catálogo a partir do TMDB. Uso: npm run catalog:sync
import { syncCatalog } from "@/application/sync-catalog";
import { createDb } from "@/infrastructure/db/client";
import { DrizzleCatalogRepository } from "@/infrastructure/db/catalog-repository";
import { TmdbCatalogSource } from "@/infrastructure/tmdb/catalog-source";
import { TmdbClient } from "@/infrastructure/tmdb/client";
import { syncEnvErrors } from "@/infrastructure/sync-env";

async function main() {
    const envErrors = syncEnvErrors(process.env);
    if (envErrors.length) {
        for (const e of envErrors) console.error(`Variável de ambiente errada: ${e}`);
        process.exit(1);
    }
    const s = await syncCatalog(
        new TmdbCatalogSource(new TmdbClient()),
        new DrizzleCatalogRepository(createDb()),
    );
    const total = s.byType.movie + s.byType.series;
    console.log(`\nCatálogo sincronizado: ${total} títulos`);
    console.log(`  Filmes: ${s.byType.movie} · Séries: ${s.byType.series}`);
    console.log("  Por streaming:");
    for (const [name, n] of Object.entries(s.byStreaming)) console.log(`    ${name}: ${n}`);
    console.log("  Por gênero do Kinne:");
    for (const [name, n] of Object.entries(s.byKinneGenre)) console.log(`    ${name}: ${n}`);
    console.log(`  Sem tagline: ${s.withoutTagline}`);
    console.log(`  Sem trailer: ${s.withoutTrailer}`);
    console.log(`  Sem backdrop: ${s.withoutBackdrop}`);
    console.log(`  Abaixo do piso nos detalhes (ignorados): ${s.belowFloor}`);
    console.log(`  No banco mas fora desta carga (mantidos): ${s.notInThisSync}`);
    console.log(`  Requisições ao TMDB: ${s.requests}`);
    console.log(`  Tempo total: ${(s.elapsedMs / 1000).toFixed(1)} s`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
