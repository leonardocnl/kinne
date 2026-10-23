import { describe, expect, it } from "vitest";

import { FEELINGS, FEELING_RECIPES, feelingSeeds } from "./feelings";
import {
    buildTasteGraph,
    featureKey,
    groupScores,
    personalizedPageRank,
    scoreTitles,
    toPercentiles,
    type GraphTitle,
} from "./taste-graph";

function title(id: number, parts: Partial<Omit<GraphTitle, "id">> = {}): GraphTitle {
    return {
        id,
        genreTmdbIds: [],
        keywordTmdbIds: [],
        directorIds: [],
        castIds: [],
        ...parts,
    };
}

// Dois "mundos": comédias leves (1–3) e thrillers de crime (4–6), com um diretor em comum só
// entre 4 e 5, e um título ponte (7) que é drama nos dois sentidos.
const CATALOG: GraphTitle[] = [
    title(1, { genreTmdbIds: [35], keywordTmdbIds: [100, 101] }),
    title(2, { genreTmdbIds: [35], keywordTmdbIds: [100, 101] }),
    title(3, { genreTmdbIds: [35], keywordTmdbIds: [101] }),
    title(4, { genreTmdbIds: [53, 80], keywordTmdbIds: [200], directorIds: [9] }),
    title(5, { genreTmdbIds: [53, 80], keywordTmdbIds: [200], directorIds: [9] }),
    title(6, { genreTmdbIds: [53], keywordTmdbIds: [201] }),
    title(7, { genreTmdbIds: [18], keywordTmdbIds: [201] }),
    title(8, { genreTmdbIds: [18], keywordTmdbIds: [101] }),
];

describe("buildTasteGraph", () => {
    it("drops features that link a single title", () => {
        const graph = buildTasteGraph([
            title(1, { keywordTmdbIds: [1, 2] }),
            title(2, { keywordTmdbIds: [1] }),
        ]);
        expect(graph.featureIndex.has(featureKey("keyword", 1))).toBe(true);
        expect(graph.featureIndex.has(featureKey("keyword", 2))).toBe(false);
    });

    it("merges a person who directs and acts in the same title into one edge", () => {
        const graph = buildTasteGraph([
            title(1, { directorIds: [5], castIds: [5] }),
            title(2, { directorIds: [5] }),
        ]);
        const node = graph.titleIndex.get(1)!;
        expect(graph.offsets[node + 1] - graph.offsets[node]).toBe(1);
    });

    it("weights rare features above common ones", () => {
        const graph = buildTasteGraph(CATALOG);
        const node = graph.titleIndex.get(4)!;
        const weightTo = (key: ReturnType<typeof featureKey>) => {
            const target = graph.featureIndex.get(key)!;
            for (let e = graph.offsets[node]; e < graph.offsets[node + 1]; e++) {
                if (graph.neighbors[e] === target) return graph.weights[e];
            }
            return 0;
        };
        // genre 53 has 3 titles, keyword 200 has 2
        expect(weightTo(featureKey("keyword", 200))).toBeGreaterThan(
            weightTo(featureKey("genre", 53)),
        );
    });
});

describe("personalizedPageRank", () => {
    it("returns null without a usable seed", () => {
        const graph = buildTasteGraph(CATALOG);
        expect(personalizedPageRank(graph, [])).toBeNull();
        expect(personalizedPageRank(graph, [{ title: 999, weight: 1 }])).toBeNull();
        expect(personalizedPageRank(graph, [{ title: 1, weight: 0 }])).toBeNull();
    });

    it("keeps the total probability at 1", () => {
        const graph = buildTasteGraph(CATALOG);
        const rank = personalizedPageRank(graph, [{ title: 1, weight: 1 }])!;
        const sum = rank.reduce((a, b) => a + b, 0);
        expect(sum).toBeCloseTo(1, 6);
    });
});

