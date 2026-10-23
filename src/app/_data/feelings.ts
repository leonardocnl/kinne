import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { feelingKit, type Feeling, type FeelingData, type FeelingKit } from "@/domain/feelings";
import { createDb } from "@/infrastructure/db/client";
import { DrizzleTitlesRepository } from "@/infrastructure/db/titles-repository";
import { CATALOG_TAG, LISTS_TAG } from "@/infrastructure/revalidation";

/**
 * Gêneros e temas dos títulos recomendáveis, para ordenar por sentimento (US008 RNE002). Só dados
 * do catálogo, em cache remoto como a lista de candidatos; fica no servidor (RNE004).
 */
async function feelingData(): Promise<FeelingData> {
    "use cache: remote";
    cacheLife("days");
    cacheTag(CATALOG_TAG, LISTS_TAG);
    return new DrizzleTitlesRepository(createDb()).feelingData();
}

/** O sentimento pronto para ordenar, ou null se os dados não carregarem (ordem de hoje). */
export async function loadFeelingKit(feeling: Feeling): Promise<FeelingKit | null> {
    try {
        return feelingKit(feeling, await feelingData());
    } catch {
        return null;
    }
}
