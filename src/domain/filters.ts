import { meetsQualityFloor, MIN_RATING, type TitleType } from "./catalog";
import type { KinneGenre } from "./genre";
import { streamingTmdbIds, type Streaming } from "./streaming";
import type { SurpriseCandidate } from "./surprise";

// Escolher agora (US002).

export type TypeChoice = TitleType | "both";

export type Filters = {
    // nenhum marcado vale como todos (RNG003)
    streamings: Streaming[];
    type: TypeChoice;
    genres: KinneGenre[];
    minRating: number;
    // teto em minutos; null é "Qualquer". Só vale com Filmes (C2)
    maxRuntime: number | null;
};

// O slider começa no piso: o catálogo não tem títulos abaixo dele (RNE002).
export const MAX_RATING = 9;

// As posições do slider de duração, na ordem (RNE004).
export const RUNTIME_LIMITS = [
    { minutes: 90, label: "até 1h30" },
    { minutes: 105, label: "até 1h45" },
    { minutes: 120, label: "até 2h" },
    { minutes: null, label: "Qualquer" },
] as const;

export const DEFAULT_FILTERS: Filters = {
    streamings: [],
    type: "both",
    genres: [],
    minRating: MIN_RATING,
    maxRuntime: null,
};

// Quantos títulos entram no sorteio (RNE003).
export const DRAWABLE = 10;

export type FilterCandidate = SurpriseCandidate & {
    type: TitleType;
    runtimeMinutes: number | null;
    kinneGenres: readonly KinneGenre[];
};

/** Troca o tipo; com Séries, Romance é desmarcado, porque o TMDB não o tem para séries (C8). */
export function withType(filters: Filters, type: TypeChoice): Filters {
    const genres =
        type === "series" ? filters.genres.filter((g) => g !== "romance") : filters.genres;
    return { ...filters, type, genres };
}

/**
 * Quantos títulos combinam (C3) e os 10 de maior nota entre eles (RNE003): empate vai para mais
 * votos e depois para o menor id, para os 10 serem sempre os mesmos.
 */
export function filterTitles<T extends FilterCandidate>(
    candidates: readonly T[],
    filters: Filters,
    watched: readonly number[],
): { count: number; top: T[] } {
    const wanted = streamingTmdbIds(filters.streamings);
    const seen = new Set(watched);
    const limit = filters.type === "movie" ? filters.maxRuntime : null;
    const matching = candidates.filter(
        (c) =>
            c.rating >= filters.minRating &&
            meetsQualityFloor(c.rating, c.votes) &&
            c.streamingTmdbIds.some((id) => wanted.includes(id)) &&
            (filters.type === "both" || c.type === filters.type) &&
            (filters.genres.length === 0 ||
                // com Os dois, Romance só traz filmes (C8)
                filters.genres.some(
                    (g) => c.kinneGenres.includes(g) && (g !== "romance" || c.type === "movie"),
                )) &&
            // sem duração conhecida, não dá para garantir o teto
            (limit === null || (c.runtimeMinutes !== null && c.runtimeMinutes <= limit)) &&
            !seen.has(c.id),
    );
    const top = matching
        .toSorted((a, b) => b.rating - a.rating || b.votes - a.votes || a.id - b.id)
        .slice(0, DRAWABLE);
    return { count: matching.length, top };
}
