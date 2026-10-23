// Grafo de gosto do Kinne (docs/design/taste-graph.md): cada vértice é um título recomendável
// (TitleProfile) e cada aresta é a proximidade entre dois títulos. Cada título guarda só os seus
// vizinhos mais próximos. O gosto invisível e a sala de grupo andam por essas arestas; os
// sentimentos não (feelings.ts).
//
// Funções puras: recebem os dados já carregados e devolvem números. Nada de banco nem rede.

import type { TitleType } from "./catalog";

/** O vértice: o que importa de um título para "quem gostou deste gosta daquele?" (§3). */
export type TitleProfile = {
    id: number;
    type: TitleType;
    themeIds: readonly number[];
    genreIds: readonly number[];
    // direção (filmes e séries) e criação (séries) contam juntas como "autoria" (§4.1)
    authorIds: readonly number[];
    writerIds: readonly number[];
    companyIds: readonly number[];
    seriesType: string | null;
    collectionId: number | null;
    // recomendações do TMDB já resolvidas para ids do catálogo, na ordem do TMDB
    recommendedIds: readonly number[];
};

// ---------------------------------------------------------------------------------------------
// Raridade (§4.1): característica presente em poucos títulos aproxima muito; em muitos, pouco.

type FeatureKind = "theme" | "author" | "writer" | "company";

// Temas em mais que esta fração do catálogo são metadado, não assunto ("woman director").
export const THEME_HUB_FRACTION = 0.05;
// Uma característica de um título só não liga nada a nada.
const MIN_FEATURE_TITLES = 2;

export type FeatureRarity = {
    readonly titleCount: number;
    /** Peso de raridade (IDF) de uma característica; 0 se ela não liga títulos ou é hub. */
    weight(kind: FeatureKind, id: number): number;
};

const featuresOf = (p: TitleProfile, kind: FeatureKind): readonly number[] =>
    kind === "theme"
        ? p.themeIds
        : kind === "author"
          ? p.authorIds
          : kind === "writer"
            ? p.writerIds
            : p.companyIds;

const KINDS: readonly FeatureKind[] = ["theme", "author", "writer", "company"];

export function featureRarity(profiles: readonly TitleProfile[]): FeatureRarity {
    const counts = new Map<string, number>();
    for (const p of profiles) {
        for (const kind of KINDS) {
            for (const id of new Set(featuresOf(p, kind))) {
                const key = `${kind}:${id}`;
                counts.set(key, (counts.get(key) ?? 0) + 1);
            }
        }
    }
    const n = Math.max(profiles.length, 1);
    const hubLimit = Math.max(MIN_FEATURE_TITLES, Math.floor(n * THEME_HUB_FRACTION));
    return {
        titleCount: n,
        weight(kind, id) {
            const count = counts.get(`${kind}:${id}`) ?? 0;
            if (count < MIN_FEATURE_TITLES) return 0;
            if (kind === "theme" && count > hubLimit) return 0;
            return Math.log(n / count);
        },
    };
}

// ---------------------------------------------------------------------------------------------
// A aresta (§4).

export const CONTENT_WEIGHTS = {
    themes: 0.45,
    genres: 0.15,
    authors: 0.2,
    writers: 0.1,
    companies: 0.05,
    seriesType: 0.05,
} as const;

export const CONTENT_SHARE = 0.77;
export const RECOMMENDATION_SHARE = 0.23;
export const RECOMMENDATION_POSITIONS = 20;

/** Cosseno entre dois conjuntos, cada elemento valendo o quadrado da sua raridade. */
function rarityCosine(
    a: readonly number[],
    b: readonly number[],
    weight: (id: number) => number,
): number {
    if (a.length === 0 || b.length === 0) return 0;
    const setB = new Set(b);
    let shared = 0;
    let normA = 0;
    let normB = 0;
    for (const id of new Set(a)) {
        const w = weight(id) ** 2;
        normA += w;
        if (setB.has(id)) shared += w;
    }
    for (const id of setB) normB += weight(id) ** 2;
    return normA > 0 && normB > 0 ? shared / Math.sqrt(normA * normB) : 0;
}

function jaccard(a: readonly number[], b: readonly number[]): number {
    const setA = new Set(a);
    const setB = new Set(b);
    if (setA.size === 0 || setB.size === 0) return 0;
    let shared = 0;
    for (const id of setA) if (setB.has(id)) shared++;
    return shared / (setA.size + setB.size - shared);
}

