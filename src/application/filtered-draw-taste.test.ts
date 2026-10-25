import { describe, expect, it } from "vitest";
import { DEFAULT_FILTERS, wireFilters } from "@/domain/filters";
import { KINNE_GENRES } from "@/domain/genre";
import { spreadTaste, toNeighborGraph } from "@/domain/taste-graph";
import { EMPTY_TASTE, toSignals, type TasteLists } from "@/domain/taste-signals";
import { planFilteredRounds } from "./filtered-draw";
import type { Candidate } from "./titles";

const title = (id: number, extra: Partial<Candidate> = {}): Candidate => ({
    id,
    slug: `t-${id}`,
    type: "movie",
    rating: 7,
    votes: 1000,
    runtimeMinutes: 100,
    kinneGenres: ["drama"],
    streamingTmdbIds: [8],
    adult: false,
    feelings: 0b111111111,
    ...extra,
});

const edge = (a: number, b: number, proximity = 0.5) => ({ a, b, proximity });
const taste = (extra: Partial<TasteLists>): TasteLists => ({ ...EMPTY_TASTE, ...extra });

const run = (
    candidates: Candidate[],
    edges: { a: number; b: number; proximity: number }[],
    signals: TasteLists,
    filters: object = {},
    watched: number[] = [],
) =>
    planFilteredRounds(
        {
            candidates,
            person: null,
            feeling: null,
            graph: edges.length ? toNeighborGraph(edges) : null,
        },
        { ...wireFilters(DEFAULT_FILTERS), ...filters },
        watched,
        signals,
    );
const order = (plan: ReturnType<typeof run>) => plan.rounds.flat().map((t) => t.id);

describe("gosto invisível nos filtros (US009)", () => {
    // 1 é o título curtido; 2 e 3 são seus vizinhos; 4 e 5 não têm ligação nenhuma
    const edges = [edge(1, 2, 0.9), edge(1, 3, 0.3)];
    const base = [
        title(1),
        title(2, { rating: 6.5 }),
        title(3, { rating: 6.6 }),
        title(4, { rating: 9 }),
        title(5, { rating: 8.5 }),
    ];

    it("C1: sem sinais, a ordem e o piso são os de hoje", () => {
        const withGraph = order(run(base, edges, EMPTY_TASTE));
        const noGraph = order(run(base, [], EMPTY_TASTE));
        expect(withGraph).toEqual(noGraph);
        expect(noGraph[0]).toBe(4);
    });

    it("C1: só sinal negativo também não muda nada", () => {
        const only = order(run(base, edges, taste({ disliked: [1] })));
        expect(only).toEqual(order(run(base, [], EMPTY_TASTE)));
    });

    it("C2: com um curti, os vizinhos vêm antes de títulos de nota maior", () => {
        const ranked = order(run(base, edges, taste({ liked: [1] })));
        expect(ranked.slice(0, 2)).toEqual([2, 3]);
        // o título curtido não recebe pontuação: fica entre os neutros, atrás dos alcançados
        expect(ranked.indexOf(1)).toBeGreaterThan(1);
    });

    it("C2: vou assistir também puxa o gosto", () => {
        const ranked = order(run(base, edges, taste({ willWatch: [1] })));
        expect(ranked[0]).toBe(2);
    });

    it("RNE006: sem grafo, vale a ordem de hoje, sem erro", () => {
        const plan = run(base, [], taste({ liked: [1] }));
        expect(order(plan)).toEqual(order(run(base, [], EMPTY_TASTE)));
    });

    it("RNE005: sem gênero marcado, as cotas por gênero continuam e o gosto ordena dentro delas", () => {
        const pool = Array.from({ length: 30 }, (_, i) =>
            title(i + 10, {
                kinneGenres: [KINNE_GENRES[i % 5]],
                rating: 7 + (i % 7) * 0.1,
            }),
        );
        // o título 40 é o vizinho forte de um curti, de nota baixa, no gênero "drama"
        const target = title(40, { kinneGenres: ["drama"], rating: 6.5 });
        const plan = run([...pool, target, title(1)], [edge(1, 40, 0.9)], taste({ liked: [1] }));
        const first = plan.rounds[0];
        const perGenre = KINNE_GENRES.map(
            (g) => first.filter((t) => t.kinneGenres.includes(g)).length,
        );
        expect(perGenre.every((n) => n >= 1)).toBe(true);
        expect(first.map((t) => t.id)).toContain(40);
    });
});

