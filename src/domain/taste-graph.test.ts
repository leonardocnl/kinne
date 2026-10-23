import { describe, expect, it } from "vitest";

import {
    FEELINGS,
    FEELING_RECIPES,
    feelingAffinity,
    feelingAllows,
    rankByFeeling,
    resolveRecipe,
} from "./feelings";
import {
    buildNeighborEdges,
    contentScore,
    featureRarity,
    groupScores,
    proximity,
    rankByTaste,
    recommendationScore,
    spreadTaste,
    strongestPath,
    toNeighborGraph,
    toPercentiles,
    type TitleProfile,
} from "./taste-graph";

function title(id: number, parts: Partial<Omit<TitleProfile, "id">> = {}): TitleProfile {
    return {
        id,
        type: "movie",
        themeIds: [],
        genreIds: [],
        authorIds: [],
        writerIds: [],
        companyIds: [],
        seriesType: null,
        collectionId: null,
        recommendedIds: [],
        ...parts,
    };
}

// Um catálogo pequeno com padding: 40 títulos sem nada em comum, para a raridade fazer sentido.
const filler = Array.from({ length: 40 }, (_, i) => title(1000 + i, { themeIds: [5000 + i] }));
// O tema 12 ("baseado em fatos") é comum: está em mais 9 títulos sem relação.
const commonTheme = Array.from({ length: 9 }, (_, i) => title(2000 + i, { themeIds: [12] }));

const filler2 = Array.from({ length: 200 }, (_, i) => title(3000 + i, { themeIds: [8000 + i] }));

const chernobyl = title(1, {
    type: "series",
    themeIds: [10, 11, 12],
    genreIds: [18, 36],
    authorIds: [900],
    writerIds: [901],
    seriesType: "miniseries",
    recommendedIds: [3],
});
const fukushima = title(2, { themeIds: [10, 11], genreIds: [18] });
const whenTheySeeUs = title(3, {
    type: "series",
    themeIds: [12],
    genreIds: [18],
    seriesType: "miniseries",
});
const breakingBad = title(4, { type: "series", genreIds: [18, 80], seriesType: "scripted" });
const CATALOG = [chernobyl, fukushima, whenTheySeeUs, breakingBad, ...filler, ...commonTheme];

describe("featureRarity", () => {
    it("weighs rare features above common ones and drops singletons", () => {
        const rarity = featureRarity([
            title(1, { themeIds: [1, 2] }),
            title(2, { themeIds: [1, 2] }),
            title(3, { themeIds: [2] }),
            title(4, { themeIds: [3] }),
            ...filler,
        ]);
        expect(rarity.weight("theme", 1)).toBeGreaterThan(rarity.weight("theme", 2));
        expect(rarity.weight("theme", 3)).toBe(0);
    });

    it("drops theme hubs, present in more than 5% of the catalog", () => {
        const many = Array.from({ length: 100 }, (_, i) =>
            title(i + 1, { themeIds: i < 10 ? [7] : [8 + i] }),
        );
        expect(featureRarity(many).weight("theme", 7)).toBe(0);
    });
});

describe("proximity (design §4)", () => {
    const rarity = featureRarity(CATALOG);

    it("orders Chernobyl's candidates theme first, then kind of work", () => {
        const near = (t: TitleProfile) => proximity(chernobyl, t, rarity).proximity;
        expect(near(fukushima)).toBeGreaterThan(near(whenTheySeeUs));
        expect(near(whenTheySeeUs)).toBeGreaterThan(near(breakingBad));
    });

    it("is symmetric and between 0 and 1", () => {
        for (const a of CATALOG.slice(0, 4)) {
            for (const b of CATALOG.slice(0, 4)) {
                const ab = proximity(a, b, rarity).proximity;
                expect(ab).toBeCloseTo(proximity(b, a, rarity).proximity, 10);
                expect(ab).toBeGreaterThanOrEqual(0);
                expect(ab).toBeLessThanOrEqual(1);
            }
        }
    });

    it("gives full content score to the same collection", () => {
        const a = title(50, { collectionId: 7 });
        const b = title(51, { collectionId: 7 });
        expect(contentScore(a, b, rarity)).toBe(1);
    });

    it("values TMDB recommendations by position, stronger both ways", () => {
        const a = title(60, { recommendedIds: [61] });
        const b = title(61);
        const c = title(62, { recommendedIds: [99, 98, 61] });
        expect(recommendationScore(a, b)).toBe(1);
        expect(recommendationScore(c, b)).toBeCloseTo(0.9, 10);
        expect(recommendationScore(b, title(63))).toBe(0);
        const both = recommendationScore(
            title(64, { recommendedIds: [99, 65] }),
            title(65, { recommendedIds: [64] }),
        );
        expect(both).toBe(1);
    });
});

