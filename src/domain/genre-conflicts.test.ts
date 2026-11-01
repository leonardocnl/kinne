import { describe, expect, it } from "vitest";
import {
    EXTRA_GENRE_PENALTY,
    extraGenreCount,
    rankByPurity,
    withoutConflicts,
    type RequestedGenre,
} from "./genre-conflicts";

const COMEDY = 35;
const DRAMA = 18;
const THRILLER = 53;
const MYSTERY = 9648;
const HORROR = 27;
const WAR = 10752;
const WAR_POLITICS = 10768;
const CRIME = 80;
const FAMILY = 10751;
const ANIMATION = 16;
const ROMANCE = 10749;
const ACTION = 28;

const title = (id: number, ...genreTmdbIds: number[]) => ({
    id,
    rating: 8,
    votes: 1000,
    genreTmdbIds,
});
const kept = (requested: RequestedGenre[], ...titles: ReturnType<typeof title>[]) =>
    withoutConflicts(titles, requested).map((t) => t.id);

describe("withoutConflicts (US017 C1)", () => {
    it("pedir Comédia não retorna Parasita (Comédia, Suspense, Drama)", () => {
        const parasita = title(1, COMEDY, THRILLER, DRAMA);
        expect(kept(["comedy"], parasita, title(2, COMEDY))).toEqual([2]);
    });

    it.each<[RequestedGenre, number, number[], number[]]>([
        ["comedy", COMEDY, [HORROR, THRILLER, WAR], [DRAMA, CRIME, MYSTERY, WAR_POLITICS]],
        ["romance", ROMANCE, [HORROR, WAR], [THRILLER, DRAMA]],
        ["family", FAMILY, [HORROR, THRILLER, CRIME], [WAR, DRAMA]],
        ["animation", ANIMATION, [HORROR, THRILLER, CRIME], [WAR, DRAMA]],
        ["horror", HORROR, [FAMILY], [THRILLER, DRAMA]],
        ["suspense", THRILLER, [FAMILY], [HORROR, CRIME]],
        ["drama", DRAMA, [], [HORROR, THRILLER, WAR, CRIME, FAMILY]],
        ["action", ACTION, [], [HORROR, THRILLER, WAR, CRIME, FAMILY]],
    ])("%s", (requested, own, conflicting, allowed) => {
        const anchor = title(999, own);
        for (const other of conflicting) {
            expect(kept([requested], title(1, own, other), anchor)).toEqual([999]);
        }
        for (const other of allowed) {
            expect(kept([requested], title(1, own, other), anchor)).toEqual([1, 999]);
        }
    });

    it("Mistério também conta como o chip Suspense", () => {
        expect(kept(["suspense"], title(1, MYSTERY, FAMILY), title(2, MYSTERY))).toEqual([2]);
    });

    it("com dois pedidos, basta um gênero sem conflito", () => {
        const parasita = title(1, COMEDY, THRILLER, DRAMA);
        expect(kept(["comedy", "drama"], parasita)).toEqual([1]);
    });

    it("o gênero também pedido não conta como conflito", () => {
        const both = title(1, COMEDY, THRILLER);
        expect(kept(["comedy", "suspense"], both, title(2, COMEDY))).toEqual([1, 2]);
    });

    it("sem gênero pedido, nada sai", () => {
        expect(kept([], title(1, HORROR, FAMILY))).toEqual([1]);
    });
});

describe("relaxamento (US017 C3)", () => {
    it("só com títulos em conflito, devolve todos", () => {
        expect(kept(["comedy"], title(1, COMEDY, HORROR), title(2, COMEDY, WAR))).toEqual([1, 2]);
    });

    it("a ordem por pureza continua valendo depois de relaxar", () => {
        const relaxed = withoutConflicts(
            [title(1, COMEDY, HORROR, WAR), title(2, COMEDY, HORROR)],
            ["comedy"],
        );
        expect(rankByPurity(relaxed, 7, ["comedy"]).map((t) => t.id)).toEqual([2, 1]);
    });
});

describe("rankByPurity (US017 RNE002)", () => {
    it("o desconto é a constante aprovada", () => {
        expect(EXTRA_GENRE_PENALTY).toBe(0.1);
    });

    it("conta como extras só os gêneros não pedidos", () => {
        expect(extraGenreCount(title(1, COMEDY, DRAMA, CRIME), ["comedy"])).toBe(2);
        expect(extraGenreCount(title(1, COMEDY, DRAMA, CRIME), ["comedy", "drama"])).toBe(1);
        expect(extraGenreCount(title(1, THRILLER, MYSTERY), ["suspense"])).toBe(0);
    });

    it("com a mesma nota, menos gêneros extras vem primeiro", () => {
        const ranked = rankByPurity(
            [title(1, COMEDY, DRAMA, CRIME), title(2, COMEDY), title(3, COMEDY, DRAMA)],
            7,
            ["comedy"],
        );
        expect(ranked.map((t) => t.id)).toEqual([2, 3, 1]);
    });

    it("nota bem maior com gêneros extras ainda vence", () => {
        const acclaimed = { ...title(1, COMEDY, DRAMA, CRIME), rating: 9 };
        const pure = { ...title(2, COMEDY), rating: 7 };
        expect(rankByPurity([pure, acclaimed], 7, ["comedy"]).map((t) => t.id)).toEqual([1, 2]);
    });

    it("empate exato vai para mais votos e depois menor id", () => {
        const a = { ...title(3, COMEDY), rating: 7, votes: 1000 };
        const b = { ...title(2, COMEDY), rating: 7, votes: 2000 };
        const c = { ...title(1, COMEDY), rating: 7, votes: 1000 };
        expect(rankByPurity([a, b, c], 7, ["comedy"]).map((t) => t.id)).toEqual([2, 1, 3]);
    });
});
