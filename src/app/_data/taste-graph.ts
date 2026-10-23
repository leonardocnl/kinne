import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { toNeighborGraph, type NeighborGraph } from "@/domain/taste-graph";
import { createDb } from "@/infrastructure/db/client";
import { DrizzleTitlesRepository } from "@/infrastructure/db/titles-repository";
import { CATALOG_TAG, LISTS_TAG } from "@/infrastructure/revalidation";

/**
 * O grafo de vizinhos (docs/design/taste-graph.md), lido uma vez e guardado em cache remoto com as
 * etiquetas do catálogo (feelings-and-taste-ui C1). O `graph:build` pede a revalidação ao terminar.
 * É a única leitura do grafo no servidor: o gosto e a sala de grupo usam esta função.
 *
 * Só dados do catálogo, iguais para todos (B2): nada de quem pede entra aqui. Se a leitura
 * falhar, quem chama segue com a ordem de hoje (US009 RNE006).
 */
export async function neighborGraph(): Promise<NeighborGraph> {
    "use cache: remote";
    cacheLife("days");
    cacheTag(CATALOG_TAG, LISTS_TAG);
    return toNeighborGraph(await new DrizzleTitlesRepository(createDb()).neighborEdges());
}

/** O grafo, ou null se não carregar: o gosto é um extra, nunca um erro na tela (US009 RNE006). */
export async function neighborGraphOrNull(): Promise<NeighborGraph | null> {
    try {
        const graph = await neighborGraph();
        return graph.size > 0 ? graph : null;
    } catch {
        return null;
    }
}
