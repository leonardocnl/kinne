import { describe, expect, it } from "vitest";
import { drawSurprise, type SurpriseCandidate, type SurpriseRequest } from "./surprise";

const title = (id: number, extra: Partial<SurpriseCandidate> = {}): SurpriseCandidate => ({
    id,
    slug: `titulo-${id}`,
    rating: 8,
    votes: 1000,
    streamingTmdbIds: [8],
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
