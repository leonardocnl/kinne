import { describe, expect, it } from "vitest";
import {
    chooseDailyPicks,
    DAILY_PICK_GENRES,
    pickPhrase,
    rotationSeconds,
    type PickCandidate,
} from "./daily-picks";
import { addDays, parseDay } from "./day";
import type { KinneGenre } from "./genre";

const today = parseDay("2026-10-10");

const title = (id: number, genres: KinneGenre[], extra: Partial<PickCandidate> = {}) => ({
    id,
    type: "movie" as const,
    genres,
    rating: 7.5,
    votes: 2000,
    onStreaming: true,
    ...extra,
});

// Dez títulos por gênero, ids 100..149.
const catalog: PickCandidate[] = DAILY_PICK_GENRES.flatMap((genre, g) =>
    Array.from({ length: 10 }, (_, i) => title(100 + g * 10 + i, [genre])),
);

const nextDays = (count: number) => Array.from({ length: count }, (_, i) => addDays(today, i));

describe("chooseDailyPicks", () => {
    it("escolhe um título por gênero, na ordem da tela", () => {
        const { picks, warnings } = chooseDailyPicks(today, catalog, []);
        expect(picks.map((p) => p.genre)).toEqual([
            "comedy",
            "drama",
            "action",
            "romance",
            "suspense",
        ]);
        for (const pick of picks) {
            expect(catalog.find((c) => c.id === pick.titleId)?.genres).toContain(pick.genre);
        }
        expect(warnings).toEqual([]);
    });

    it("é determinística: mesmo dia e mesmos dados dão o mesmo resultado, em qualquer ordem", () => {
        const first = chooseDailyPicks(today, catalog, []);
        expect(chooseDailyPicks(today, catalog, [])).toEqual(first);
        expect(chooseDailyPicks(today, catalog.toReversed(), [])).toEqual(first);
    });

    it("muda de um dia para o outro", () => {
        const results = nextDays(10).map((day) =>
            JSON.stringify(chooseDailyPicks(day, catalog, []).picks),
        );
        expect(new Set(results).size).toBeGreaterThan(1);
    });

    it("não repete um título indicado nos últimos 60 dias, em qualquer gênero", () => {
        const comedy = [title(1, ["comedy"]), title(2, ["comedy"])];
        const others = catalog.filter((c) => !c.genres.includes("comedy"));
        for (const day of nextDays(20)) {
            const history = [
                { day: addDays(day, -60), titleId: 1 },
                { day: addDays(day, -1), titleId: 140 },
            ];
            const { picks, warnings } = chooseDailyPicks(day, [...comedy, ...others], history);
            expect(picks[0].titleId).toBe(2);
            expect(picks.map((p) => p.titleId)).not.toContain(140);
            expect(warnings).toEqual([]);
        }
    });

    it("libera o título depois dos 60 dias", () => {
        const others = catalog.filter((c) => !c.genres.includes("comedy"));
        const history = [{ day: addDays(today, -61), titleId: 1 }];
        const { picks, warnings } = chooseDailyPicks(
            today,
            [title(1, ["comedy"]), ...others],
            history,
        );
        expect(picks[0].titleId).toBe(1);
        expect(warnings).toEqual([]);
    });

    it("não repete um título no mesmo dia, mesmo quando ele serve a vários gêneros", () => {
        const everything = Array.from({ length: 5 }, (_, i) =>
            title(i + 1, [...DAILY_PICK_GENRES]),
        );
        for (const day of nextDays(20)) {
            const ids = chooseDailyPicks(day, everything, []).picks.map((p) => p.titleId);
            expect(new Set(ids).size).toBe(5);
        }
    });

    it("indica só filme em romance", () => {
        const series = Array.from({ length: 9 }, (_, i) =>
            title(i + 1, ["romance"], { type: "series" }),
        );
        const others = catalog.filter((c) => !c.genres.includes("romance"));
        const pool = [...series, title(50, ["romance"]), ...others];
        for (const day of nextDays(20)) {
            expect(chooseDailyPicks(day, pool, []).picks[3]).toEqual({
                genre: "romance",
                titleId: 50,
            });
        }
    });

    it("ignora a janela de 60 dias do gênero sem candidato e registra um aviso", () => {
        const others = catalog.filter((c) => !c.genres.includes("drama"));
        const history = [{ day: addDays(today, -3), titleId: 1 }];
        const { picks, warnings } = chooseDailyPicks(
            today,
            [title(1, ["drama"]), ...others],
            history,
        );
        expect(picks[1]).toEqual({ genre: "drama", titleId: 1 });
        expect(warnings).toHaveLength(1);
        expect(warnings[0]).toContain("drama");
    });

    it("só sorteia títulos no piso e em algum streaming", () => {
        const others = catalog.filter((c) => !c.genres.includes("suspense"));
        const pool = [
            title(1, ["suspense"], { rating: 6.3 }),
            title(2, ["suspense"], { votes: 499 }),
            title(3, ["suspense"], { onStreaming: false }),
            title(4, ["suspense"]),
            ...others,
        ];
        for (const day of nextDays(20)) {
            expect(chooseDailyPicks(day, pool, []).picks[4].titleId).toBe(4);
        }
    });

    it("falha quando um gênero não tem nenhum título no piso", () => {
        const others = catalog.filter((c) => !c.genres.includes("action"));
        expect(() => chooseDailyPicks(today, others, [])).toThrow("action");
    });
});

describe("pickPhrase", () => {
    it("usa a tagline", () => {
        expect(pickPhrase("Fuja.", "Chris visita a família. Algo está errado.")).toBe("Fuja.");
    });

    it("sem tagline, usa a primeira frase da sinopse", () => {
        expect(pickPhrase(null, "Chris visita a família. Algo está errado.")).toBe(
            "Chris visita a família.",
        );
        expect(pickPhrase("  ", "Uma frase só")).toBe("Uma frase só");
        expect(pickPhrase(null, null)).toBe("");
    });
});

describe("rotationSeconds", () => {
    it("soma 1 s a cada 3 palavras aos 3 s, entre 5 e 10 s", () => {
        expect(rotationSeconds("Fuja.")).toBe(5);
        expect(rotationSeconds("um dois três quatro five seis sete oito nove")).toBe(6);
        expect(rotationSeconds(Array(30).fill("palavra").join(" "))).toBe(10);
    });
});
