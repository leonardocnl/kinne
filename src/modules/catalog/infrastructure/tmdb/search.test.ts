import { describe, expect, it, vi } from "vitest";
import { TmdbHttpError } from "./client";
import { searchTmdb, TmdbRateLimitedError } from "./search";

const respond = (status: number, body: unknown = {}) =>
    vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status }));

describe("searchTmdb (A6, B6, C4, D1)", () => {
    it("caminho fixo, termo só como valor, include_adult depois dele", async () => {
        const fetchFn = respond(200, { results: [] });
        await searchTmdb("x&include_adult=true", "token", fetchFn);
        const url = new URL(String(fetchFn.mock.calls[0][0]));
        expect(url.origin + url.pathname).toBe("https://api.themoviedb.org/3/search/multi");
        expect(url.searchParams.get("query")).toBe("x&include_adult=true");
        expect(url.searchParams.getAll("include_adult")).toEqual(["false"]);
        expect([...url.searchParams.keys()].at(-1)).toBe("include_adult");
        const init = fetchFn.mock.calls[0][1]!;
        expect(init.redirect).toBe("error");
        expect(init.signal).toBeInstanceOf(AbortSignal);
    });

    it("guarda só id e tipo, sem adultos, pessoas nem entradas inválidas", async () => {
        const fetchFn = respond(200, {
            results: [
                { id: 603, media_type: "movie", title: "<script>", adult: false },
                { id: 1399, media_type: "tv", name: "GoT" },
                { id: 9, media_type: "movie", adult: true },
                { id: 287, media_type: "person" },
                { id: -1, media_type: "movie" },
                { id: 603, media_type: "movie" },
            ],
        });
        expect(await searchTmdb("x", "t", fetchFn)).toEqual([
            { tmdbId: 603, type: "movie" },
            { tmdbId: 1399, type: "series" },
        ]);
    });

    it("429 vira TmdbRateLimitedError (abre o disjuntor)", async () => {
        await expect(searchTmdb("x", "t", respond(429))).rejects.toBeInstanceOf(
            TmdbRateLimitedError,
        );
    });

    it("outros erros trazem só status e caminho", async () => {
        const error = await searchTmdb("segredo", "t", respond(500)).catch((e) => e);
        expect(error).toBeInstanceOf(TmdbHttpError);
        expect(error.message).toBe("TMDB respondeu 500 em /search/multi");
    });

    it("resposta sem lista é erro, nunca 'nada encontrado'", async () => {
        await expect(searchTmdb("x", "t", respond(200, { oops: 1 }))).rejects.toThrow();
    });
});
