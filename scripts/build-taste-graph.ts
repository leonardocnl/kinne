// Monta o grafo de gosto e troca a tabela title_neighbors (docs/design/taste-graph.md §9).
// Roda no job diário depois da carga do catálogo. Uso: SYNC_TARGET=develop npm run graph:build
// Logs e resumo só com contagens e tempos (taste-graph-data D2).
import { appendFileSync } from "node:fs";

import { buildNeighborEdges } from "@/domain/taste-graph";
import { connectSyncDb, DrizzleCatalogRepository } from "@/infrastructure/db/catalog-repository";
import { requestGraphRevalidation } from "@/infrastructure/revalidation";
import { DrizzleTasteGraphRepository } from "@/infrastructure/db/taste-graph-repository";
import { publicErrorMessage } from "@/infrastructure/tmdb/client";

function summary(lines: string[]) {
    for (const l of lines) console.log(l);
    const file = process.env.GITHUB_STEP_SUMMARY;
    if (file) appendFileSync(file, lines.join("\n") + "\n");
}

async function main() {
    const target = process.env.SYNC_TARGET;
    const url = process.env.SYNC_DATABASE_URL;
    if (!target || !url) {
        console.error("Defina SYNC_TARGET e SYNC_DATABASE_URL");
        process.exit(1);
    }
    const { db, close } = await connectSyncDb(url);
    try {
        // mesmo cuidado da carga (catalog-sync C3): o banco diz qual ambiente é
        const environment = await new DrizzleCatalogRepository(db).environment();
        if (environment !== target) {
            console.error(`Banco é "${environment ?? "sem meta.environment"}", alvo é "${target}"`);
            process.exit(1);
        }
        const repository = new DrizzleTasteGraphRepository(db);
        const t0 = performance.now();
        const { rows } = await repository.load();
        const t1 = performance.now();
        const edges = buildNeighborEdges(rows.map((r) => r.profile));
        const t2 = performance.now();
        const written = await repository.replaceNeighbors(edges);
        const t3 = performance.now();
        // o servidor guarda o grafo em cache: depois de gravado, pede que ele leia o novo.
        // Falha aqui não desfaz a gravação, mas falha o job (o grafo de ontem ficaria no ar).
        let revalidation = "não configurada";
        const origin = process.env.REVALIDATE_ORIGIN;
        const secret = process.env.REVALIDATE_SECRET;
        if (origin && secret) {
            const r = await requestGraphRevalidation(origin, secret);
            revalidation = `${r.sent} pedidos ok, ${r.failed} falharam`;
            if (r.failed) process.exitCode = 1;
        }
        const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`;
        summary([
            "## Grafo de gosto",
            "",
            `- Títulos: ${rows.length}`,
            `- Arestas: ${edges.length} (${written} linhas, nos dois sentidos)`,
            `- Tempo: carga ${seconds(t1 - t0)}, cálculo ${seconds(t2 - t1)}, ` +
                `gravação ${seconds(t3 - t2)}`,
            `- Invalidação do cache: ${revalidation}`,
        ]);
    } finally {
        await close();
    }
}

main().catch((e) => {
    // D1: nunca ecoa a mensagem do driver do banco.
    console.error(publicErrorMessage(e));
    process.exit(1);
});
