// Mostra o que cada sentimento devolve no catálogo real, para calibrar as receitas.
// Só lê o banco. Uso: npm run feelings:calibrate
// Saída: para cada sentimento, os temas da receita que o catálogo não tem (com temas de nome
// parecido que ele tem, para trocar) e os 12 títulos recomendáveis que o sentimento devolve.
import { eq } from "drizzle-orm";

import { meetsQualityFloor } from "@/domain/catalog";
import {
    FEELING_LABELS,
    FEELING_RECIPES,
    FEELING_RESTART,
    FEELINGS,
    feelingSeeds,
    rankByFeeling,
} from "@/domain/feelings";
import { weightedRating } from "@/domain/rounds";
import { buildTasteGraph, scoreTitles } from "@/domain/taste-graph";
import { createDb } from "@/infrastructure/db/client";
import { catalogTitles } from "@/infrastructure/db/schema";
import { DrizzleTasteGraphRepository } from "@/infrastructure/db/taste-graph-repository";
import { publicErrorMessage } from "@/infrastructure/tmdb/client";

const TOP = 12;
const SIMILAR = 6;

async function main() {
    const db = createDb();
    const started = performance.now();
    const { titles, keywordIdsByName } = await new DrizzleTasteGraphRepository(db).load();
    const loaded = performance.now();
    const graph = buildTasteGraph(titles);
    const built = performance.now();

    const rows = (
        await db
            .select({
                id: catalogTitles.id,
                name: catalogTitles.displayTitle,
                year: catalogTitles.releaseYear,
                type: catalogTitles.titleType,
                rating: catalogTitles.tmdbAverageRating,
                votes: catalogTitles.tmdbVoteCount,
            })
            .from(catalogTitles)
            .where(eq(catalogTitles.isRecommendable, true))
    )
        .map((r) => ({ ...r, rating: Number(r.rating) }))
        .filter((r) => meetsQualityFloor(r.rating, r.votes));
    const info = new Map(rows.map((r) => [r.id, r]));
    const mean = rows.reduce((sum, r) => sum + r.rating, 0) / Math.max(rows.length, 1);
    const genresById = new Map(titles.map((t) => [t.id, t.genreTmdbIds]));
    const candidates = rows.map((r) => ({
        id: r.id,
        genreTmdbIds: genresById.get(r.id) ?? [],
        quality: weightedRating(r.rating, r.votes, mean),
    }));
    const keywordNames = [...keywordIdsByName.keys()];

    console.log(
        `Catálogo: ${titles.length} títulos no grafo, ${rows.length} recomendáveis no piso, ` +
            `${graph.featureIndex.size} características, ${graph.neighbors.length / 2} arestas. ` +
            `Carga ${Math.round(loaded - started)} ms, grafo ${Math.round(built - loaded)} ms.\n`,
    );

    for (const feeling of FEELINGS) {
        const resolve = (name: string) => keywordIdsByName.get(name.toLowerCase());
        const recipe = FEELING_RECIPES[feeling];
        const missing = [
            ...Object.keys(recipe.keywords),
            ...Object.keys(recipe.avoidKeywords ?? {}),
        ].filter((name) => resolve(name) === undefined);

        const t0 = performance.now();
        const scores = scoreTitles(graph, feelingSeeds(feeling, resolve), {
            restart: FEELING_RESTART,
        });
        const ranked = rankByFeeling(feeling, scores, candidates);
        const ms = Math.round(performance.now() - t0);

        const label = FEELING_LABELS[feeling];
        console.log(`## ${label} (${feeling}) — ${ranked.length} títulos, ${ms} ms`);
        for (const name of missing) {
            const words = name.toLowerCase().split(/[\s-]+/);
            const similar = keywordNames
                .filter((k) => words.some((w) => w.length > 3 && k.includes(w)))
                .slice(0, SIMILAR);
            const hint = similar.join(" | ") || "nenhum";
            console.log(`   tema ausente: "${name}" — parecidos: ${hint}`);
        }
        ranked.slice(0, TOP).forEach((id, i) => {
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
