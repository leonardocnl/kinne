import { MIN_VOTES } from "./catalog";
import type { TypeChoice } from "./filters";
import { KINNE_GENRES, type KinneGenre } from "./genre";

// Rodadas da recomendação pelos filtros (fase 4; threat model docs/threats/recommendation-rounds.md).

// Tamanho de cada rodada (US002 RNE003).
export const ROUND_SIZE = 10;
// A3: maior rodada aceita; com ~9 mil títulos, 900 rodadas bastam.
export const MAX_ROUND = 999;

/**
 * m da nota ponderada: os votos que um título precisa para a própria nota pesar tanto quanto a
 * média do catálogo. É o mínimo de votos do piso (RNG001): no piso, metade de cada.
 */
export const WEIGHT_VOTES = MIN_VOTES;

type Ranked = { id: number; rating: number; votes: number };

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

/**
 * Quantos títulos de cada gênero entram numa rodada sem gênero escolhido (D11): 2 de cada um dos
 * cinco; com Séries, sem Romance (RNG007), 3/3/2/2 na ordem dos gêneros (Ação, Comédia, Drama,
 * Suspense).
 */
export function genreQuotas(type: TypeChoice): [KinneGenre, number][] {
    if (type !== "series") return KINNE_GENRES.map((g) => [g, 2]);
    const genres = KINNE_GENRES.filter((g) => g !== "romance");
    return genres.map((g, i) => [g, i < 2 ? 3 : 2]);
}

type Title = Ranked & { type: "movie" | "series"; kinneGenres: readonly KinneGenre[] };

/**
 * As rodadas de 10, na ordem, para os títulos que combinam com os filtros. Com gênero escolhido,
 * os 10 melhores, os 10 seguintes e assim por diante. Sem gênero, cada rodada pega os melhores de
 * cada gênero pelas cotas e completa com os melhores que sobraram, para só a última ser menor.
 * Cada título entra numa rodada só (D2), e a mesma entrada dá sempre as mesmas rodadas (D1).
 */
export function buildRounds<T extends Title>(
    matching: readonly T[],
    filters: { genres: readonly KinneGenre[]; type: TypeChoice },
    mean: number,
): T[][] {
    const ranked = rankTitles(matching, mean);
    const rounds: T[][] = [];
    if (filters.genres.length > 0) {
        for (let i = 0; i < ranked.length; i += ROUND_SIZE) {
            rounds.push(ranked.slice(i, i + ROUND_SIZE));
        }
        return rounds;
    }

    const quotas = genreQuotas(filters.type);
    // Romance só traz filmes (RNG007)
    const lists = quotas.map(([g]) =>
        ranked.filter((t) => t.kinneGenres.includes(g) && (g !== "romance" || t.type === "movie")),
    );
    const cursors = lists.map(() => 0);
    const placed = new Set<number>();
    let rest = 0;
    while (placed.size < ranked.length) {
        const round: T[] = [];
        const take = (t: T) => {
            placed.add(t.id);
            round.push(t);
        };
        quotas.forEach(([, quota], i) => {
            const list = lists[i];
            let taken = 0;
            while (taken < quota && cursors[i] < list.length) {
                const t = list[cursors[i]++];
                if (!placed.has(t.id)) {
                    take(t);
                    taken++;
                }
            }
        });
        // o que faltou para 10 (gênero que acabou, título sem gênero do Kinne) vem dos melhores
        while (round.length < ROUND_SIZE && rest < ranked.length) {
            const t = ranked[rest++];
            if (!placed.has(t.id)) take(t);
        }
        rounds.push(round);
    }
    return rounds;
}

/** O que a tela mostra quando a rodada acaba (C3). */
export type RoundEnd =
    // há uma rodada seguinte, com `size` títulos
    | { kind: "next"; round: number; size: number }
    // não sobrou nenhuma: `total` é quantos títulos combinam
    | { kind: "done"; total: number };

export function roundEnd(rounds: readonly unknown[][], round: number, total: number): RoundEnd {
    const size = rounds[round + 1]?.length ?? 0;
    return size > 0 ? { kind: "next", round, size } : { kind: "done", total };
}

export function roundEndHeading(end: RoundEnd): string {
    if (end.kind === "next") {
        return end.round === 0
            ? `Você viu as ${ROUND_SIZE} melhores para esses filtros`
            : `Você viu mais ${ROUND_SIZE} para esses filtros`;
    }
    if (end.total === 0) return "Nenhum título combina mais com esses filtros";
    if (end.total === 1) return "Você viu o único título para esses filtros";
    return `Você viu todos os ${end.total} títulos`;
}

/** O botão que passa à rodada seguinte: "os próximos 10" ou, na última e menor, "os últimos N". */
export function nextRoundLabel(size: number): string {
    if (size >= ROUND_SIZE) return `Sortear entre os próximos ${ROUND_SIZE}`;
    if (size === 1) return "Sortear o último";
    return `Sortear entre os últimos ${size}`;
}