/** Dados da obra (§4.1): de 0 a 1. Mesma franquia vale 1. */
export function contentScore(a: TitleProfile, b: TitleProfile, rarity: FeatureRarity): number {
    if (a.collectionId !== null && a.collectionId === b.collectionId) return 1;
    const w = CONTENT_WEIGHTS;
    const cos = (kind: FeatureKind) =>
        rarityCosine(featuresOf(a, kind), featuresOf(b, kind), (id) => rarity.weight(kind, id));
    const sameSeriesType = a.seriesType !== null && a.seriesType === b.seriesType ? 1 : 0;
    return (
        w.themes * cos("theme") +
        w.genres * jaccard(a.genreIds, b.genreIds) +
        w.authors * cos("author") +
        w.writers * cos("writer") +
        w.companies * cos("company") +
        w.seriesType * sameSeriesType
    );
}

const positionValue = (position: number) =>
    position < 1 ? 0 : Math.max(0, 1 - (position - 1) / RECOMMENDATION_POSITIONS);

/** Recomendação do TMDB (§4.2): de 0 a 1, mais forte quando vale nos dois sentidos. */
export function recommendationScore(a: TitleProfile, b: TitleProfile): number {
    const ab = positionValue(a.recommendedIds.indexOf(b.id) + 1);
    const ba = positionValue(b.recommendedIds.indexOf(a.id) + 1);
    return Math.min(1, Math.max(ab, ba) + 0.5 * Math.min(ab, ba));
}

export type Proximity = { proximity: number; content: number; recommendation: number };

export function proximity(a: TitleProfile, b: TitleProfile, rarity: FeatureRarity): Proximity {
    const content = contentScore(a, b, rarity);
    const recommendation = recommendationScore(a, b);
    return {
        proximity: CONTENT_SHARE * content + RECOMMENDATION_SHARE * recommendation,
        content,
        recommendation,
    };
}

// ---------------------------------------------------------------------------------------------
// O grafo de vizinhos mais próximos (§2).

export const NEIGHBORS_PER_TITLE = 20;

// Sem nada em comum na obra, não há aresta, nem com recomendação do TMDB. A 2ª calibração
// (2026-10-23) mostrou Off Campus (comédia romântica) no gosto de quem curtiu Chernobyl e One
// Piece no de quem curtiu Invocação do Mal: o TMDB às vezes recomenda por popularidade pura.
// 0,05 é o mínimo de "algo em comum": um gênero em três já passa.
export const MIN_CONTENT_SCORE = 0.05;

export type Edge = Proximity & { a: number; b: number };

/**
 * Os k vizinhos mais próximos de cada título, unidos num grafo não direcionado: se B está entre
 * os k de A, a aresta A–B existe. Devolve cada aresta uma vez, com a < b.
 *
 * Só compara pares que têm algo raro em comum (tema, autoria, roteiro, produtora, franquia ou
 * recomendação), por um índice invertido: comparar todos com todos seria quadrático e quase
 * todos os pares dariam perto de zero.
 */
export function buildNeighborEdges(
    profiles: readonly TitleProfile[],
    k = NEIGHBORS_PER_TITLE,
): Edge[] {
    const rarity = featureRarity(profiles);
    const byId = new Map(profiles.map((p) => [p.id, p]));

    const index = new Map<string, number[]>();
    const post = (key: string, id: number) => {
        const list = index.get(key);
        if (list) list.push(id);
        else index.set(key, [id]);
    };
    for (const p of profiles) {
        for (const kind of KINDS) {
            for (const f of new Set(featuresOf(p, kind))) {
                if (rarity.weight(kind, f) > 0) post(`${kind}:${f}`, p.id);
            }
        }
        if (p.collectionId !== null) post(`collection:${p.collectionId}`, p.id);
    }

    const keysOf = (p: TitleProfile) => {
        const keys: string[] = [];
        for (const kind of KINDS) {
            for (const f of new Set(featuresOf(p, kind))) keys.push(`${kind}:${f}`);
        }
        if (p.collectionId !== null) keys.push(`collection:${p.collectionId}`);
        return keys;
    };

    const edges = new Map<string, Edge>();
    for (const p of profiles) {
        const candidates = new Set<number>();
        for (const key of keysOf(p)) for (const id of index.get(key) ?? []) candidates.add(id);
        // as recomendações de p entram mesmo sem nada em comum; as que apontam para p entram
        // quando o outro título é processado
        for (const id of p.recommendedIds) if (byId.has(id)) candidates.add(id);
        candidates.delete(p.id);

        const scored: Edge[] = [];
        for (const id of candidates) {
            const other = byId.get(id)!;
            const score = proximity(p, other, rarity);
            if (score.content >= MIN_CONTENT_SCORE) scored.push({ a: p.id, b: id, ...score });
        }
        scored.sort((x, y) => y.proximity - x.proximity || x.b - y.b);
        for (const edge of scored.slice(0, k)) {
            const [a, b] = edge.a < edge.b ? [edge.a, edge.b] : [edge.b, edge.a];
            edges.set(`${a}:${b}`, { ...edge, a, b });
        }
    }

    return [...edges.values()].sort((x, y) => x.a - y.a || x.b - y.b);
}

