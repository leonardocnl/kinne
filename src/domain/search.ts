import type { TitleType } from "./catalog";

// Busca de títulos (threat model docs/threats/title-search.md).

export const MAX_RAW_TERM_LENGTH = 200; // H4: recusado antes de normalizar
export const MIN_TERM_LENGTH = 2;
export const MAX_TERM_LENGTH = 80;
export const MAX_RESULTS = 8;

// Letras que o unaccent do Postgres troca e a decomposição NFD não separa (G14).
const LIGATURES: Record<string, string> = {
    ß: "ss",
    æ: "ae",
    œ: "oe",
    ø: "o",
    ł: "l",
    đ: "d",
    ð: "d",
    þ: "th",
    ı: "i",
};

/**
 * Espelho de kinne_normalize (migration 0006) mais a limpeza do texto: NFC, sem caracteres de
 * controle nem de formatação, espaços colapsados, minúsculas e sem acentos. Os casos de
 * search.test.ts são os mesmos que scripts/check-search-normalization.ts confere no banco.
 */
export function normalizeSearchText(text: string): string {
    return text
        .normalize("NFC")
        .replace(/[\p{Cc}\p{Cf}]/gu, (c) => (/\s/.test(c) ? " " : ""))
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .replace(/[ßæœøłđðþı]/g, (c) => LIGATURES[c])
        .normalize("NFC");
}

/** O termo digitado, pronto para buscar, ou null se não serve (A3, H4). */
export function parseSearchTerm(raw: string): string | null {
    if (raw.length > MAX_RAW_TERM_LENGTH) return null;
    const term = normalizeSearchText(raw);
    const length = [...term].length;
    return length >= MIN_TERM_LENGTH && length <= MAX_TERM_LENGTH ? term : null;
}

export type SearchResult = {
    slug: string;
    title: string;
    year: number | null;
    type: TitleType;
    posterPath: string | null;
};

// H5: quatro respostas, cada uma com a sua mensagem na tela.
export type SearchOutcome =
    | { kind: "results"; results: SearchResult[] }
    // o TMDB conhece o título, mas ele não está (ou não está mais) nos streamings do Kinne
    | { kind: "elsewhere" }
    | { kind: "none" }
    // limite, orçamento, disjuntor, tempo ou erro
    | { kind: "unavailable" };
