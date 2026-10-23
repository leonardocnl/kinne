// Mostra o que cada sentimento devolve no catálogo real, para calibrar as receitas.
// Só lê o banco. Uso: npm run feelings:calibrate
// Saída: para cada sentimento, os temas da receita que o catálogo não tem e os 12 títulos
// recomendáveis mais bem pontuados.
import { eq } from "drizzle-orm";

import { FEELING_LABELS, FEELING_RECIPES, FEELINGS, feelingSeeds } from "@/domain/feelings";
import { buildTasteGraph, scoreTitles } from "@/domain/taste-graph";
import { createDb } from "@/infrastructure/db/client";
import { catalogTitles } from "@/infrastructure/db/schema";
import { DrizzleTasteGraphRepository } from "@/infrastructure/db/taste-graph-repository";
import { publicErrorMessage } from "@/infrastructure/tmdb/client";

const TOP = 12;

async function main() {
    const db = createDb();
    const started = performance.now();
    const { titles, keywordIdsByName } = await new DrizzleTasteGraphRepository(db).load();
    const loaded = performance.now();
    const graph = buildTasteGraph(titles);
    const built = performance.now();

    const info = new Map(
        (
            await db
                .select({
                    id: catalogTitles.id,
                    name: catalogTitles.displayTitle,
                    year: catalogTitles.releaseYear,
                    type: catalogTitles.titleType,
                })
                .from(catalogTitles)
                .where(eq(catalogTitles.isRecommendable, true))
        ).map((r) => [r.id, r]),
    );

    console.log(
        `Catálogo: ${titles.length} títulos, ${graph.featureIndex.size} características, ` +
            `${graph.neighbors.length / 2} arestas. Carga ${Math.round(loaded - started)} ms, ` +
            `grafo ${Math.round(built - loaded)} ms.\n`,
    );

    for (const feeling of FEELINGS) {
        const resolve = (name: string) => keywordIdsByName.get(name.toLowerCase());
        const recipe = FEELING_RECIPES[feeling];
        const missing = [
            ...Object.keys(recipe.keywords),
            ...Object.keys(recipe.avoidKeywords ?? {}),
        ].filter((name) => resolve(name) === undefined);

        const t0 = performance.now();
        const scores = scoreTitles(graph, feelingSeeds(feeling, resolve));
        const ms = Math.round(performance.now() - t0);
        const top = [...scores]
            .filter(([id]) => info.has(id))
            .sort((a, b) => b[1] - a[1])
            .slice(0, TOP);

        console.log(`## ${FEELING_LABELS[feeling]} (${feeling}) — ${ms} ms`);
        if (missing.length > 0) {
            console.log(`   temas ausentes no catálogo: ${missing.join(", ")}`);
        }
        top.forEach(([id], i) => {
            const t = info.get(id)!;
            const kind = t.type === "movie" ? "filme" : "série";
            console.log(`   ${String(i + 1).padStart(2)}. ${t.name} (${t.year ?? "?"}, ${kind})`);
        });
        console.log("");
    }
}

main().catch((e) => {
    // D1: nunca ecoa a mensagem do driver do banco.
    console.error(publicErrorMessage(e));
    process.exit(1);
});
