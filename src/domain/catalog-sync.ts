import type { TitleType } from "./catalog";

// Classificação indicativa brasileira. "18" é o conteúdo adulto: só aparece pelo chip 18+ (A7).
export const BR_CERTIFICATIONS = ["L", "10", "12", "14", "16", "18"] as const;
export type BrCertification = (typeof BR_CERTIFICATIONS)[number];
export type CertificationSource = "br" | "us" | "none";

export const ADULT_CERTIFICATION: BrCertification = "18";

// "AL" e "A12" são grafias antigas que ainda aparecem no TMDB.
export function normalizeBrCertification(value: string | null | undefined): BrCertification | null {
    const v = value
        ?.trim()
        .toUpperCase()
        .replace(/^A(?=\d)/, "");
    if (v === "AL" || v === "LIVRE") return "L";
    return BR_CERTIFICATIONS.find((c) => c === v) ?? null;
}

// Na falta da brasileira, a americana convertida para a idade brasileira mais próxima (A7).
// TV-MA e NC-17 viram 18: na dúvida, o título só aparece pelo chip 18+.
const US_TO_BR: Record<TitleType, Record<string, BrCertification>> = {
    movie: { G: "L", PG: "10", "PG-13": "12", R: "16", "NC-17": "18" },
    series: {
        "TV-Y": "L",
        "TV-Y7": "L",
        "TV-G": "L",
        "TV-PG": "10",
        "TV-14": "14",
        "TV-MA": "18",
    },
};

export function pickCertification(
    type: TitleType,
    br: readonly string[],
    us: readonly string[],
): { certification: BrCertification | null; source: CertificationSource } {
    for (const value of br) {
        const certification = normalizeBrCertification(value);
        if (certification) return { certification, source: "br" };
    }
    for (const value of us) {
        const certification = US_TO_BR[type][value.trim().toUpperCase()];
        if (certification) return { certification, source: "us" };
    }
    return { certification: null, source: "none" };
}

export type Image = { path: string; width: number; languageCode: string | null };

// Imagem larga: a maior, de preferência sem texto (sem idioma); senão a maior de qualquer idioma.
export function pickBackdrop(images: readonly Image[]): { path: string; width: number } | null {
    const largest = (list: readonly Image[]) =>
        list.reduce<Image | null>((best, i) => (!best || i.width > best.width ? i : best), null);
    const chosen = largest(images.filter((i) => i.languageCode === null)) ?? largest(images);
    return chosen && { path: chosen.path, width: chosen.width };
}

export const MIN_RECOMMENDABLE_VOTES = 50;

export type RecommendabilityInput = {
    hasSynopsis: boolean;
    hasBackdrop: boolean;
    voteCount: number;
    certification: BrCertification | null;
    isActive: boolean;
    isBlocked: boolean;
};

// A única regra do que as recomendações podem usar (C7). Títulos 18 continuam recomendáveis:
// quem os separa é a certificação, para o chip 18+.
export function isRecommendable(t: RecommendabilityInput): boolean {
    return (
        t.hasSynopsis &&
        t.hasBackdrop &&
        t.voteCount >= MIN_RECOMMENDABLE_VOTES &&
        t.certification !== null &&
        t.isActive &&
        !t.isBlocked
    );
}

// Válvula de segurança (B1): uma carga não remove nem inativa mais que 5% do que está ativo.
export const MAX_REMOVAL_RATIO = 0.05;
export const exceedsSafetyValve = (current: number, removing: number) =>
    removing > current * MAX_REMOVAL_RATIO;

// Esquema do TMDB mudou? Mais que 2% das respostas recusadas aborta a carga (B2).
export const MAX_REJECT_RATIO = 0.02;
export const exceedsRejectThreshold = (fetched: number, rejected: number) =>
    rejected > fetched * MAX_REJECT_RATIO;

// Título que saiu dos streamings (B6): apagado só se nada o referencia; senão fica inativo,
// para não perder métricas do teste.
export function planRemovals(missing: readonly { id: number; referenced: boolean }[]) {
    return {
        deleteIds: missing.filter((t) => !t.referenced).map((t) => t.id),
        inactivateIds: missing.filter((t) => t.referenced).map((t) => t.id),
    };
}
