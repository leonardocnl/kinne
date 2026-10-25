import { describe, expect, it } from "vitest";
import { drawSurprise, type SurpriseCandidate, type SurpriseRequest } from "./surprise";

const title = (id: number, extra: Partial<SurpriseCandidate> = {}): SurpriseCandidate => ({
    id,
    slug: `titulo-${id}`,
    rating: 8,
    votes: 1000,
    streamingTmdbIds: [8],
    adult: false,
    ...extra,
});

const none: SurpriseRequest = { streamings: [], watched: [], shown: [] };

// Sorteia muitas vezes e devolve os ids que saíram.
const drawn = (candidates: SurpriseCandidate[], request: SurpriseRequest) =>
    new Set(
        Array.from({ length: 200 }, (_, i) => drawSurprise(candidates, request, () => i / 200)?.id),
    );

describe("drawSurprise", () => {
    it("só sorteia nota 7,5 ou mais, com o resto do piso", () => {
        const pool = [
            title(1, { rating: 7.4 }),
            title(2, { votes: 499 }),
            title(3, { streamingTmdbIds: [] }),
            title(4, { rating: 7.5 }),
        ];
        expect(drawn(pool, none)).toEqual(new Set([4]));
    });

    it("respeita os streamings salvos; nenhum salvo vale como todos (US003 C2)", () => {
        const pool = [title(1, { streamingTmdbIds: [8] }), title(2, { streamingTmdbIds: [307] })];
        expect(drawn(pool, { ...none, streamings: ["globoplay"] })).toEqual(new Set([2]));
        expect(drawn(pool, { ...none, streamings: ["netflix", "globoplay"] })).toEqual(
            new Set([1, 2]),
        );
        expect(drawn(pool, none)).toEqual(new Set([1, 2]));
    });

    it("nunca sorteia um título marcado como já visto (US005 C3)", () => {
        const pool = [title(1), title(2)];
        expect(drawn(pool, { ...none, watched: [1] })).toEqual(new Set([2]));
        expect(drawSurprise(pool, { ...none, watched: [1, 2] })).toBeNull();
    });

    it("não repete o que já foi mostrado na sessão enquanto houver outro (US003 C3)", () => {
        const pool = [title(1), title(2), title(3)];
        expect(drawn(pool, { ...none, shown: [1, 3] })).toEqual(new Set([2]));
        expect(drawn(pool, { ...none, shown: [1, 2, 3], watched: [3] })).toEqual(new Set([1, 2]));
    });
});

describe("surpresa sem títulos 18 (recommendation-rounds A2)", () => {
    it("nunca sorteia um título 18, nem quando é o único", () => {
        expect(drawSurprise([title(1, { adult: true })], none)).toBeNull();
        expect(drawSurprise([title(1, { adult: true }), title(2)], none, () => 0)?.id).toBe(2);
    });
});

describe("drawSurprise com gosto (US009 C3)", () => {
    // 60 títulos de nota 8; o gosto alcança 40 deles, em ordem decrescente de id
    const pool = Array.from({ length: 60 }, (_, i) => title(i + 1));
    const scores = new Map(Array.from({ length: 40 }, (_, i) => [i + 1, 40 - i] as const));
    const drawnWithTaste = (candidates: SurpriseCandidate[], request = none) =>
        new Set(
            Array.from(
                { length: 400 },
                (_, i) => drawSurprise(candidates, request, () => i / 400, scores)?.id,
            ),
        );

    it("sorteia só entre os 30 primeiros na ordem do gosto", () => {
        const ids = drawnWithTaste(pool);
        expect(ids.size).toBe(30);
        expect([...ids].every((id) => id !== undefined && id <= 30)).toBe(true);
    });

    it("sem pontuação positiva, é o sorteio de sempre", () => {
        const noReach = new Map([[1, -1]]);
        const ids = new Set(
            Array.from(
                { length: 400 },
                (_, i) => drawSurprise(pool, none, () => i / 400, noReach)?.id,
            ),
        );
        expect(ids.size).toBe(60);
    });

    it("o piso não muda: o alcançado com nota abaixo de 7,5 não sai", () => {
        const low = [
            title(1, { rating: 7.4 }),
            ...Array.from({ length: 5 }, (_, i) => title(i + 2)),
        ];
        const ids = drawnWithTaste(low);
        expect(ids.has(1)).toBe(false);
    });

    it("marcados e 18+ continuam de fora, e os já mostrados só voltam se não sobrar nada", () => {
        const mixed = [title(1), title(2, { adult: true }), title(3), title(4)];
        const request = { ...none, watched: [1], shown: [3] };
        expect(drawnWithTaste(mixed, request)).toEqual(new Set([4]));
        const onlyShown = { ...none, shown: [1, 3, 4] };
        expect(drawnWithTaste(mixed, onlyShown).has(2)).toBe(false);
    });
});
