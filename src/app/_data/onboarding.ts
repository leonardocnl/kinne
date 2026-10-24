import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createDb } from "@/infrastructure/db/client";
import { DrizzleTitlesRepository, type PopularTitle } from "@/infrastructure/db/titles-repository";
import { CATALOG_TAG, LISTS_TAG } from "@/infrastructure/revalidation";

const GRID_SIZE = 60;

/**
 * A grade de títulos do onboarding (US013 C2): os mais votados entre os recomendáveis, sem
 * classificação 18. Só dados do catálogo, em cache remoto como as demais listas; nada de quem pede.
 */
export async function onboardingGrid(): Promise<PopularTitle[]> {
    "use cache: remote";
    cacheLife("days");
    cacheTag(CATALOG_TAG, LISTS_TAG);
    return new DrizzleTitlesRepository(createDb()).popularTitles(GRID_SIZE);
}
