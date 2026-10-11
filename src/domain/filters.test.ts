import { describe, expect, it } from "vitest";
import {
    DEFAULT_FILTERS,
    drawUnseen,
    endOfOptionsHeading,
    filterTitles,
    parseFilters,
    withType,
    type FilterCandidate,
    type Filters,
} from "./filters";

const title = (id: number, extra: Partial<FilterCandidate> = {}): FilterCandidate => ({
    id,
    type: "movie",
    rating: 7,
    votes: 1000,
    runtimeMinutes: 100,
    kinneGenres: ["drama"],
    streamingTmdbIds: [8],
    ...extra,
});

const ids = (pool: FilterCandidate[], filters: Partial<Filters> = {}, watched: number[] = []) =>
    filterTitles(pool, { ...DEFAULT_FILTERS, ...filters }, watched).top.map((t) => t.id);

const count = (pool: FilterCandidate[], filters: Partial<Filters> = {}, watched: number[] = []) =>
    filterTitles(pool, { ...DEFAULT_FILTERS, ...filters }, watched).count;

describe("filterTitles", () => {
    it("começa em Os dois, sem gênero, nota 6,4 e duração Qualquer (US002 C1)", () => {
        expect(DEFAULT_FILTERS).toEqual({
            streamings: [],
            type: "both",
            genres: [],
            minRating: 6.4,
            maxRuntime: null,
        });
    });

    it("conta o que passa no piso e nos filtros, sem os marcados (US002 C3, RNG004)", () => {
        const pool = [
            title(1),
            title(2, { votes: 499 }),
            title(3, { streamingTmdbIds: [] }),
            title(4, { rating: 6.3 }),
            title(5),
        ];
        expect(count(pool)).toBe(2);
        expect(count(pool, {}, [5])).toBe(1);
        expect(count(pool, {}, [1, 5])).toBe(0);
    });

    it("streamings e gêneros valem como qualquer um; nenhum marcado vale todos (RNE001)", () => {
        const pool = [
            title(1, { streamingTmdbIds: [8], kinneGenres: ["action"] }),
            title(2, { streamingTmdbIds: [307], kinneGenres: ["comedy"] }),
            title(3, { streamingTmdbIds: [119], kinneGenres: ["drama", "comedy"] }),
        ];
        expect(ids(pool, { streamings: ["globoplay"] })).toEqual([2]);
        expect(ids(pool, { streamings: ["netflix", "globoplay"] }).sort()).toEqual([1, 2]);
        expect(ids(pool, { genres: ["comedy"] }).sort()).toEqual([2, 3]);
        expect(ids(pool, { genres: ["action", "drama"] }).sort()).toEqual([1, 3]);
        expect(count(pool)).toBe(3);
    });

    it("a nota do slider substitui o 6,4; votos e streaming continuam valendo (RNE002)", () => {
        const pool = [title(1, { rating: 7.1 }), title(2, { rating: 7.2 }), title(3)];
        expect(ids(pool, { minRating: 7.2 })).toEqual([2]);
        expect(count([title(1, { rating: 9, votes: 10 })], { minRating: 7 })).toBe(0);
    });

    it("filtra por tipo", () => {
        const pool = [title(1), title(2, { type: "series" })];
        expect(ids(pool, { type: "movie" })).toEqual([1]);
        expect(ids(pool, { type: "series" })).toEqual([2]);
        expect(count(pool, { type: "both" })).toBe(2);
    });

    it("a duração é um teto; Qualquer não limita; filme sem duração só entra sem teto (RNE004)", () => {
        const pool = [
            title(1, { runtimeMinutes: 90 }),
            title(2, { runtimeMinutes: 91 }),
            title(3, { runtimeMinutes: null }),
        ];
        expect(ids(pool, { type: "movie", maxRuntime: 90 })).toEqual([1]);
        expect(count(pool, { type: "movie", maxRuntime: 105 })).toBe(2);
        expect(count(pool, { type: "movie", maxRuntime: null })).toBe(3);
    });

    it("desconsidera a duração com Séries ou Os dois (US002 C2)", () => {
        const pool = [title(1, { runtimeMinutes: 150 }), title(2, { type: "series" })];
        expect(count(pool, { type: "both", maxRuntime: 90 })).toBe(2);
        expect(count(pool, { type: "series", maxRuntime: 90 })).toBe(1);
    });

    it("com Os dois, Romance só traz filmes; os demais gêneros trazem os dois (US002 C8)", () => {
        const pool = [
            title(1, { kinneGenres: ["romance"] }),
            title(2, { type: "series", kinneGenres: ["romance"] }),
            title(3, { type: "series", kinneGenres: ["drama"] }),
        ];
        expect(ids(pool, { genres: ["romance"] })).toEqual([1]);
        expect(ids(pool, { genres: ["romance", "drama"] }).sort()).toEqual([1, 3]);
    });

    it("guarda os 10 de maior nota; empate vai para mais votos e depois menor id (RNE003)", () => {
        const pool = [
            ...Array.from({ length: 9 }, (_, i) => title(i + 1, { rating: 9 })),
            title(20, { rating: 8, votes: 1000 }),
            title(11, { rating: 8, votes: 2000 }),
            title(10, { rating: 8, votes: 2000 }),
            title(30, { rating: 6.5 }),
        ];
        const { count: n, top } = filterTitles(pool, DEFAULT_FILTERS, []);
        expect(n).toBe(13);
        expect(top.map((t) => t.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });
});

describe("withType", () => {
    it("com Séries, desmarca Romance (US002 C8)", () => {
        const filters = { ...DEFAULT_FILTERS, genres: ["romance", "drama"] } satisfies Filters;
        expect(withType(filters, "series").genres).toEqual(["drama"]);
        expect(withType(filters, "both").genres).toEqual(["romance", "drama"]);
    });
});

describe("drawUnseen", () => {
    const top = [title(1), title(2), title(3)];

    it("sorteia só entre os que ainda não foram mostrados (US004 C2)", () => {
        expect(drawUnseen(top, [1, 3], () => 0)?.id).toBe(2);
        expect(drawUnseen(top, [1, 3], () => 0.99)?.id).toBe(2);
        expect(drawUnseen(top, [], () => 0.99)?.id).toBe(3);
    });

    it("devolve null quando todos já foram mostrados (US004 C3)", () => {
        expect(drawUnseen(top, [1, 2, 3])).toBeNull();
        expect(drawUnseen([], [])).toBeNull();
    });
});

describe("endOfOptionsHeading", () => {
    it("diz quantos foram vistos, com menos de 10 quando poucos combinam (US004 C3)", () => {
        expect(endOfOptionsHeading(10)).toBe("Você viu as 10 melhores para esses filtros");
        expect(endOfOptionsHeading(3)).toBe("Você viu as 3 melhores para esses filtros");
        expect(endOfOptionsHeading(1)).toBe("Você viu a melhor opção para esses filtros");
    });

    it("sem nenhum título, diz que nada combina mais", () => {
        expect(endOfOptionsHeading(0)).toBe("Nenhum título combina mais com esses filtros");
    });
});

describe("parseFilters", () => {
    const ok = {
        streamings: ["netflix"],
        type: "movie",
        genres: ["drama"],
        minRating: 7.2,
        maxRuntime: 105,
    };

    it("aceita filtros no formato e nos limites de cada campo", () => {
        expect(parseFilters(ok)).toEqual(ok);
        expect(parseFilters(DEFAULT_FILTERS)).toEqual(DEFAULT_FILTERS);
        expect(parseFilters({ ...ok, minRating: 7.199999999 })?.minRating).toBe(7.2);
    });

    it.each([
        ["nada", null],
        ["streaming desconhecido", { ...ok, streamings: ["apple-tv"] }],
        ["streaming repetido", { ...ok, streamings: ["netflix", "netflix"] }],
        ["tipo desconhecido", { ...ok, type: "anime" }],
        ["gênero desconhecido", { ...ok, genres: ["terror"] }],
        ["nota abaixo do piso", { ...ok, minRating: 6.3 }],
        ["nota acima de 9", { ...ok, minRating: 9.1 }],
        ["nota que não é número", { ...ok, minRating: "7" }],
        ["duração fora do slider", { ...ok, maxRuntime: 100 }],
        ["campo faltando", { ...ok, maxRuntime: undefined }],
    ])("recusa %s", (_, value) => {
        expect(parseFilters(value)).toBeNull();
    });
});