describe("o gosto só reordena o que os filtros deixam (A1, A2)", () => {
    it("A2: o alcançado dispensa a nota mínima, mas precisa de 100 votos", () => {
        const pool = [
            title(1),
            title(2, { rating: 5.5, votes: 150 }),
            title(3, { rating: 5.5, votes: 99 }),
            title(4),
        ];
        const edges = [edge(1, 2), edge(1, 3)];
        const ids = order(run(pool, edges, taste({ liked: [1] })));
        expect(ids).toContain(2);
        expect(ids).not.toContain(3);
        // sem o sinal, o piso de sempre: nenhum dos dois entra
        expect(order(run(pool, edges, EMPTY_TASTE))).not.toContain(2);
    });

    it("A1: id forjado de título 18, de outro streaming ou fora do catálogo nunca volta", () => {
        const adult = title(10, { adult: true, rating: 9 });
        const otherStreaming = title(11, { streamingTmdbIds: [999], rating: 9 });
        const edges = [edge(1, 10, 1), edge(1, 11, 1), edge(1, 12, 1), edge(1, 13, 0.1)];
        const pool = [title(1), adult, otherStreaming, title(13)];
        // 12 está no grafo e nos sinais mas não nos candidatos (bloqueado ou fora do catálogo)
        const forged = taste({ liked: [1, 10, 11, 12, 99999] });
        const plan = run(pool, edges, forged, { streamings: ["netflix"] });
        const ids = order(plan);
        for (const bad of [10, 11, 12, 99999]) expect(ids).not.toContain(bad);
        expect(ids.filter((id) => id !== 1)).toEqual([13]);
        // mesmo com o piso afrouxado para o 18+ (alcançado por um curti de verdade)
        const withLow = [title(1), title(20, { adult: true, rating: 5.5, votes: 150 })];
        expect(order(run(withLow, [edge(1, 20, 1)], taste({ liked: [1] })))).not.toContain(20);
    });

    it("A1: título já visto continua de fora, mesmo que o gosto o alcance", () => {
        const pool = [title(1), title(2)];
        const plan = run(pool, [edge(1, 2)], taste({ liked: [1] }), {}, [2]);
        expect(order(plan)).not.toContain(2);
        expect(order(plan)).toEqual([1]);
    });

    it("A1: o slider de nota subido vale para todos, inclusive os alcançados", () => {
        const pool = [title(1), title(2, { rating: 5.5, votes: 150 }), title(3, { rating: 8 })];
        const plan = run(pool, [edge(1, 2), edge(1, 3, 0.2)], taste({ liked: [1] }), {
            minRating: 7.5,
        });
        expect(order(plan)).toEqual([3]);
    });
});

describe("custo do gosto (C2)", () => {
    const n = 3000;
    const edges: { a: number; b: number; proximity: number }[] = [];
    for (let a = 1; a <= n; a++) {
        for (let k = 1; k <= 12; k++) {
            const b = ((a * 7 + k * 131) % n) + 1;
            if (a < b) edges.push(edge(a, b, 0.1 + ((a + k) % 9) / 10));
        }
    }
    const ids = (from: number) => Array.from({ length: 200 }, (_, i) => from + i);
    // o máximo que o navegador pode mandar: 200 por lista
    const signals = taste({ liked: ids(1), willWatch: ids(1001), disliked: ids(2001) });
    const graph = toNeighborGraph(edges);

    it("600 sinais espalhados sobre um grafo do tamanho do catálogo levam menos de 100 ms", () => {
        const started = performance.now();
        spreadTaste(graph, toSignals(signals));
        expect(performance.now() - started).toBeLessThan(100);
    });

    it("o plano inteiro (filtros, gosto e rodadas) fica longe do limite de uma ação", () => {
        const candidates = Array.from({ length: n }, (_, i) => title(i + 1));
        const started = performance.now();
        planFilteredRounds(
            { candidates, person: null, feeling: null, graph },
            wireFilters(DEFAULT_FILTERS),
            [],
            signals,
        );
        expect(performance.now() - started).toBeLessThan(500);
    });
});
