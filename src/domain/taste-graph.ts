// Grafo de gosto do Kinne: um grafo bipartido entre títulos e características (gêneros, temas e
// pessoas). Uma única operação, o PageRank personalizado, serve às três funcionalidades: escolha
// por sentimento, gosto invisível e finalistas da sala de grupo.
//
// Funções puras: recebem os dados já carregados e devolvem pontuações. Nada de banco nem rede.

export type FeatureKind = "genre" | "keyword" | "person";

/** Identificador de uma característica, ex.: "genre:35", "keyword:9672", "person:1234". */
export type FeatureKey = `${FeatureKind}:${number}`;

export function featureKey(kind: FeatureKind, id: number): FeatureKey {
    return `${kind}:${id}`;
}

export type GraphTitle = {
    id: number;
    genreTmdbIds: readonly number[];
    keywordTmdbIds: readonly number[];
    directorIds: readonly number[];
    // elenco principal, já cortado pela ordem de crédito (ver CAST_LIMIT)
    castIds: readonly number[];
};

// Só o elenco principal liga títulos: o 30º nome do crédito não diz nada sobre o gosto.
export const CAST_LIMIT = 5;

// Peso base de cada tipo de aresta, antes do ajuste por raridade. Gênero é amplo e diz pouco;
// tema e direção dizem muito sobre o tom de um título.
const KIND_WEIGHT: Record<FeatureKind, number> = {
    genre: 0.6,
    keyword: 1,
    person: 1,
};
const DIRECTOR_WEIGHT = 1.2;
const CAST_WEIGHT = 0.7;

// Uma característica presente em um só título não liga nada a nada e só gasta memória.
const MIN_FEATURE_TITLES = 2;

export type TasteGraph = {
    titleIds: readonly number[];
    // índice do título no vetor de nós, pelo id do catálogo
    titleIndex: ReadonlyMap<number, number>;
    featureIndex: ReadonlyMap<FeatureKey, number>;
    nodeCount: number;
    // lista de adjacência compacta (CSR): vizinhos do nó i em offsets[i]..offsets[i + 1]
    offsets: Int32Array;
    neighbors: Int32Array;
    weights: Float64Array;
    // soma dos pesos das arestas de cada nó
    strength: Float64Array;
};

type RawEdge = { feature: FeatureKey; weight: number };

function titleEdges(title: GraphTitle): RawEdge[] {
    const edges: RawEdge[] = [];
    for (const id of title.genreTmdbIds) {
        edges.push({ feature: featureKey("genre", id), weight: 1 });
    }
    for (const id of title.keywordTmdbIds) {
        edges.push({ feature: featureKey("keyword", id), weight: 1 });
    }
    for (const id of title.directorIds) {
        edges.push({ feature: featureKey("person", id), weight: DIRECTOR_WEIGHT });
    }
    for (const id of title.castIds.slice(0, CAST_LIMIT)) {
        edges.push({ feature: featureKey("person", id), weight: CAST_WEIGHT });
    }
    // uma pessoa que dirige e atua no mesmo título vira uma aresta só, com o maior peso
    const byFeature = new Map<FeatureKey, number>();
    for (const edge of edges) {
        byFeature.set(edge.feature, Math.max(byFeature.get(edge.feature) ?? 0, edge.weight));
    }
    return [...byFeature].map(([feature, weight]) => ({ feature, weight }));
}

function kindOf(key: FeatureKey): FeatureKind {
    return key.slice(0, key.indexOf(":")) as FeatureKind;
}

/**
 * Monta o grafo. O peso de cada aresta é multiplicado pela raridade da característica (IDF,
 * log de títulos sobre títulos com ela): um tema que aparece em 4 títulos aproxima muito mais
 * do que "drama", que aparece em metade do catálogo.
 */
export function buildTasteGraph(titles: readonly GraphTitle[]): TasteGraph {
    const edgesByTitle = titles.map(titleEdges);

    const documentFrequency = new Map<FeatureKey, number>();
    for (const edges of edgesByTitle) {
        for (const { feature } of edges) {
            documentFrequency.set(feature, (documentFrequency.get(feature) ?? 0) + 1);
        }
    }

    const titleIndex = new Map<number, number>();
    titles.forEach((title, index) => titleIndex.set(title.id, index));

    const featureIndex = new Map<FeatureKey, number>();
    for (const [feature, count] of documentFrequency) {
        if (count >= MIN_FEATURE_TITLES) {
            featureIndex.set(feature, titles.length + featureIndex.size);
        }
    }
    const nodeCount = titles.length + featureIndex.size;

    // arestas não direcionadas, guardadas nos dois sentidos
    const adjacency: { node: number; weight: number }[][] = Array.from(
        { length: nodeCount },
        () => [],
    );
    const total = Math.max(titles.length, 1);
    edgesByTitle.forEach((edges, titleNode) => {
        for (const { feature, weight } of edges) {
            const featureNode = featureIndex.get(feature);
            if (featureNode === undefined) continue;
            const rarity = Math.log(1 + total / documentFrequency.get(feature)!);
            const w = weight * KIND_WEIGHT[kindOf(feature)] * rarity;
            adjacency[titleNode].push({ node: featureNode, weight: w });
            adjacency[featureNode].push({ node: titleNode, weight: w });
        }
    });

    const offsets = new Int32Array(nodeCount + 1);
    adjacency.forEach((list, i) => (offsets[i + 1] = offsets[i] + list.length));
    const neighbors = new Int32Array(offsets[nodeCount]);
    const weights = new Float64Array(offsets[nodeCount]);
    const strength = new Float64Array(nodeCount);
    adjacency.forEach((list, i) => {
        list.forEach(({ node, weight }, k) => {
            neighbors[offsets[i] + k] = node;
            weights[offsets[i] + k] = weight;
            strength[i] += weight;
        });
    });

    return {
        titleIds: titles.map((t) => t.id),
        titleIndex,
        featureIndex,
        nodeCount,
        offsets,
        neighbors,
        weights,
        strength,
    };
}

