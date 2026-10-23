import { affinities, rankByFeeling, type FeelingKit } from "./feelings";
import { weightedRating } from "./rounds";
import { rankByTaste } from "./taste-graph";

// A ordem dos títulos que passaram nos filtros (US008 RNE002, US009 RNE002 e RNE004). Só
// reordena: quem entra na lista é sempre decidido antes, pelos filtros duros (feelings-and-taste-ui
// A1, A2).

type Orderable = { id: number; rating: number; votes: number };

const qualityOf = (t: Orderable, mean: number) => weightedRating(t.rating, t.votes, mean);

/** Mantém a ordem de `ranked`; o que ficou de fora dela vai para o fim, por nota ponderada. */
function inOrder<T extends Orderable>(
    titles: readonly T[],
    ranked: readonly number[],
    mean: number,
): T[] {
    const byId = new Map(titles.map((t) => [t.id, t]));
    const placed = ranked.flatMap((id) => byId.get(id) ?? []);
    const done = new Set(ranked);
    const rest = titles
        .filter((t) => !done.has(t.id))
        .sort((a, b) => qualityOf(b, mean) - qualityOf(a, mean) || a.id - b.id);
    return [...placed, ...rest];
}

/** Com sentimento e sem sinais de gosto (US008 RNE002): 70% afinidade, 30% nota. */
export function orderByFeeling<T extends Orderable>(
    titles: readonly T[],
    mean: number,
    kit: FeelingKit,
): T[] {
    const candidates = titles.flatMap((t) => {
        const profile = kit.profiles.get(t.id);
        return profile ? [{ ...profile, quality: qualityOf(t, mean) }] : [];
    });
    const ranked = rankByFeeling(kit.feeling, kit.recipe, candidates, kit.themeRarity);
    return inOrder(titles, ranked, mean);
}

/**
 * Com sinais de gosto positivos e sem sentimento (US009 RNE002). Null quando o gosto não alcança
 * nenhum título da lista: quem chama mantém a ordem de hoje.
 */
export function orderByTaste<T extends Orderable>(
    titles: readonly T[],
    mean: number,
    scores: ReadonlyMap<number, number>,
): T[] | null {
    const ranked = rankByTaste(
        scores,
        titles.map((t) => ({ id: t.id, quality: qualityOf(t, mean) })),
    );
    return ranked && inOrder(titles, ranked, mean);
}

/**
 * Gosto com sentimento (US009 RNE004): a ordem do gosto vale entre os títulos que estão na metade
 * de cima da afinidade com o sentimento; os de afinidade mais baixa vão para o fim, também na
 * ordem do gosto. Sem título alcançado pelo gosto, vale a ordem do sentimento.
 */
export function orderByTasteAndFeeling<T extends Orderable>(
    titles: readonly T[],
    mean: number,
    scores: ReadonlyMap<number, number>,
    kit: FeelingKit,
): T[] {
    const affinity = affinities(
        kit,
        titles.map((t) => t.id),
    );
    const sorted = [...titles].sort(
        (a, b) =>
            (affinity.get(b.id) ?? -Infinity) - (affinity.get(a.id) ?? -Infinity) || a.id - b.id,
    );
    const upper = sorted.slice(0, Math.ceil(sorted.length / 2));
    const lower = sorted.slice(upper.length);
    const upperRanked = orderByTaste(upper, mean, scores);
    if (!upperRanked) return orderByFeeling(titles, mean, kit);
    return [...upperRanked, ...(orderByTaste(lower, mean, scores) ?? lower)];
}
