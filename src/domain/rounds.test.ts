import { describe, expect, it } from "vitest";
import type { KinneGenre } from "./genre";
import {
    buildRounds,
    genreQuotas,
    meanRating,
    nextRoundLabel,
    rankTitles,
    roundEnd,
    roundEndHeading,
    roundSeenCount,
    weightedRating,
} from "./rounds";

type T = {
    id: number;
    rating: number;
    votes: number;
    type: "movie" | "series";
    kinneGenres: KinneGenre[];
};
const t = (id: number, genre: KinneGenre | null, rating = 7, votes = 1000, type = "movie"): T => ({
    id,
    rating,
    votes,
    type: type as T["type"],
    kinneGenres: genre ? [genre] : [],
});

describe("weightedRating", () => {
    it("puxa para a média quem tem poucos votos", () => {
        // no piso de votos (m = 500), metade da nota, metade da média
        expect(weightedRating(9, 500, 7)).toBe(8);
        expect(weightedRating(9, 1_000_000, 7)).toBeCloseTo(9, 2);
    });

    it("um 8,5 com muitos votos passa à frente de um 9,0 com poucos", () => {
        const ranked = rankTitles([t(1, null, 9, 600), t(2, null, 8.5, 50_000)], 7);
        expect(ranked.map((x) => x.id)).toEqual([2, 1]);
    });

    it("empata pela quantidade de votos e depois pelo menor id (D1)", () => {
        const ranked = rankTitles(
            [t(3, null, 8, 1000), t(1, null, 8, 1000), t(2, null, 8, 2000)],
            8,
        );
        expect(ranked.map((x) => x.id)).toEqual([2, 1, 3]);
    });
});

describe("meanRating", () => {
    it("é a média das notas da lista", () => {
        expect(meanRating([{ rating: 6 }, { rating: 8 }])).toBe(7);
        expect(meanRating([])).toBe(0);
    });
});

describe("genreQuotas (D11)", () => {
    it("2 de cada um dos cinco gêneros", () => {
        expect(genreQuotas("both")).toEqual([
            ["action", 2],
            ["comedy", 2],
            ["drama", 2],
            ["romance", 2],
            ["suspense", 2],
        ]);
        expect(genreQuotas("movie").every(([, q]) => q === 2)).toBe(true);
    });

    it("séries sem Romance: 3/3/2/2", () => {
        expect(genreQuotas("series")).toEqual([
            ["action", 3],
            ["comedy", 3],
            ["drama", 2],
            ["suspense", 2],
        ]);
    });
});

const genres: KinneGenre[] = ["action", "comedy", "drama", "romance", "suspense"];
// 6 por gênero, com notas decrescentes dentro de cada gênero
const pool = genres.flatMap((g, gi) =>
    Array.from({ length: 6 }, (_, i) => t(gi * 10 + i + 1, g, 8.9 - i * 0.1)),
);

