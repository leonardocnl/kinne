"use server";

import "server-only";
import type { PopularTitle } from "@/infrastructure/db/titles-repository";
import { onboardingGrid } from "../_data/onboarding";

/** A grade de cartazes dos passos 1 e 2 (US013 C2). Dados do catálogo, iguais para todos. */
export async function onboardingTitles(): Promise<PopularTitle[]> {
    try {
        return await onboardingGrid();
    } catch {
        return [];
    }
}
