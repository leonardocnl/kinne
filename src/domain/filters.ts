import { meetsQualityFloor, meetsTasteFloor, MIN_RATING, type TitleType } from "./catalog";
import { isFeeling, maskAllows, type Feeling } from "./feelings";
import { isKinneGenre, KINNE_GENRES, type KinneGenre } from "./genre";
import { parsePersonPick, type PersonPick } from "./person-search";
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
    // ator ou diretor escolhido na busca do painel; null é ninguém (fase 3)
    person: PersonPick | null;
    // chip 18+: só com ele os títulos de classificação 18 entram (fase 4)
    adult: boolean;
    // "O que você quer sentir hoje?" (US008); null é nenhum
    feeling: Feeling | null;
};

/**
 * Os filtros como vão ao servidor: da pessoa, só o id (person-search A7). O servidor deriva os
 * títulos dela; o nome e o papel servem só à pílula do painel.
 */
export type FilterCriteria = Omit<Filters, "person"> & { personId: number | null };

export function wireFilters({ person, ...rest }: Filters): FilterCriteria {
    return { ...rest, personId: person?.id ?? null };
}

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
    person: null,
    adult: false,
    feeling: null,
};

// Sem o slug: a lista vai inteira ao navegador para o contador, e o slug dobraria o tamanho.
export type FilterCandidate = Omit<SurpriseCandidate, "slug"> & {
    type: TitleType;
    // quais sentimentos aceitam o título, um bit por sentimento (US008 RNE004)
    feelings: number;
    runtimeMinutes: number | null;
    kinneGenres: readonly KinneGenre[];
};

/** Troca o tipo; com Séries, Romance é desmarcado, porque o TMDB não o tem para séries (C8). */
export function withType(filters: Filters, type: TypeChoice): Filters {
    const genres =
        type === "series" ? filters.genres.filter((g) => g !== "romance") : filters.genres;
    return { ...filters, type, genres };
}

function passesRating(
    c: Pick<FilterCandidate, "id" | "rating" | "votes">,
    minRating: number,
    reached: ReadonlySet<number> | null,
): boolean {
    // o gosto afrouxa o piso, não o slider: quem subiu a nota quer aquela nota
    if (reached?.has(c.id) && minRating <= MIN_RATING) return meetsTasteFloor(c.votes);
    return c.rating >= minRating && meetsQualityFloor(c.rating, c.votes);
}

/**
 * Os títulos que combinam com os filtros (C3), sem os marcados (RNG004). `personTitles` são os
 * títulos da pessoa escolhida; null quando não há pessoa no filtro. Títulos 18 só com o chip 18+
 * (recommendation-rounds). A ordem e as rodadas ficam com buildRounds (rounds.ts).
 *
 * `reached` são os títulos que o gosto da pessoa alcança (US009 RNE003): eles dispensam a nota
 * mínima de 6,4 e só precisam de 100 votos. Se a pessoa subiu o slider, o que ela pediu vale para
 * todos. 18+, streamings, sentimento e marcados valem sempre, e `reached` nunca acrescenta um
 * título: só afrouxa a nota de quem já passou nas demais regras (feelings-and-taste-ui A1, A2).
 */
export function matchTitles<T extends FilterCandidate>(
    candidates: readonly T[],
    filters: Omit<Filters, "person">,
    watched: readonly number[],
    personTitles: ReadonlySet<number> | null = null,
    reached: ReadonlySet<number> | null = null,
): T[] {
    const wanted = streamingTmdbIds(filters.streamings);
    const seen = new Set(watched);
    const limit = filters.type === "movie" ? filters.maxRuntime : null;
    return candidates.filter(
        (c) =>
            (filters.adult || !c.adult) &&
            passesRating(c, filters.minRating, reached) &&
            c.streamingTmdbIds.some((id) => wanted.includes(id)) &&
            (filters.type === "both" || c.type === filters.type) &&
            (filters.feeling === null || maskAllows(c.feelings, filters.feeling)) &&
            (filters.genres.length === 0 ||
                // com Os dois, Romance só traz filmes (C8)
                filters.genres.some(
                    (g) => c.kinneGenres.includes(g) && (g !== "romance" || c.type === "movie"),
                )) &&
            // sem duração conhecida, não dá para garantir o teto
            (limit === null || (c.runtimeMinutes !== null && c.runtimeMinutes <= limit)) &&
            (personTitles === null || personTitles.has(c.id)) &&
            !seen.has(c.id),
    );
}

/**
 * Outra opção vindo dos filtros (US004 C2): sorteia um dos 10 que ainda não foi mostrado. Null
 * quando todos já foram, e a tela passa ao estado de fim (C3).
 */
export function drawUnseen<T extends { id: number }>(
    top: readonly T[],
    seen: readonly number[],
    random: () => number = Math.random,
): T | null {
    const pool = top.filter((t) => !seen.includes(t.id));
    return pool.length > 0 ? pool[Math.floor(random() * pool.length)] : null;
}

export const TYPES: readonly TypeChoice[] = ["movie", "series", "both"];

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
    const { streamings, type, genres, minRating, maxRuntime, person, adult, feeling } =
        value as Record<string, unknown>;
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
        // pessoa ausente ou adulterada vale como ninguém, sem perder os outros campos (A9)
        person: parsePersonPick(person),
        // só true liga o 18+; ausente ou qualquer outra coisa é desligado (recommendation-rounds A5)
        adult: adult === true,
        // sentimento ausente (aba antiga) ou fora da lista vale como nenhum (A4)
        feeling: typeof feeling === "string" && isFeeling(feeling) ? feeling : null,
    };
}
