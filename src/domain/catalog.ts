export type TitleType = "movie" | "series";

// Piso de qualidade: só entra no catálogo quem tem nota e votos suficientes.
export const MIN_RATING = 6.4;
export const MIN_VOTES = 500;

export function meetsQualityFloor(rating: number, votes: number): boolean {
    return rating >= MIN_RATING && votes >= MIN_VOTES;
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
