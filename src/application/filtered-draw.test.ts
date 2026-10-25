import { describe, expect, it } from "vitest";
import { DEFAULT_FILTERS, wireFilters } from "@/domain/filters";
import { feelingKit, FEELINGS, type FeelingData } from "@/domain/feelings";
import { EMPTY_TASTE } from "@/domain/taste-signals";
import { KINNE_GENRES, type KinneGenre } from "@/domain/genre";
import { planFilteredRounds } from "./filtered-draw";
import type { Candidate } from "./titles";

const bit = (f: (typeof FEELINGS)[number]) => 1 << FEELINGS.indexOf(f);

const title = (id: number, extra: Partial<Candidate> = {}): Candidate => ({
    id,
    slug: `t-${id}`,
    type: "movie",
    rating: 7,
    votes: 1000 - id,
    runtimeMinutes: 100,
    kinneGenres: ["drama"],
    streamingTmdbIds: [8],
    adult: false,
    feelings: 0b111111111,
    ...extra,
});

const criteria = (extra: object = {}) => ({ ...wireFilters(DEFAULT_FILTERS), ...extra });
const plan = (candidates: Candidate[], filters: object = {}, feeling = null as never) =>
    planFilteredRounds(
        { candidates, person: null, feeling, graph: null },
        criteria(filters),
        [],
        EMPTY_TASTE,
    );

describe("planFilteredRounds com sentimento (US008)", () => {
    // 40 títulos, 8 de cada gênero; só os pares aceitam "Pra chorar"
    const pool = Array.from({ length: 40 }, (_, i) =>
        title(i + 1, {
            kinneGenres: [KINNE_GENRES[i % 5] as KinneGenre],
            feelings: i % 2 === 0 ? bit("cry") : bit("laugh"),
        }),
    );

    it("C3/C4: só entram os títulos que o sentimento aceita, junto com o gênero", () => {
        const { matching } = plan(pool, { feeling: "cry" });
        expect(matching.every((t) => t.feelings & bit("cry"))).toBe(true);
        expect(matching).toHaveLength(20);
        const drama = plan(pool, { feeling: "cry", genres: ["drama"] }).matching;
        expect(drama.every((t) => t.kinneGenres.includes("drama"))).toBe(true);
    });

    it("RNE003: com sentimento, sem as cotas por gênero: as rodadas são fatias da ordem", () => {
        const { rounds } = plan(pool, { feeling: "cry" });
        expect(rounds.map((r) => r.length)).toEqual([10, 10]);
        // sem sentimento, a primeira rodada tem 2 de cada gênero
        const without = plan(pool).rounds[0];
        const perGenre = KINNE_GENRES.map(
            (g) => without.filter((t) => t.kinneGenres.includes(g)).length,
        );
        expect(perGenre.every((n) => n === 2)).toBe(true);
    });

    it("sem sentimento nada muda: mesmas rodadas de hoje", () => {
        const a = plan(pool).rounds.map((r) => r.map((t) => t.id));
        const b = plan(pool, { feeling: null }).rounds.map((r) => r.map((t) => t.id));
        expect(a).toEqual(b);
    });

    it("RNE002: com a receita, a afinidade manda mais que a nota", () => {
        const data: FeelingData = {
            profiles: [
                { id: 1, genreTmdbIds: [27], themeTmdbIds: [10, 11], certification: "16" },
                { id: 2, genreTmdbIds: [27], themeTmdbIds: [], certification: "16" },
                { id: 3, genreTmdbIds: [27], themeTmdbIds: [], certification: "16" },
            ],
            themeIdsByName: [
                ["possession", 10],
                ["haunted house", 11],
            ],
        };
        const kit = feelingKit("scare", data);
        const candidates = [
            title(1, { rating: 6.6, feelings: bit("scare") }),
            title(2, { rating: 8.5, feelings: bit("scare") }),
            title(3, { rating: 8.4, feelings: bit("scare") }),
        ];
        const { rounds } = plan(candidates, { feeling: "scare" }, kit as never);
        expect(rounds[0][0].id).toBe(1);
    });

    it("C5: nenhum título combina com o sentimento e os filtros", () => {
        const { matching, rounds } = plan(pool, { feeling: "scare" });
        expect(matching).toHaveLength(0);
        expect(rounds).toEqual([]);
    });

    it("se os dados do sentimento não carregam, segue pela nota, sem erro", () => {
        const { rounds } = plan(pool, { feeling: "cry" }, null as never);
        expect(rounds[0]).toHaveLength(10);
    });
});