/** Ponto de partida do passeio: um título ou uma característica, com um peso positivo. */
export type Seed = { title: number; weight: number } | { feature: FeatureKey; weight: number };

export type PageRankOptions = {
    // probabilidade de voltar ao ponto de partida a cada passo
    restart?: number;
    iterations?: number;
};

export const DEFAULT_RESTART = 0.15;
export const DEFAULT_ITERATIONS = 30;

function seedVector(graph: TasteGraph, seeds: readonly Seed[]): Float64Array | null {
    const vector = new Float64Array(graph.nodeCount);
    let sum = 0;
    for (const seed of seeds) {
        if (!(seed.weight > 0)) continue;
        const node =
            "title" in seed
                ? graph.titleIndex.get(seed.title)
                : graph.featureIndex.get(seed.feature);
        if (node === undefined || graph.strength[node] === 0) continue;
        vector[node] += seed.weight;
        sum += seed.weight;
    }
    if (sum === 0) return null;
    for (let i = 0; i < vector.length; i++) vector[i] /= sum;
    return vector;
}

/**
 * PageRank personalizado por iteração de potência. Devolve, para cada nó, a probabilidade de um
 * passeio aleatório que recomeça nas sementes estar nele. Sem nenhuma semente válida, devolve null.
 */
export function personalizedPageRank(
    graph: TasteGraph,
    seeds: readonly Seed[],
    { restart = DEFAULT_RESTART, iterations = DEFAULT_ITERATIONS }: PageRankOptions = {},
): Float64Array | null {
    const start = seedVector(graph, seeds);
    if (!start) return null;
    let rank = Float64Array.from(start);
    let next = new Float64Array(graph.nodeCount);
    for (let step = 0; step < iterations; step++) {
        next.fill(0);
        let dangling = 0;
        for (let i = 0; i < graph.nodeCount; i++) {
            const mass = rank[i];
            if (mass === 0) continue;
            if (graph.strength[i] === 0) {
                dangling += mass;
                continue;
            }
            const share = ((1 - restart) * mass) / graph.strength[i];
            for (let e = graph.offsets[i]; e < graph.offsets[i + 1]; e++) {
                next[graph.neighbors[e]] += share * graph.weights[e];
            }
        }
        // o que se perdeu em nós sem saída também volta às sementes
        const back = restart + (1 - restart) * dangling;
        for (let i = 0; i < graph.nodeCount; i++) next[i] += back * start[i];
        [rank, next] = [next, rank];
    }
    return rank;
}

export type TasteQuery = {
    likes: readonly Seed[];
    dislikes?: readonly Seed[];
    // quanto um "não gostei" pesa contra um "gostei"
    dislikeWeight?: number;
};

export const DEFAULT_DISLIKE_WEIGHT = 0.8;

/**
 * Pontuação de cada título: proximidade das sementes positivas menos a das negativas. Divide pela
 * raiz da força do nó para que títulos com muitas arestas não ganhem só por serem "centrais".
 * Títulos que são sementes ficam de fora: ninguém precisa que o Kinne indique o que já indicou.
 */
export function scoreTitles(
    graph: TasteGraph,
    { likes, dislikes = [], dislikeWeight = DEFAULT_DISLIKE_WEIGHT }: TasteQuery,
    options?: PageRankOptions,
): Map<number, number> {
    const positive = personalizedPageRank(graph, likes, options);
    if (!positive) return new Map();
    const negative = personalizedPageRank(graph, dislikes, options);

    const seeded = new Set<number>();
    for (const seed of [...likes, ...dislikes]) {
        if ("title" in seed) seeded.add(seed.title);
    }

    const scores = new Map<number, number>();
    graph.titleIds.forEach((id, node) => {
        if (seeded.has(id) || graph.strength[node] === 0) return;
        const raw = positive[node] - (negative ? dislikeWeight * negative[node] : 0);
        scores.set(id, raw / Math.sqrt(graph.strength[node]));
    });
    return scores;
}

/** Converte pontuações em percentis de 0 a 1, para comparar pessoas com escalas diferentes. */
export function toPercentiles(scores: ReadonlyMap<number, number>): Map<number, number> {
    const sorted = [...scores].sort((a, b) => a[1] - b[1]);
    const result = new Map<number, number>();
    const last = Math.max(sorted.length - 1, 1);
    sorted.forEach(([id], rank) => result.set(id, sorted.length === 1 ? 1 : rank / last));
    return result;
}

/**
 * Pontuação do grupo: o percentil do membro menos satisfeito. Um título só vai bem se for bom
 * para cada um, e não só na soma: evita o finalista que um ama e outro detesta. Membros sem
 * pontuação (nenhum sinal de gosto) não restringem o grupo.
 */
export function groupScores(
    memberScores: readonly ReadonlyMap<number, number>[],
): Map<number, number> {
    const members = memberScores.filter((s) => s.size > 0).map(toPercentiles);
    if (members.length === 0) return new Map();
    const result = new Map<number, number>();
    for (const [id] of members[0]) {
        let worst = Infinity;
        for (const member of members) {
            const value = member.get(id);
            if (value === undefined) {
                worst = -Infinity;
                break;
            }
            worst = Math.min(worst, value);
        }
        if (worst > -Infinity) result.set(id, worst);
    }
    return result;
}
