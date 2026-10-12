import type { RecommendationSource } from "@/domain/usage-events";

// Por onde a pessoa chegou à tela do título (US004 RNE001). Sem ?origem, ou com valor
// desconhecido, é link (C8). "busca" é a busca da barra do topo.
export type Origin = "dia" | "surpresa" | "filtros" | "busca" | "link";

export function parseOrigin(value: string | string[] | undefined): Origin {
    return value === "dia" || value === "surpresa" || value === "filtros" || value === "busca"
        ? value
        : "link";
}

// A origem gravada no recommendation_shown (03); o link não tem valor próprio e fica vazio.
export const RECOMMENDATION_SOURCE = {
    dia: "daily_pick",
    filtros: "filtered",
    surpresa: "surprise_me",
    busca: "search",
    link: null,
} as const satisfies Record<Origin, RecommendationSource | null>;

export const titleHref = (slug: string, origin: Exclude<Origin, "link">) =>
    `/titulo/${slug}?origem=${origin}` as const;
