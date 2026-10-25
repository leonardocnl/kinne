import { describe, expect, it } from "vitest";
import { DEFAULT_FILTERS } from "@/domain/filters";
import { summarize } from "./filtersSummary";

describe("summarize (US002 C1)", () => {
    it("sem seleção: Qualquer, Nenhum e os valores padrão", () => {
        expect(summarize(DEFAULT_FILTERS)).toEqual({
            streamings: "Qualquer",
            type: "Os dois",
            genres: "Qualquer",
            rating: "Sem 18+",
            person: "Nenhum",
            minRating: "6,4",
            runtime: "Qualquer",
        });
    });

    it("com seleção: nomes na ordem do catálogo, em texto", () => {
        const s = summarize({
            ...DEFAULT_FILTERS,
            streamings: ["max", "netflix"],
            type: "movie",
            genres: ["drama", "action"],
            adult: true,
            person: { id: 31, name: "Tom Hanks", role: "cast" },
            minRating: 7.25,
            maxRuntime: 105,
        });
        expect(s).toMatchObject({
            streamings: "Netflix, Max",
            type: "Filmes",
            genres: "Ação, Drama",
            rating: "Com 18+",
            person: "Tom Hanks",
            runtime: "até 1h45",
        });
    });
});
