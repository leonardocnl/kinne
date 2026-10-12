export type TitleType = "movie" | "series";

// Piso de qualidade: só entra no catálogo quem tem nota e votos suficientes.
export const MIN_RATING = 6.4;
export const MIN_VOTES = 500;

export function meetsQualityFloor(rating: number, votes: number): boolean {
    return rating >= MIN_RATING && votes >= MIN_VOTES;
}

// Texto vindo do TMDB (A4/A5): NFC, sem caracteres de controle nem invisíveis de formatação
// (zero-width, marcas de direção, BOM), espaços colapsados. Vazio ou acima do limite vira null:
// o campo é recusado, não o título.
export function sanitizeText(text: string | null | undefined, maxLength: number): string | null {
    const clean = text
        ?.normalize("NFC")
        .replace(/[\p{Cc}\p{Cf}]/gu, (c) => (/\s/.test(c) ? " " : ""))
        .replace(/\s+/g, " ")
        .trim();
    return clean && clean.length <= maxLength ? clean : null;
}

// "Corra!" de 2017 → "corra-2017".
export function baseSlug(title: string, year: number | null): string {
    const words = title
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        // cabe com o ano e o sufixo de colisão dentro de MAX_SLUG_LENGTH
        .slice(0, 100)
        .replace(/-+$/, "");
    return [words, year].filter(Boolean).join("-");
}

export const MAX_SLUG_LENGTH = 120;

/** O endereço vem de fora: só o que `baseSlug` gera chega ao banco. */
export const isSlug = (value: string): boolean =>
    value.length <= MAX_SLUG_LENGTH && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value);

// Em colisão: série ganha "-serie"; se ainda colidir (ou for filme), ganha o tmdb_id.
export function uniqueSlug(
    base: string,
    type: TitleType,
    tmdbId: number,
    taken: ReadonlySet<string>,
): string {
    if (base && !taken.has(base)) return base;
    if (type === "series" && base && !taken.has(`${base}-serie`)) return `${base}-serie`;
    return base ? `${base}-${tmdbId}` : String(tmdbId);
}

export type Video = { site: string; type: string; key: string; languageCode: string | null };

export type Trailer = { youtubeKey: string; languageCode: string | null };

// Trailer do YouTube: em português se houver; senão o primeiro no idioma original; senão nenhum.
export function pickTrailer(videos: readonly Video[], originalLanguage: string): Trailer | null {
    const trailers = videos.filter((v) => v.site === "YouTube" && v.type === "Trailer");
    const chosen =
        trailers.find((v) => v.languageCode === "pt") ??
        trailers.find((v) => v.languageCode === originalLanguage);
    return chosen ? { youtubeKey: chosen.key, languageCode: chosen.languageCode } : null;
}

// "1h 44min"; em séries, "55min por episódio".
export function formatRuntime(minutes: number, type: TitleType): string {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    const text = hours ? `${hours}h ${String(rest).padStart(2, "0")}min` : `${rest}min`;
    return type === "series" ? `${text} por episódio` : text;
}
