import { orderByFeeling, orderByTaste, orderByTasteAndFeeling } from "@/domain/draw-order";
import type { FeelingKit } from "@/domain/feelings";
import { matchTitles, type FilterCriteria } from "@/domain/filters";
import { buildRounds, meanRating, rankTitles, type CustomOrder } from "@/domain/rounds";
import { spreadTaste, type NeighborGraph } from "@/domain/taste-graph";
import { hasPositiveSignal, toSignals, type TasteLists } from "@/domain/taste-signals";
import type { Candidate } from "./titles";

// O planejamento das rodadas do "Sortear um título" (US002 C6, US008), sobre os candidatos do
// catálogo que o servidor já tem. Sem banco nem rede: quem chama carrega o que precisa.

export type FilteredDrawInput = {
    candidates: readonly Candidate[];
    // os títulos da pessoa escolhida; null quando não há pessoa no filtro (person-search A7)
    person: ReadonlySet<number> | null;
    // o sentimento pronto para ordenar; null se não carregou (vale a nota ponderada)
    feeling: FeelingKit | null;
    // o grafo de vizinhos; null se não carregou (US009 RNE006)
    graph: NeighborGraph | null;
};

export type FilteredPlan = { matching: Candidate[]; rounds: Candidate[][] };

/**
 * Os títulos que passam nos filtros e as rodadas de 10 em que eles se dividem.
 *
 * O gosto (US009) vem depois dos filtros duros: a pontuação só reordena a lista e afrouxa a nota
 * de quem já passou em tudo o mais (matchTitles, `reached`). Sem sinal positivo, ou sem grafo,
 * nada muda em relação a hoje (C1, RNE006).
 */
export function planFilteredRounds(
    { candidates, person, feeling, graph }: FilteredDrawInput,
    filters: Omit<FilterCriteria, "personId">,
    watched: readonly number[],
    taste: TasteLists,
): FilteredPlan {
    const scores = graph && hasPositiveSignal(taste) ? spreadTaste(graph, toSignals(taste)) : null;
    const reached = scores
        ? new Set([...scores].filter(([, score]) => score > 0).map(([id]) => id))
        : null;
    const matching = matchTitles(candidates, filters, watched, person, reached);
    const mean = meanRating(candidates);

    let order: CustomOrder<Candidate> | undefined;
    if (filters.feeling !== null) {
        // US008 RNE003: com sentimento, sem as cotas por gênero
        const ranked = !feeling
            ? (scores && orderByTaste(matching, mean, scores)) || rankTitles(matching, mean)
            : scores
              ? orderByTasteAndFeeling(matching, mean, scores, feeling)
              : orderByFeeling(matching, mean, feeling);
        order = { ranked, plain: true };
    } else if (scores) {
        // US009 RNE005: as cotas por gênero seguem, e dentro de cada gênero vale o gosto
        const ranked = orderByTaste(matching, mean, scores);
        if (ranked) order = { ranked, plain: false };
    }
    return { matching, rounds: buildRounds(matching, filters, mean, order) };
}
