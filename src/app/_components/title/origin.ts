import type { Origin } from "@/modules/catalog";
import type { RecommendationSource } from "@/domain/usage-events";

// A origem gravada no recommendation_shown (03); o link não tem valor próprio e fica vazio.
export const RECOMMENDATION_SOURCE = {
    dia: "daily_pick",
    filtros: "filtered",
    surpresa: "surprise_me",
    busca: "search",
    link: null,
} as const satisfies Record<Origin, RecommendationSource | null>;
