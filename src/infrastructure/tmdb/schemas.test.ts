import { describe, expect, it } from "vitest";
import { discoverPageSchema, movieDetailsSchema, seriesDetailsSchema } from "./schemas";

const movie = {
    id: 1,
    title: "Corra!",
    original_title: "Get Out",
    original_language: "en",
    tagline: "Fuja.",
    overview: "Um jovem visita a família da namorada.",
    poster_path: "/abc123.jpg",
    vote_average: 7.6,
    vote_count: 17000,
    release_date: "2017-02-24",
    runtime: 104,
    genres: [{ id: 53, name: "Suspense" }],
    keywords: { keywords: [{ id: 9, name: "racismo" }] },
    videos: {
        results: [{ site: "YouTube", type: "Trailer", key: "abcdefghijk", iso_639_1: "pt" }],
    },
    images: { backdrops: [{ file_path: "/b1.jpg", width: 1920, iso_639_1: null }] },
    credits: {
        cast: [{ id: 10, name: "Daniel Kaluuya", order: 0 }],
        crew: [{ id: 11, name: "Jordan Peele", job: "Director" }],
    },
    release_dates: { results: [{ iso_3166_1: "BR", release_dates: [{ certification: "14" }] }] },
    extra_key_from_tmdb: true,
};

const parse = (change: Record<string, unknown>) =>
    movieDetailsSchema.safeParse({ ...movie, ...change });

describe("movieDetailsSchema", () => {
    it("aceita um filme válido e ignora chaves que não usamos", () => {
        const r = parse({});
        expect(r.success).toBe(true);
        expect(r.data).not.toHaveProperty("extra_key_from_tmdb");
        expect(r.data?.release_date).toBe(2017);
    });

    it("A1: marcação fica como texto puro", () => {
        expect(parse({ overview: "<img src=x onerror=alert(1)>" }).data?.overview).toBe(
            "<img src=x onerror=alert(1)>",
        );
    });

    it.each([
        "//evil.com/x.jpg",
        "/../x.jpg",
        "https://evil.com/x.jpg",
        "/x.svg",
        "/a b.jpg",
        "/x.jpg?y",
    ])("A2: recusa o caminho de imagem %s (vira null)", (path) => {
        const r = parse({
            poster_path: path,
            images: { backdrops: [{ file_path: path, width: 1920, iso_639_1: null }] },
        });
        expect(r.success).toBe(true);
        expect(r.data?.poster_path).toBeNull();
        expect(r.data?.images.backdrops).toEqual([]);
    });

    it("A3: só vídeos do YouTube com chave de 11 caracteres", () => {
        const r = parse({
            videos: {
                results: [
                    { site: "Vimeo", type: "Trailer", key: "abcdefghijk", iso_639_1: "pt" },
                    { site: "YouTube", type: "Trailer", key: "abc", iso_639_1: "pt" },
                    { site: "YouTube", type: "Trailer", key: "abc/def?x=1", iso_639_1: "pt" },
                    { site: "YouTube", type: "Trailer", key: "ABC_def-123", iso_639_1: "en" },
                ],
            },
        });
        expect(r.data?.videos.results.map((v) => v.key)).toEqual(["ABC_def-123"]);
    });

    it("A4: tira bidi e zero-width do título", () => {
        expect(parse({ title: "‮Corra​!‏" }).data?.title).toBe("Corra!");
    });

    it("A5: campo opcional acima do limite vira null sem recusar o título", () => {
        const r = parse({ overview: "a".repeat(2001), tagline: "a".repeat(301) });
        expect(r.success).toBe(true);
        expect(r.data?.overview).toBeNull();
        expect(r.data?.tagline).toBeNull();
    });

    it("A5: nome de pessoa acima de 200 descarta só aquele crédito", () => {
        const r = parse({
            credits: {
                cast: [
                    { id: 10, name: "a".repeat(201), order: 0 },
                    { id: 12, name: "Allison Williams", order: 1 },
                ],
                crew: [],
            },
        });
        expect(r.data?.credits.cast.map((c) => c.id)).toEqual([12]);
    });

    it("A5: título obrigatório acima de 300 ou vazio recusa o título", () => {
        expect(parse({ title: "a".repeat(301) }).success).toBe(false);
        expect(parse({ title: "​" }).success).toBe(false);
    });

    it.each<[string, Record<string, unknown>]>([
        ["nota 11", { vote_average: 11 }],
        ["nota negativa", { vote_average: -1 }],
        ["votos negativos", { vote_count: -5 }],
        ["votos fracionários", { vote_count: 1.5 }],
        ["duração 10^9", { runtime: 1e9 }],
        ["ano 3000", { release_date: "3000-01-01" }],
        ["id negativo", { id: -1 }],
    ])("A6: recusa o título com %s", (_, change) => {
        expect(parse(change).success).toBe(false);
    });

    it("A6: data vazia vira ano null", () => {
        expect(parse({ release_date: "" }).data?.release_date).toBeNull();
    });
});

describe("seriesDetailsSchema", () => {
    it("aceita uma série válida", () => {
        const r = seriesDetailsSchema.safeParse({
            ...movie,
            name: "Dark",
            original_name: "Dark",
            first_air_date: "2017-12-01",
            episode_run_time: [60],
            keywords: { results: [] },
            content_ratings: { results: [{ iso_3166_1: "BR", rating: "16" }] },
        });
        expect(r.success).toBe(true);
        expect(r.data?.first_air_date).toBe(2017);
    });
});

describe("discoverPageSchema", () => {
    it("recusa ids inválidos", () => {
        const page = { page: 1, total_pages: 1, total_results: 1 };
        expect(discoverPageSchema.safeParse({ ...page, results: [{ id: 5 }] }).success).toBe(true);
        expect(discoverPageSchema.safeParse({ ...page, results: [{ id: "5" }] }).success).toBe(
            false,
        );
    });
});
