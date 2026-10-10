import type { TitleType } from "./catalog";
import { addDays, type Day } from "./day";
import type { KinneGenre } from "./genre";

// Ordem das indicações na tela inicial (US001).
export const DAILY_PICK_GENRES = [
    "comedy",
    "drama",
    "action",
    "romance",
    "suspense",
] as const satisfies readonly KinneGenre[];

// Um título indicado não volta antes disso (US001 RNE001; valor de partida, ver 04-mudancas).
export const REPEAT_WINDOW_DAYS = 60;

// Piso próprio da vitrine, mais alto que o do catálogo (RNG001): só títulos bem conhecidos.
export const DAILY_MIN_RATING = 7;
export const DAILY_MIN_VOTES = 2000;

export type PickCandidate = {
    id: number;
    type: TitleType;
    genres: readonly KinneGenre[];
    rating: number;
    votes: number;
    onStreaming: boolean;
};

export type PastPick = { day: Day; titleId: number };

export type DailyPick = { genre: KinneGenre; titleId: number };

export type DailyPicksChoice = { picks: DailyPick[]; warnings: string[] };

/**
 * Sorteia um título por gênero, com o dia como semente: mesmo dia e mesmos dados, mesmo
 * resultado, em qualquer ordem de entrada. Sem candidato fora da janela de repetição, o gênero
 * ignora a janela; sem candidato nenhum, o gênero fica de fora. Os dois casos geram um aviso.
 */
export function chooseDailyPicks(
    day: Day,
    candidates: readonly PickCandidate[],
    history: readonly PastPick[],
): DailyPicksChoice {
    const windowStart = addDays(day, -REPEAT_WINDOW_DAYS);
    const recent = new Set(
        history.filter((p) => p.day >= windowStart && p.day < day).map((p) => p.titleId),
    );
    const pool = candidates
        .filter((c) => c.onStreaming && c.rating >= DAILY_MIN_RATING && c.votes >= DAILY_MIN_VOTES)
        .toSorted((a, b) => a.id - b.id);
    const random = seededRandom(day);
    const usedToday = new Set<number>();
    const picks: DailyPick[] = [];
    const warnings: string[] = [];

    for (const genre of DAILY_PICK_GENRES) {
        const fits = pool.filter(
            (c) =>
                c.genres.includes(genre) &&
                (genre !== "romance" || c.type === "movie") &&
                !usedToday.has(c.id),
        );
        if (fits.length === 0) {
            warnings.push(
                `${day}: nenhum título de ${genre} no piso da vitrine; gênero fora do dia`,
            );
            continue;
        }
        let options = fits.filter((c) => !recent.has(c.id));
        if (options.length === 0) {
            warnings.push(
                `${day}: nenhum título de ${genre} fora dos últimos ${REPEAT_WINDOW_DAYS} dias; janela ignorada para esse gênero`,
            );
            options = fits;
        }
        const chosen = options[Math.floor(random() * options.length)];
        usedToday.add(chosen.id);
        picks.push({ genre, titleId: chosen.id });
    }
    return { picks, warnings };
}

// mulberry32 com semente FNV-1a do texto do dia.
function seededRandom(seed: string): () => number {
    let state = 0x811c9dc5;
    for (const char of seed) state = Math.imul(state ^ char.charCodeAt(0), 0x01000193);
    return () => {
        state = (state + 0x6d2b79f5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// US001 RNE003: a tagline; sem ela, a primeira frase da sinopse.
export function pickPhrase(tagline: string | null, synopsis: string | null): string {
    if (tagline?.trim()) return tagline.trim();
    return synopsis?.trim().split(/(?<=[.!?…])\s/)[0] ?? "";
}

// US001 RNE002: 3 s mais 1 s a cada 3 palavras da frase, entre 5 e 10 s.
export function rotationSeconds(phrase: string): number {
    const words = phrase.split(/\s+/).filter(Boolean).length;
    return Math.min(10, Math.max(5, 3 + Math.floor(words / 3)));
}
