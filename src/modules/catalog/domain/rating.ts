import { MIN_VOTES } from "./catalog";

/**
 * m da nota ponderada: os votos que um título precisa para a própria nota pesar tanto quanto a
 * média do catálogo. É o mínimo de votos do piso (RNG001): no piso, metade de cada.
 */
export const WEIGHT_VOTES = MIN_VOTES;

export type Ranked = { id: number; rating: number; votes: number };

/** Nota ponderada no estilo do IMDb: WR = v/(v+m) · R + m/(v+m) · C. */
export function weightedRating(rating: number, votes: number, mean: number, m = WEIGHT_VOTES) {
    return (votes / (votes + m)) * rating + (m / (votes + m)) * mean;
}

/** C da nota ponderada: a média das notas da lista de candidatos (o catálogo recomendável). */
export function meanRating(titles: readonly { rating: number }[]): number {
    if (titles.length === 0) return 0;
    return titles.reduce((sum, t) => sum + t.rating, 0) / titles.length;
}

/** Do melhor para o pior pela nota ponderada; empate vai para mais votos e depois menor id (D1). */
export function rankTitles<T extends Ranked>(titles: readonly T[], mean: number): T[] {
    // a nota de cada um é calculada uma vez, fora da comparação (B1)
    return titles
        .map((t) => ({ t, score: weightedRating(t.rating, t.votes, mean) }))
        .sort((a, b) => b.score - a.score || b.t.votes - a.t.votes || a.t.id - b.t.id)
        .map(({ t }) => t);
}
