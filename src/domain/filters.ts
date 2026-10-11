import { meetsQualityFloor, MIN_RATING, type TitleType } from "./catalog";
import { isKinneGenre, KINNE_GENRES, type KinneGenre } from "./genre";
import { isStreaming, STREAMING_SERVICES, streamingTmdbIds, type Streaming } from "./streaming";
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

// Sem o slug: a lista vai inteira ao navegador para o contador, e o slug dobraria o tamanho.
export type FilterCandidate = Omit<SurpriseCandidate, "slug"> & {
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

const TYPES: readonly TypeChoice[] = ["movie", "series", "both"];

const listOf = <T extends string>(value: unknown, max: number, is: (v: string) => v is T) =>
    Array.isArray(value) &&
    value.length <= max &&
    value.every((v) => typeof v === "string" && is(v)) &&
    new Set(value).size === value.length;

/**
 * Filtros vindos de fora (navegador, sessionStorage): só passam no formato e nos limites dos
 * campos (C1). Qualquer coisa fora disso devolve null.
 */
export function parseFilters(value: unknown): Filters | null {
    if (typeof value !== "object" || value === null) return null;
    const { streamings, type, genres, minRating, maxRuntime } = value as Record<string, unknown>;
    const ok =
        listOf(streamings, STREAMING_SERVICES.length, isStreaming) &&
        TYPES.includes(type as TypeChoice) &&
        listOf(genres, KINNE_GENRES.length, isKinneGenre) &&
        typeof minRating === "number" &&
        minRating >= MIN_RATING &&
        minRating <= MAX_RATING &&
        RUNTIME_LIMITS.some((l) => l.minutes === maxRuntime);
    if (!ok) return null;
    return {
        streamings: streamings as Streaming[],
        type: type as TypeChoice,
        genres: genres as KinneGenre[],
        // o slider anda de 0,1 em 0,1; o arredondamento tira o 7,199999… do ponto flutuante
        minRating: Math.round(minRating * 10) / 10,
        maxRuntime: maxRuntime as number | null,
    };
}
