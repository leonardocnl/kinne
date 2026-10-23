import { describe, expect, it } from "vitest";
import {
    EMPTY_TASTE,
    hasPositiveSignal,
    MAX_TITLE_ID,
    normalizeTaste,
    recordSignal,
    TASTE_LIST_MAX,
    toSignals,
} from "./taste-signals";

describe("recordSignal", () => {
    it("guarda o sinal na lista dele", () => {
        expect(recordSignal(EMPTY_TASTE, 5, "liked").liked).toEqual([5]);
        expect(recordSignal(EMPTY_TASTE, 5, "will_watch").willWatch).toEqual([5]);
        expect(recordSignal(EMPTY_TASTE, 5, "disliked").disliked).toEqual([5]);
    });

    it("um título fica numa lista só: o sinal mais recente vale (US010 RNE001)", () => {
        const liked = recordSignal(EMPTY_TASTE, 5, "liked");
        const changed = recordSignal(liked, 5, "disliked");
        expect(changed).toEqual({ liked: [], willWatch: [], disliked: [5] });
    });

    it("guarda os 200 mais recentes", () => {
        let lists = EMPTY_TASTE;
        for (let id = 1; id <= TASTE_LIST_MAX + 5; id++) lists = recordSignal(lists, id, "liked");
        expect(lists.liked).toHaveLength(TASTE_LIST_MAX);
        expect(lists.liked[0]).toBe(6);
        expect(lists.liked.at(-1)).toBe(TASTE_LIST_MAX + 5);
    });

    it("ignora id inválido", () => {
        expect(recordSignal(EMPTY_TASTE, -1, "liked")).toEqual(EMPTY_TASTE);
        expect(recordSignal(EMPTY_TASTE, 1.5, "liked")).toEqual(EMPTY_TASTE);
    });
});

describe("normalizeTaste (A3)", () => {
    it("descarta tipos errados, negativos, decimais e ids fora do inteiro do banco", () => {
        const lists = normalizeTaste({
            liked: [1, "2", -3, 4.5, null, MAX_TITLE_ID + 1, 5],
            willWatch: "texto",
            disliked: { 0: 1 },
        });
        expect(lists).toEqual({ liked: [1, 5], willWatch: [], disliked: [] });
    });

    it("colapsa repetidos", () => {
        expect(normalizeTaste({ liked: [1, 2, 1, 2, 3] }).liked).toEqual([1, 2, 3]);
    });

    it("um id em duas listas fica na mais negativa", () => {
        const lists = normalizeTaste({ liked: [1, 2, 3], willWatch: [2, 3], disliked: [3] });
        expect(lists).toEqual({ liked: [1], willWatch: [2], disliked: [3] });
    });

    it("limita a 200 por lista, mantendo os mais recentes", () => {
        const many = Array.from({ length: 600 }, (_, i) => i + 1);
        const lists = normalizeTaste({ liked: many });
        expect(lists.liked).toHaveLength(TASTE_LIST_MAX);
        expect(lists.liked.at(-1)).toBe(600);
    });

    it("lixo vira lista vazia", () => {
        for (const junk of [null, undefined, 3, "x", []]) {
            expect(normalizeTaste(junk)).toEqual(EMPTY_TASTE);
        }
    });
});

describe("toSignals e hasPositiveSignal", () => {
    it("traduz as listas para os sinais do grafo", () => {
        expect(toSignals({ liked: [1], willWatch: [2], disliked: [3] })).toEqual([
            { titleId: 1, signal: "liked" },
            { titleId: 2, signal: "will_watch" },
            { titleId: 3, signal: "disliked" },
        ]);
    });

    it("só curti e vou assistir contam como positivos", () => {
        expect(hasPositiveSignal(EMPTY_TASTE)).toBe(false);
        expect(hasPositiveSignal({ ...EMPTY_TASTE, disliked: [1] })).toBe(false);
        expect(hasPositiveSignal({ ...EMPTY_TASTE, willWatch: [1] })).toBe(true);
        expect(hasPositiveSignal({ ...EMPTY_TASTE, liked: [1] })).toBe(true);
    });
});
