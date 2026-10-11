"use server";

import { drawUnseen, filterTitles, type FilterCandidate } from "@/domain/filters";
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
 * Ver recomendação (US002 C6) e Outra opção vindo dos filtros (US004 C2): sorteia entre os 10 de
 * maior nota que combinam (RNE003), sem os já mostrados. Devolve o slug, ou null quando não sobrou
 * nenhum, e quantos são os 10 (menos, se poucos combinam) para o estado de fim (US004 C3).
 */
export async function drawFiltered(
    input: unknown,
): Promise<{ slug: string | null; total: number }> {
    const { filters, watched, seen } = parseFilterRequest(input);
    const { top } = filterTitles(await candidates(), filters, watched);
    return { slug: drawUnseen(top, seen)?.slug ?? null, total: top.length };
}