describe("scoreTitles", () => {
    it("ranks titles from the liked world above the other world", () => {
        const graph = buildTasteGraph(CATALOG);
        const scores = scoreTitles(graph, { likes: [{ title: 1, weight: 1 }] });
        expect(scores.get(2)!).toBeGreaterThan(scores.get(5)!);
        expect(scores.get(3)!).toBeGreaterThan(scores.get(6)!);
    });

    it("never scores the seeds themselves", () => {
        const graph = buildTasteGraph(CATALOG);
        const scores = scoreTitles(graph, {
            likes: [{ title: 1, weight: 1 }],
            dislikes: [{ title: 4, weight: 1 }],
        });
        expect(scores.has(1)).toBe(false);
        expect(scores.has(4)).toBe(false);
    });

    it("finds the same-director title through the person node", () => {
        const graph = buildTasteGraph(CATALOG);
        const scores = scoreTitles(graph, { likes: [{ title: 4, weight: 1 }] });
        const ranked = [...scores].sort((a, b) => b[1] - a[1]).map(([id]) => id);
        expect(ranked[0]).toBe(5);
    });

    it("pushes down titles close to a dislike", () => {
        const graph = buildTasteGraph(CATALOG);
        const likeOnly = scoreTitles(graph, { likes: [{ title: 8, weight: 1 }] });
        const withDislike = scoreTitles(graph, {
            likes: [{ title: 8, weight: 1 }],
            dislikes: [{ title: 6, weight: 1 }],
        });
        expect(withDislike.get(7)!).toBeLessThan(likeOnly.get(7)!);
    });

    it("starts from feature seeds too", () => {
        const graph = buildTasteGraph(CATALOG);
        const scores = scoreTitles(graph, {
            likes: [{ feature: featureKey("genre", 53), weight: 1 }],
        });
        expect(scores.get(4)!).toBeGreaterThan(scores.get(1)!);
    });
});

describe("toPercentiles", () => {
    it("maps the lowest to 0 and the highest to 1", () => {
        const result = toPercentiles(
            new Map([
                [1, 0.5],
                [2, -1],
                [3, 3],
            ]),
        );
        expect(result.get(2)).toBe(0);
        expect(result.get(1)).toBe(0.5);
        expect(result.get(3)).toBe(1);
    });
});

describe("groupScores", () => {
    it("uses the least satisfied member", () => {
        const ana = new Map([
            [1, 10],
            [2, 5],
            [3, 0],
        ]);
        const bia = new Map([
            [1, 0],
            [2, 5],
            [3, 10],
        ]);
        const group = groupScores([ana, bia]);
        // 2 is the middle for both; 1 and 3 are loved by one and hated by the other
        expect(group.get(2)).toBe(0.5);
        expect(group.get(1)).toBe(0);
        expect(group.get(3)).toBe(0);
    });

    it("ignores members without any taste signal", () => {
        const ana = new Map([
            [1, 1],
            [2, 2],
        ]);
        expect(groupScores([ana, new Map()])).toEqual(toPercentiles(ana));
        expect(groupScores([new Map()]).size).toBe(0);
    });
});

describe("feelings", () => {
    it("has a recipe with at least one positive genre for every feeling", () => {
        for (const feeling of FEELINGS) {
            expect(Object.keys(FEELING_RECIPES[feeling].genres).length).toBeGreaterThan(0);
        }
    });

    it("skips keywords the catalog does not have", () => {
        const known = new Map([["based on true story", 9672]]);
        const { likes } = feelingSeeds("true-story", (name) => known.get(name));
        const keywordSeeds = likes.filter((s) => "feature" in s && s.feature.startsWith("keyword"));
        expect(keywordSeeds).toEqual([{ feature: "keyword:9672", weight: 3 }]);
    });

    it("turns avoided genres into dislikes", () => {
        const { dislikes } = feelingSeeds("scare", () => undefined);
        expect(dislikes).toContainEqual({ feature: "genre:10751", weight: 1.5 });
    });
});