/** Lista de adjacência a partir das arestas, nos dois sentidos. */
export type NeighborGraph = ReadonlyMap<number, readonly { id: number; proximity: number }[]>;

export function toNeighborGraph(
    edges: readonly { a: number; b: number; proximity: number }[],
): NeighborGraph {
    const graph = new Map<number, { id: number; proximity: number }[]>();
    const add = (from: number, id: number, p: number) => {
        const list = graph.get(from);
        if (list) list.push({ id, proximity: p });
        else graph.set(from, [{ id, proximity: p }]);
    };
    for (const e of edges) {
        add(e.a, e.b, e.proximity);
        add(e.b, e.a, e.proximity);
    }
    return graph;
}

// ---------------------------------------------------------------------------------------------
// Gosto invisível (§6).

export type TasteSignal = "liked" | "will_watch" | "disliked" | "not_interested";

export const SIGNAL_WEIGHTS: Record<TasteSignal, number> = {
    liked: 1,
    will_watch: 0.6,
    disliked: -1,
    not_interested: -0.4,
};

// Quanto vale cada passo: vizinho, vizinho do vizinho, terceiro elo.
export const STEP_DAMPING = [1, 0.35, 0.12] as const;

/**
 * Espalha os sinais da pessoa pelo grafo em três passos. A cada passo, a massa vai de um título a
 * um vizinho em proporção à proximidade, dividida pela raiz da força (soma das proximidades) dos
 * dois lados:
 *
 * - do lado de quem passa, para a massa não crescer a cada passo (um título com 40 vizinhos não
 *   pode mandar 40 vezes mais adiante);
 * - do lado de quem recebe, para os títulos "no meio de tudo" não acumularem massa só por serem
 *   vizinhos de muita coisa. A 1ª calibração do grafo (2026-10-23) mostrou Batman e Vingadores
 *   no gosto de quem curtiu Invocação do Mal: o TMDB recomenda títulos populares para quase
 *   tudo, e eles viravam ímãs no 2º e no 3º passo.
 *
 * Os títulos com sinal ficam de fora do resultado: o Kinne não indica o que a pessoa já marcou.
 */
export function spreadTaste(
    graph: NeighborGraph,
    signals: readonly { titleId: number; signal: TasteSignal }[],
): Map<number, number> {
    let frontier = new Map<number, number>();
    for (const { titleId, signal } of signals) {
        frontier.set(titleId, (frontier.get(titleId) ?? 0) + SIGNAL_WEIGHTS[signal]);
    }
    const marked = new Set(frontier.keys());
    const scores = new Map<number, number>();

    const strengthCache = new Map<number, number>();
    const strength = (id: number) => {
        let value = strengthCache.get(id);
        if (value === undefined) {
            value = (graph.get(id) ?? []).reduce((sum, n) => sum + n.proximity, 0);
            strengthCache.set(id, value);
        }
        return value;
    };

    for (const damping of STEP_DAMPING) {
        const next = new Map<number, number>();
        for (const [id, mass] of frontier) {
            const neighbors = graph.get(id);
            if (!neighbors || mass === 0) continue;
            const from = Math.sqrt(strength(id));
            for (const n of neighbors) {
                const share = (mass * n.proximity) / (from * Math.sqrt(strength(n.id)));
                next.set(n.id, (next.get(n.id) ?? 0) + share);
            }
        }
        for (const [id, mass] of next) {
            if (!marked.has(id)) scores.set(id, (scores.get(id) ?? 0) + damping * mass);
        }
        frontier = next;
    }
    return scores;
}

