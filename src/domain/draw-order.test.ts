import { describe, expect, it } from "vitest";
import { orderByFeeling, orderByTaste, orderByTasteAndFeeling } from "./draw-order";
import { feelingKit, type FeelingData } from "./feelings";

const HORROR = 27;
const COMEDY = 35;
const T = { possession: 1, haunted: 2, filler: 3 };

// cinco títulos de terror: 1 e 2 têm temas da receita de "Pra tomar susto"; 3 a 5 não
const data: FeelingData = {
    profiles: [
        {
            id: 1,
            genreTmdbIds: [HORROR],
            themeTmdbIds: [T.possession, T.haunted],
            certification: "16",
        },
        { id: 2, genreTmdbIds: [HORROR], themeTmdbIds: [T.possession], certification: "16" },
        { id: 3, genreTmdbIds: [HORROR], themeTmdbIds: [T.filler], certification: "16" },
        { id: 4, genreTmdbIds: [HORROR], themeTmdbIds: [], certification: "16" },
        { id: 5, genreTmdbIds: [HORROR, COMEDY], themeTmdbIds: [], certification: "16" },
    ],
    themeIdsByName: [
        ["possession", T.possession],
        ["haunted house", T.haunted],
    ],
};
const kit = feelingKit("scare", data);

const title = (id: number, rating = 7, votes = 1000) => ({ id, rating, votes });
const ids = (list: { id: number }[]) => list.map((t) => t.id);

describe("orderByFeeling (US008 RNE002)", () => {
    it("põe na frente quem tem os temas da receita, mesmo com nota menor", () => {
        const titles = [title(3, 8), title(4, 8), title(2, 7), title(1, 6.8)];
        expect(ids(orderByFeeling(titles, 7, kit)).slice(0, 2)).toEqual([1, 2]);
    });

    it("mantém todos os títulos recebidos, sem acrescentar nenhum", () => {
        const titles = [title(1), title(2), title(3), title(99)];
        const out = ids(orderByFeeling(titles, 7, kit));
        expect([...out].sort((a, b) => a - b)).toEqual([1, 2, 3, 99]);
    });

    it("é determinística", () => {
        const titles = [title(3), title(2), title(1), title(4)];
        expect(ids(orderByFeeling(titles, 7, kit))).toEqual(ids(orderByFeeling(titles, 7, kit)));
    });
});

describe("orderByTaste (US009 RNE002)", () => {
    it("sem pontuação positiva, devolve null: vale a ordem de hoje", () => {
        expect(orderByTaste([title(1), title(2)], 7, new Map())).toBeNull();
        expect(orderByTaste([title(1)], 7, new Map([[1, -0.5]]))).toBeNull();
    });

    it("o que o gosto alcança vem antes, mesmo com nota menor; o neutro depois; o negativo por último", () => {
        const scores = new Map([
            [1, 0.9],
            [2, -0.4],
        ]);
        const titles = [title(2, 9), title(3, 8), title(1, 6.5)];
        expect(ids(orderByTaste(titles, 7, scores)!)).toEqual([1, 3, 2]);
    });
});

describe("orderByTasteAndFeeling (US009 RNE004)", () => {
    it("a metade de baixo da afinidade vai para o fim, mesmo que o gosto a alcance", () => {
        // afinidade: 1 > 2 > 3 > 4; o gosto alcança o 1 (cima) e o 4 (baixo)
        const titles = [title(4), title(3), title(2), title(1)];
        const scores = new Map([
            [1, 0.5],
            [4, 1],
        ]);
        expect(ids(orderByTasteAndFeeling(titles, 7, scores, kit))).toEqual([1, 2, 4, 3]);
    });

    it("dentro da metade de cima, quem o gosto alcança vem primeiro", () => {
        const titles = [title(1), title(2), title(3), title(4)];
        const scores = new Map([[2, 1]]);
        expect(ids(orderByTasteAndFeeling(titles, 7, scores, kit))[0]).toBe(2);
    });

    it("sem alcance do gosto, vale a ordem do sentimento", () => {
        const titles = [title(3, 8), title(4, 8), title(2, 7), title(1, 6.8)];
        expect(ids(orderByTasteAndFeeling(titles, 7, new Map(), kit))).toEqual(
            ids(orderByFeeling(titles, 7, kit)),
        );
    });
});
