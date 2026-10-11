"use server";

import { filterTitles, type FilterCandidate } from "@/domain/filters";
import { candidates } from "../_data/candidates";
import { parseFilterRequest } from "../_data/filters";

/** Os títulos para o contador dos filtros (US002 C3), que conta no navegador, sem o slug. */
export async function filterCandidates(): Promise<FilterCandidate[]> {
    return (await candidates()).map((c) => ({
        id: c.id,
        type: c.type,
        rating: c.rating,
        votes: c.votes,
        runtimeMinutes: c.runtimeMinutes,
        kinneGenres: c.kinneGenres,
        streamingTmdbIds: c.streamingTmdbIds,
    }));
}

/**
 * Ver recomendação (US002 C6): sorteia entre os 10 de maior nota que combinam (RNE003) e devolve
 * o slug, ou null se nenhum combina.
 */
export async function drawFiltered(input: unknown): Promise<string | null> {
    const { filters, watched } = parseFilterRequest(input);
    const { top } = filterTitles(await candidates(), filters, watched);
    return top[Math.floor(Math.random() * top.length)]?.slug ?? null;
}