export type TastePath = { ids: number[]; strength: number };

/**
 * O caminho mais forte (produto das proximidades vezes o amortecimento) de um título com sinal
 * positivo até o alvo, com até três arestas. Serve para explicar uma indicação: na calibração
 * hoje, e um dia, se for o caso, na tela.
 */
export function strongestPath(
    graph: NeighborGraph,
    likedIds: readonly number[],
    target: number,
): TastePath | null {
    let best: TastePath | null = null;
    const walk = (path: number[], product: number) => {
        const step = path.length - 1;
        const here = path[path.length - 1];
        if (step > 0 && here === target) {
            const strength = product * STEP_DAMPING[step - 1];
            if (!best || strength > best.strength) best = { ids: [...path], strength };
            return;
        }
        if (step === STEP_DAMPING.length) return;
        for (const n of graph.get(here) ?? []) {
            if (!path.includes(n.id)) walk([...path, n.id], product * n.proximity);
        }
    };
    for (const id of likedIds) walk([id], 1);
    return best;
}

/** Percentis de 0 a 1 (empates recebem o mesmo percentil), para comparar escalas diferentes. */
export function toPercentiles(scores: ReadonlyMap<number, number>): Map<number, number> {
    const sorted = [...scores].sort((x, y) => x[1] - y[1]);
    const result = new Map<number, number>();
    const last = Math.max(sorted.length - 1, 1);
    let i = 0;
    while (i < sorted.length) {
        let j = i;
        while (j + 1 < sorted.length && sorted[j + 1][1] === sorted[i][1]) j++;
        const value = sorted.length === 1 ? 1 : (i + j) / 2 / last;
        for (let t = i; t <= j; t++) result.set(sorted[t][0], value);
        i = j + 1;
    }
    return result;
}

export const TASTE_SHARE = 0.8;

export type RankCandidate = { id: number; quality: number };

/**
 * Ordem final do gosto (§6): 80% gosto + 20% percentil da nota ponderada, entre os candidatos que
 * os filtros deixaram. O gosto entra dividido pela maior pontuação em módulo (fica entre −1 e 1),
 * e não em percentil: o percentil apagava a diferença entre o vizinho direto e o título alcançado
 * por acaso no 3º passo, e a nota decidia sozinha (1ª calibração do grafo: Invocação do Mal 4,
 * da mesma franquia, ficava fora dos 30 de quem curtiu Invocação do Mal).
 *
 * Um candidato sem pontuação vale 0, neutro. Sem nenhuma pontuação, devolve null e quem chama
 * mantém a ordem de hoje.
 */
export function rankByTaste(
    scores: ReadonlyMap<number, number>,
    candidates: readonly RankCandidate[],
): number[] | null {
    if (scores.size === 0) return null;
    let peak = 0;
    for (const c of candidates) peak = Math.max(peak, Math.abs(scores.get(c.id) ?? 0));
    if (peak === 0) return null;
    const quality = toPercentiles(new Map(candidates.map((c) => [c.id, c.quality])));
    return candidates
        .map((c) => ({
            id: c.id,
            score:
                (TASTE_SHARE * (scores.get(c.id) ?? 0)) / peak +
                (1 - TASTE_SHARE) * quality.get(c.id)!,
        }))
        .sort((x, y) => y.score - x.score || x.id - y.id)
        .map((c) => c.id);
}

// ---------------------------------------------------------------------------------------------
// Sala de grupo (§7).

/**
 * Para cada candidato, o percentil do membro menos satisfeito: um título só vai bem se for bom
 * para cada um, e não só na soma. Membros sem nenhum sinal não restringem o grupo.
 */
export function groupScores(
    memberScores: readonly ReadonlyMap<number, number>[],
    candidateIds: readonly number[],
): Map<number, number> {
    const members = memberScores
        .filter((s) => s.size > 0)
        .map((s) => toPercentiles(new Map(candidateIds.map((id) => [id, s.get(id) ?? 0]))));
    const result = new Map<number, number>();
    if (members.length === 0) return result;
    for (const id of candidateIds) {
        result.set(id, Math.min(...members.map((m) => m.get(id)!)));
    }
    return result;
}