describe("buildRounds sem gênero escolhido", () => {
    const rounds = buildRounds(pool, { genres: [], type: "both" }, 7);

    it("cada rodada leva os 2 melhores de cada gênero", () => {
        expect(rounds[0]).toHaveLength(10);
        for (const g of genres) {
            const ids = rounds[0].filter((x) => x.kinneGenres.includes(g)).map((x) => x.id);
            const best = pool.filter((x) => x.kinneGenres.includes(g)).slice(0, 2);
            expect(ids.sort()).toEqual(best.map((x) => x.id).sort());
        }
    });

    it("nenhum título repete entre rodadas e todos entram (D2)", () => {
        const all = rounds.flat().map((x) => x.id);
        expect(new Set(all).size).toBe(all.length);
        expect(all.length).toBe(pool.length);
        expect(rounds.map((r) => r.length)).toEqual([10, 10, 10]);
    });

    it("título com dois gêneros entra uma vez só", () => {
        const both = { ...t(99, "action", 9.5), kinneGenres: ["action", "comedy"] as KinneGenre[] };
        const r = buildRounds([both, ...pool], { genres: [], type: "both" }, 7);
        expect(r.flat().filter((x) => x.id === 99)).toHaveLength(1);
        expect(r[0]).toHaveLength(10);
    });

    it("gênero que acaba é completado pelos melhores que sobraram; só a última é menor", () => {
        const fewRomance = [
            ...pool.filter((x) => !x.kinneGenres.includes("romance")),
            t(200, "romance"),
        ];
        const r = buildRounds(fewRomance, { genres: [], type: "both" }, 7);
        expect(r.slice(0, -1).every((round) => round.length === 10)).toBe(true);
        expect(r.flat()).toHaveLength(fewRomance.length);
    });

    it("séries: 3/3/2/2 e nada de Romance pela cota", () => {
        const series = pool.map((x) => ({ ...x, type: "series" as const }));
        const r = buildRounds(series, { genres: [], type: "series" }, 7);
        const count = (g: KinneGenre) => r[0].filter((x) => x.kinneGenres.includes(g)).length;
        expect([count("action"), count("comedy"), count("drama"), count("suspense")]).toEqual([
            3, 3, 2, 2,
        ]);
        expect(count("romance")).toBe(0);
    });

    it("é sempre igual para a mesma entrada (D1)", () => {
        expect(buildRounds(pool, { genres: [], type: "both" }, 7)).toEqual(rounds);
        expect(buildRounds(pool.toReversed(), { genres: [], type: "both" }, 7)).toEqual(rounds);
    });
});

describe("buildRounds com gênero escolhido", () => {
    it("os 10 melhores, depois os 10 seguintes, pela nota ponderada", () => {
        const drama = Array.from({ length: 23 }, (_, i) => t(i + 1, "drama", 9 - i * 0.05));
        const r = buildRounds(drama, { genres: ["drama"], type: "both" }, 7);
        expect(r.map((x) => x.length)).toEqual([10, 10, 3]);
        expect(r[0].map((x) => x.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });
});

describe("fim da rodada (C3)", () => {
    const rounds = [[1, 2], [3], []].map((r) => r.map((id) => ({ id })));

    it("oferece a rodada seguinte, ou diz que acabou", () => {
        expect(roundEnd([[{}], [{}]], 0, 2)).toEqual({ kind: "next", round: 0, size: 1 });
        expect(roundEnd(rounds, 1, 3)).toEqual({ kind: "done", total: 3 });
        expect(roundEnd(rounds, 50, 3)).toEqual({ kind: "done", total: 3 });
    });

    it("títulos e botões", () => {
        expect(roundEndHeading({ kind: "next", round: 0, size: 10 })).toBe(
            "Você viu as 10 melhores para esses filtros",
        );
        expect(roundEndHeading({ kind: "next", round: 2, size: 10 })).toBe(
            "Você viu mais 10 para esses filtros",
        );
        expect(roundEndHeading({ kind: "done", total: 37 })).toBe("Você viu todos os 37 títulos");
        expect(roundEndHeading({ kind: "done", total: 1 })).toBe(
            "Você viu o único título para esses filtros",
        );
        expect(roundEndHeading({ kind: "done", total: 0 })).toBe(
            "Nenhum título combina mais com esses filtros",
        );
        expect(nextRoundLabel(10)).toBe("Sortear entre os próximos 10");
        expect(nextRoundLabel(7)).toBe("Sortear entre os últimos 7");
        expect(nextRoundLabel(1)).toBe("Sortear o último");
    });
});

describe("roundSeenCount (US004 C3)", () => {
    it("conta as rodadas vistas e, no fim, o total", () => {
        expect(roundSeenCount({ kind: "next", round: 0, size: 10 })).toBe(10);
        expect(roundSeenCount({ kind: "next", round: 2, size: 4 })).toBe(30);
        expect(roundSeenCount({ kind: "done", total: 23 })).toBe(23);
        expect(roundSeenCount({ kind: "done", total: 0 })).toBe(0);
    });
});
