// Por onde a pessoa chegou à tela do título (US004 RNE001). Sem ?origem, ou com valor
// desconhecido, é link (C8).
export type Origin = "dia" | "surpresa" | "filtros" | "link";

export function parseOrigin(value: string | string[] | undefined): Origin {
    return value === "dia" || value === "surpresa" || value === "filtros" ? value : "link";
}

export const titleHref = (slug: string, origin: Exclude<Origin, "link">) =>
    `/titulo/${slug}?origem=${origin}` as const;
