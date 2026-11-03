import { weightedRating } from "./rounds";

// Conflitos de gênero (US017; docs/plano-fundacao.md, seção 1.10).

const HORROR = 27;
const THRILLER = 53;
const CRIME = 80;
// Só o gênero de filmes: "War & Politics", das séries, traz sátiras como Veep (decisão do dono).
const WAR = 10752;
const FAMILY = 10751;
const ANIMATION = 16;

type GenreRule = { ids: readonly number[]; conflicts: readonly number[] };

// Família, Animação e Terror ainda não têm chip nos filtros; a regra já vale quando tiverem.
const GENRE_RULES = {
    comedy: { ids: [35], conflicts: [HORROR, THRILLER, WAR] },
    romance: { ids: [10749], conflicts: [HORROR, WAR] },
    family: { ids: [FAMILY], conflicts: [HORROR, THRILLER, CRIME] },
    animation: { ids: [ANIMATION], conflicts: [HORROR, THRILLER, CRIME] },
    horror: { ids: [HORROR], conflicts: [FAMILY] },
    suspense: { ids: [THRILLER, 9648], conflicts: [FAMILY] },
    drama: { ids: [18], conflicts: [] },
    action: { ids: [28, 10759], conflicts: [] },
} as const satisfies Record<string, GenreRule>;

export type RequestedGenre = keyof typeof GENRE_RULES;

type Genred = { genreTmdbIds: readonly number[] };

function hasConflict(title: Genred, requested: readonly RequestedGenre[]): boolean {
    const asked = new Set<number>(requested.flatMap((g) => GENRE_RULES[g].ids));
    // basta um gênero pedido sem conflito; o que a pessoa também pediu nunca conta como conflito
    return !requested.some((g) => {
        const rule: GenreRule = GENRE_RULES[g];
        return (
            rule.ids.some((id) => title.genreTmdbIds.includes(id)) &&
            !rule.conflicts.some((id) => !asked.has(id) && title.genreTmdbIds.includes(id))
        );
    });
}

/** Tira os títulos em conflito; se não sobrar nenhum, devolve a lista inteira (US017 C3). */
export function withoutConflicts<T extends Genred>(
    titles: readonly T[],
    requested: readonly RequestedGenre[],
): readonly T[] {
    if (requested.length === 0) return titles;
    const kept = titles.filter((t) => !hasConflict(t, requested));
    return kept.length > 0 ? kept : titles;
}

/** Quanto cada gênero além dos pedidos tira da nota ponderada (US017 RNE002). */
export const EXTRA_GENRE_PENALTY = 0.1;

export function extraGenreCount(title: Genred, requested: readonly RequestedGenre[]): number {
    const asked = new Set<number>(requested.flatMap((g) => GENRE_RULES[g].ids));
    return title.genreTmdbIds.filter((id) => !asked.has(id)).length;
}

type Rankable = Genred & { id: number; rating: number; votes: number };

/** Da maior para a menor nota ajustada; empate vai para mais votos e depois menor id. */
export function rankByPurity<T extends Rankable>(
    titles: readonly T[],
    mean: number,
    requested: readonly RequestedGenre[],
): T[] {
    return titles
        .map((t) => ({
            t,
            score:
                weightedRating(t.rating, t.votes, mean) -
                EXTRA_GENRE_PENALTY * extraGenreCount(t, requested),
        }))
        .sort((a, b) => b.score - a.score || b.t.votes - a.t.votes || a.t.id - b.t.id)
        .map(({ t }) => t);
}