describe("buildNeighborEdges", () => {
    it("keeps each edge once, undirected, never to itself", () => {
        const edges = buildNeighborEdges(CATALOG);
        const keys = edges.map((e) => `${e.a}:${e.b}`);
        expect(new Set(keys).size).toBe(keys.length);
        for (const e of edges) {
            expect(e.a).toBeLessThan(e.b);
            expect(e.proximity).toBeGreaterThan(0);
        }
    });

    it("links titles that share only a genre and a TMDB recommendation", () => {
        const edges = buildNeighborEdges([
            title(1, { genreIds: [18], recommendedIds: [2] }),
            title(2, { genreIds: [18] }),
            ...filler,
        ]);
        expect(edges.some((e) => e.a === 1 && e.b === 2)).toBe(true);
    });

    it("caps each title at k neighbours of its own", () => {
        const hub = title(1, { themeIds: [7] });
        const others = Array.from({ length: 10 }, (_, i) => title(i + 2, { themeIds: [7] }));
        const edges = buildNeighborEdges([hub, ...others, ...filler, ...filler2], 3);
        // every title picks 3; the union is at most 11 × 3
        expect(edges.length).toBeLessThanOrEqual(33);
    });
});

describe("edge gate", () => {
    it("drops pairs with nothing in common, even when TMDB recommends them", () => {
        const edges = buildNeighborEdges([
            title(1, { genreIds: [18], recommendedIds: [2] }),
            title(2, { genreIds: [35] }),
            ...filler,
        ]);
        expect(edges.some((e) => e.a === 1 && e.b === 2)).toBe(false);
    });
});

describe("strongestPath", () => {
    const graph = toNeighborGraph([
        { a: 1, b: 2, proximity: 0.9 },
        { a: 2, b: 3, proximity: 0.9 },
        { a: 1, b: 3, proximity: 0.2 },
    ]);

    it("prefers the stronger path after damping", () => {
        // direct 0.2 × 1 = 0.2; via 2: 0.81 × 0.35 = 0.28
        expect(strongestPath(graph, [1], 3)).toEqual({ ids: [1, 2, 3], strength: 0.81 * 0.35 });
    });

    it("returns null when the target is out of reach", () => {
        expect(strongestPath(graph, [1], 99)).toBeNull();
    });
});

describe("spreadTaste (design §6)", () => {
    // 1 — 2 — 3 — 4 — 5 in a line, 6 hanging off 1
    const graph = toNeighborGraph([
        { a: 1, b: 2, proximity: 0.8 },
        { a: 2, b: 3, proximity: 0.8 },
        { a: 3, b: 4, proximity: 0.8 },
        { a: 4, b: 5, proximity: 0.8 },
        { a: 1, b: 6, proximity: 0.2 },
    ]);

    it("reaches three steps and no further", () => {
        const scores = spreadTaste(graph, [{ titleId: 1, signal: "liked" }]);
        expect(scores.has(4)).toBe(true);
        expect(scores.has(5)).toBe(false);
    });

    it("scores closer and more similar titles higher", () => {
        const scores = spreadTaste(graph, [{ titleId: 1, signal: "liked" }]);
        expect(scores.get(2)!).toBeGreaterThan(scores.get(6)!);
        expect(scores.get(2)!).toBeGreaterThan(scores.get(3)!);
        expect(scores.get(3)!).toBeGreaterThan(scores.get(4)!);
    });

    it("never scores the titles the person marked", () => {
        const scores = spreadTaste(graph, [
            { titleId: 1, signal: "liked" },
            { titleId: 3, signal: "not_interested" },
        ]);
        expect(scores.has(1)).toBe(false);
        expect(scores.has(3)).toBe(false);
    });

    it("pushes down titles near a dislike", () => {
        const liked = spreadTaste(graph, [{ titleId: 1, signal: "liked" }]);
        const both = spreadTaste(graph, [
            { titleId: 1, signal: "liked" },
            { titleId: 4, signal: "disliked" },
        ]);
        expect(both.get(3)!).toBeLessThan(liked.get(3)!);
    });

    it("damps hubs: a title linked to everything gains less than a dedicated neighbour", () => {
        // 1 liked; 2 is a dedicated neighbour of 1; 9 is a hub linked to 1 and to 20 others
        const hubGraph = toNeighborGraph([
            { a: 1, b: 2, proximity: 0.5 },
            { a: 1, b: 9, proximity: 0.5 },
            ...Array.from({ length: 20 }, (_, i) => ({ a: 9, b: 100 + i, proximity: 0.5 })),
        ]);
        const scores = spreadTaste(hubGraph, [{ titleId: 1, signal: "liked" }]);
        expect(scores.get(2)!).toBeGreaterThan(scores.get(9)!);
    });

    it("ignores titles that are not in the graph", () => {
        expect(spreadTaste(graph, [{ titleId: 999, signal: "liked" }]).size).toBe(0);
    });
});

