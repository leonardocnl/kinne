"use server";

import "server-only";
import { planFilteredRounds } from "@/application/filtered-draw";
import { drawUnseen, type FilterCandidate } from "@/domain/filters";
import { roundEnd, type RoundEnd } from "@/domain/rounds";
import { hasPositiveSignal } from "@/domain/taste-signals";
import { candidates } from "../_data/candidates";
import { loadFeelingKit } from "../_data/feelings";
import { neighborGraphOrNull } from "../_data/taste-graph";
import { parseFilterRequest } from "../_data/filters";
import { personTitleIds } from "../_data/people";
import { admitPersonQuery } from "../_data/person-limit";

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
        adult: c.adult,
        feelings: c.feelings,
    }));
}

export type FilteredDraw = { slug: string | null; end: RoundEnd };

/**
 * "Sortear um título" (US002 C6) e Outra opção vindo dos filtros (US004 C2): sorteia na rodada
 * pedida, sem os já mostrados. As rodadas de 10 seguem a nota ponderada e, sem gênero, as cotas por
 * gênero (rounds.ts). Devolve o slug, ou null quando a rodada acabou, e o que o estado de fim mostra
 * (US004 C3): a rodada seguinte ou que não sobrou nenhuma.
 */
export async function drawFiltered(input: unknown): Promise<FilteredDraw> {
    const { filters, watched, seen, taste, round } = parseFilterRequest(input);
    // person-search B4: com pessoa, o sorteio consulta o banco e entra no mesmo limite
    if (filters.personId !== null && !(await admitPersonQuery())) {
        throw new Error("Pedido recusado");
    }
    // person-search A7, D1: os títulos da pessoa vêm do servidor, nunca do navegador
    const person =
        filters.personId === null ? null : new Set(await personTitleIds(filters.personId));
    const all = await candidates();
    // a ordem do sentimento só carrega quando há sentimento (US008 RNE002)
    const feeling = filters.feeling === null ? null : await loadFeelingKit(filters.feeling);
    // o grafo só carrega quando há sinal positivo; personalizado, nunca vai para cache (B2)
    const graph = hasPositiveSignal(taste) ? await neighborGraphOrNull() : null;
    const { matching, rounds } = planFilteredRounds(
        { candidates: all, person, feeling, graph },
        filters,
        watched,
        taste,
    );
    const pick = drawUnseen(rounds[round] ?? [], seen);
    return { slug: pick?.slug ?? null, end: roundEnd(rounds, round, matching.length) };
}
