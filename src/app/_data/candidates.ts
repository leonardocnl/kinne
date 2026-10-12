import { cacheLife, cacheTag } from "next/cache";
import type { Candidate } from "@/application/titles";
import { createDb } from "@/infrastructure/db/client";
import { DrizzleTitlesRepository } from "@/infrastructure/db/titles-repository";
import { CATALOG_TAG, LISTS_TAG } from "@/infrastructure/revalidation";

/**
 * Os títulos que a surpresa (US003) e os filtros (US002) sorteiam, numa lista só, em cache por um
 * dia (o catálogo muda uma vez por dia). Filtros, marcados e sorteio rodam sobre ela, sem cache por
 * combinação: são centenas de milhares, e os marcados mudam de navegador para navegador.
 */
export async function candidates(): Promise<Candidate[]> {
    "use cache: remote";
    cacheLife("days");
    cacheTag(CATALOG_TAG, LISTS_TAG);
    return new DrizzleTitlesRepository(createDb()).candidates();
}
