import { meetsQualityFloor } from "./catalog";
import { streamingTmdbIds, type Streaming } from "./streaming";

// US003 RNE001: piso mais alto que o do catálogo (valor de partida, ver 04-mudancas).
export const SURPRISE_MIN_RATING = 7.5;

// Teto de cada lista de ids do pedido (marcados, já mostrados); o navegador manda os mais recentes.
export const SURPRISE_MAX_EXCLUDED = 1000;

export type SurpriseCandidate = {
    id: number;
    slug: string;
    rating: number;
    votes: number;
    streamingTmdbIds: readonly number[];
    // classificação 18: a surpresa nunca os sorteia (recommendation-rounds A2)
    adult: boolean;
};

export type SurpriseRequest = {
    // streamings salvos no navegador; nenhum vale como todos (RNG003)
    streamings: readonly Streaming[];
    // marcados como "Já vi": nunca voltam (RNG004)
    watched: readonly number[];
    // já mostrados nesta sessão: só voltam quando não sobra mais nada (US003 C3)
    shown: readonly number[];
};

/** Sorteio simples (US003 RNE003), sem filtros de gênero, tipo ou duração (RNE002). */
export function drawSurprise(
    candidates: readonly SurpriseCandidate[],
    request: SurpriseRequest,
    random: () => number = Math.random,
): SurpriseCandidate | null {
    const wanted = streamingTmdbIds(request.streamings);
    const watched = new Set(request.watched);
    const shown = new Set(request.shown);
    const eligible = candidates.filter(
        (c) =>
            !c.adult &&
            c.rating >= SURPRISE_MIN_RATING &&
            meetsQualityFloor(c.rating, c.votes) &&
            c.streamingTmdbIds.some((id) => wanted.includes(id)) &&
            !watched.has(c.id),
    );
    const fresh = eligible.filter((c) => !shown.has(c.id));
    // se a sessão já mostrou todos, repetir é melhor que não mostrar nada
    const pool = fresh.length > 0 ? fresh : eligible;
    return pool.length > 0 ? pool[Math.floor(random() * pool.length)] : null;
}
