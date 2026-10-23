import { orderByFeeling } from "@/domain/draw-order";
import type { FeelingKit } from "@/domain/feelings";
import { matchTitles, type FilterCriteria } from "@/domain/filters";
import { buildRounds, meanRating, rankTitles, type CustomOrder } from "@/domain/rounds";
import type { Candidate } from "./titles";

// O planejamento das rodadas do "Sortear um título" (US002 C6, US008), sobre os candidatos do
// catálogo que o servidor já tem. Sem banco nem rede: quem chama carrega o que precisa.

export type FilteredDrawInput = {
    candidates: readonly Candidate[];
    // os títulos da pessoa escolhida; null quando não há pessoa no filtro (person-search A7)
    person: ReadonlySet<number> | null;
    // o sentimento pronto para ordenar; null se não carregou (vale a nota ponderada)
    feeling: FeelingKit | null;
};

export type FilteredPlan = { matching: Candidate[]; rounds: Candidate[][] };

/** Os títulos que passam nos filtros e as rodadas de 10 em que eles se dividem. */
export function planFilteredRounds(
    { candidates, person, feeling }: FilteredDrawInput,
    filters: Omit<FilterCriteria, "personId">,
    watched: readonly number[],
): FilteredPlan {
    const matching = matchTitles(candidates, filters, watched, person);
    const mean = meanRating(candidates);

    let order: CustomOrder<Candidate> | undefined;
    if (filters.feeling !== null) {
        // US008 RNE003: com sentimento, sem as cotas por gênero
        order = {
            ranked: feeling ? orderByFeeling(matching, mean, feeling) : rankTitles(matching, mean),
            plain: true,
        };
    }
    return { matching, rounds: buildRounds(matching, filters, mean, order) };
}
