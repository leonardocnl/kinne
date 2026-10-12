export type TitleType = "movie" | "series";

// Piso de qualidade: só entra no catálogo quem tem nota e votos suficientes.
export const MIN_RATING = 6.4;
export const MIN_VOTES = 500;

export function meetsQualityFloor(rating: number, votes: number): boolean {
    return rating >= MIN_RATING && votes >= MIN_VOTES;
}

// Tira espaços e caracteres invisíveis de formatação (BOM, zero-width, marcas de direção como o
// U+200E que o TMDB deixa em algumas taglines) do começo e do fim. Texto vazio vira null.
export function cleanText(text: string | null | undefined): string | null {
    return text?.replace(/^[\s\p{Cf}]+|[\s\p{Cf}]+$/gu, "") || null;
}

// "Corra!" de 2017 → "corra-2017".
export function baseSlug(title: string, year: number | null): string {
    const words = title
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
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