describe("rankByTaste", () => {
    it("returns null without any taste, so callers keep today's order", () => {
        expect(rankByTaste(new Map(), [{ id: 1, quality: 7 }])).toBeNull();
    });

    it("keeps a direct neighbour above a well-rated title reached by chance", () => {
        const ranked = rankByTaste(
            new Map([
                [1, 1],
                [2, 0.02],
            ]),
            [
                { id: 1, quality: 6.5 },
                { id: 2, quality: 9 },
                { id: 3, quality: 8 },
            ],
        );
        expect(ranked![0]).toBe(1);
    });

    it("puts taste above quality and neutral above disliked", () => {
        const ranked = rankByTaste(
            new Map([
                [1, 0.5],
                [3, -0.5],
            ]),
            [
                { id: 1, quality: 6 },
                { id: 2, quality: 9 },
                { id: 3, quality: 9.5 },
            ],
        );
        expect(ranked).toEqual([1, 2, 3]);
    });
});

describe("toPercentiles", () => {
    it("maps lowest to 0, highest to 1 and ties to the same value", () => {
        const result = toPercentiles(
            new Map([
                [1, 0.5],
                [2, -1],
                [3, 3],
                [4, 0.5],
            ]),
        );
        expect(result.get(2)).toBe(0);
        expect(result.get(3)).toBe(1);
        expect(result.get(1)).toBe(result.get(4));
    });
});

describe("groupScores (design §7)", () => {
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
        const group = groupScores([ana, bia], [1, 2, 3]);
        expect(group.get(2)).toBe(0.5);
        expect(group.get(1)).toBe(0);
        expect(group.get(3)).toBe(0);
    });

    it("ignores members without any taste signal", () => {
        const ana = new Map([
            [1, 1],
            [2, 2],
        ]);
        expect(groupScores([ana, new Map()], [1, 2])).toEqual(toPercentiles(ana));
        expect(groupScores([new Map()], [1, 2]).size).toBe(0);
    });
});

describe("feelings (design §5)", () => {
    it("has a recipe with required genres for every feeling", () => {
        for (const feeling of FEELINGS) {
            expect(FEELING_RECIPES[feeling].requireGenres.length).toBeGreaterThan(0);
        }
    });

    it("requires one of the feeling's genres and rejects excluded ones", () => {
        expect(feelingAllows("scare", [27])).toBe(true);
        expect(feelingAllows("scare", [53])).toBe(false);
        expect(feelingAllows("scare", [27, 35])).toBe(false);
        expect(feelingAllows("scare", [27, 10751])).toBe(false);
        expect(feelingAllows("true-story", [18, 99])).toBe(false);
    });

    it("applies the certification cap, failing closed without a rating", () => {
        expect(feelingAllows("cozy", [10751], "12")).toBe(true);
        expect(feelingAllows("cozy", [35], "16")).toBe(false);
        expect(feelingAllows("cozy", [35], null)).toBe(false);
        expect(feelingAllows("scare", [27], null)).toBe(true);
    });

    it("resolves only the themes the catalog has, avoided ones negative", () => {
        const known = new Map([
            ["grief", 1],
            ["loss", 2],
        ]);
        const recipe = resolveRecipe("cry", (name) => known.get(name));
        expect([...recipe.themes.keys()].sort()).toEqual([1, 2]);
        expect(recipe.genres.get(53)).toBeLessThan(0);
    });

    it("scores rare recipe themes above common ones", () => {
        const recipe = {
            genres: new Map<number, number>(),
            themes: new Map([
                [1, 1],
                [2, 1],
            ]),
        };
        const rarity = (id: number) => (id === 1 ? 3 : 0.5);
        const rare = feelingAffinity(recipe, { genreTmdbIds: [], themeTmdbIds: [1] }, rarity);
        const common = feelingAffinity(recipe, { genreTmdbIds: [], themeTmdbIds: [2] }, rarity);
        expect(rare).toBeGreaterThan(common);
    });

    it("ranks only allowed titles, affinity over quality", () => {
        const recipe = { genres: new Map<number, number>(), themes: new Map([[1, 1]]) };
        const ranked = rankByFeeling(
            "scare",
            recipe,
            [
                { id: 1, genreTmdbIds: [27], themeTmdbIds: [1], certification: null, quality: 5 },
                { id: 2, genreTmdbIds: [27], themeTmdbIds: [], certification: null, quality: 9 },
                { id: 3, genreTmdbIds: [35], themeTmdbIds: [1], certification: null, quality: 9 },
            ],
            () => 1,
        );
        expect(ranked).toEqual([1, 2]);
    });
});
