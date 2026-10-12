import { describe, expect, it, vi } from "vitest";
import type { SearchResult } from "@/domain/search";
import {
    searchTitles,
    type Admission,
    type CachedAnswer,
    type SearchRequest,
    type TitleSearchPorts,
    type TmdbHit,
} from "./title-search";

const matrix: SearchResult = {
    slug: "matrix-1999",
    title: "Matrix",
    year: 1999,
    type: "movie",
    posterPath: "/a.jpg",
};
const MATRIX_HIT: TmdbHit = { tmdbId: 603, type: "movie" };

class RateLimited extends Error {}

// Banco de mentira com o comportamento das portas reais: cache com "pending", fichas e disjuntor.
function fakePorts(over: Partial<TitleSearchPorts> = {}, catalogTitles: SearchResult[] = []) {
    const cache = new Map<string, CachedAnswer>();
    let tokens = 1_000;
    let breakerOpen = false;
    const ports = {
        catalog: vi.fn(async () => catalogTitles),
        catalogByTmdb: vi.fn(async (hits: TmdbHit[]) =>
            hits.some((h) => h.tmdbId === MATRIX_HIT.tmdbId) ? [matrix] : [],
        ),
        cached: vi.fn(async (k: string) => cache.get(k) ?? null),
        claim: vi.fn(async (k: string) => {
            if (cache.has(k)) return false;
            cache.set(k, { status: "pending" });
            return true;
        }),
        save: vi.fn(async (k: string, hits: TmdbHit[]) => {
            cache.set(k, { status: "done", hits });
        }),
        admit: vi.fn(async (): Promise<Admission> => {
            if (breakerOpen) return "open";
            if (tokens < 1) return "limited";
            tokens--;
            return "ok";
        }),
        tmdb: vi.fn(async (): Promise<TmdbHit[]> => [MATRIX_HIT]),
        isRateLimited: (e: unknown) => e instanceof RateLimited,
        tripBreaker: vi.fn(async () => {
            breakerOpen = true;
        }),
        count: vi.fn(),
        ...over,
    };
    return {
        ports,
        cache,
        setTokens: (n: number) => (tokens = n),
    };
}

const request = (over: Partial<SearchRequest> = {}): SearchRequest => ({
    term: "matrix",
    termHash: "h-matrix",
    clientKey: "client",
    fallback: true,
    ...over,
});

describe("searchTitles: catálogo primeiro", () => {
    it("com resultado no catálogo, o TMDB nem é consultado", async () => {
        const { ports } = fakePorts({}, [matrix]);
        expect(await searchTitles(request(), ports)).toEqual({
            kind: "results",
            results: [matrix],
        });
        expect(ports.cached).not.toHaveBeenCalled();
        expect(ports.tmdb).not.toHaveBeenCalled();
        expect(ports.count).toHaveBeenCalledWith("catalog_searches");
    });

    it("com o interruptor desligado (I2), só o catálogo: nada encontrado", async () => {
        const { ports } = fakePorts();
        expect(await searchTitles(request({ fallback: false }), ports)).toEqual({ kind: "none" });
        expect(ports.admit).not.toHaveBeenCalled();
        expect(ports.tmdb).not.toHaveBeenCalled();
    });
});

describe("searchTitles: TMDB", () => {
    it("título do TMDB que está no catálogo aparece como o título do catálogo", async () => {
        const { ports } = fakePorts();
        expect(await searchTitles(request(), ports)).toEqual({
            kind: "results",
            results: [matrix],
        });
    });

    it("G9: TMDB acha, mas o catálogo não mostra (inativo, bloqueado ou fora): 'não está'", async () => {
        const { ports } = fakePorts({
            tmdb: vi.fn(async (): Promise<TmdbHit[]> => [{ tmdbId: 1, type: "movie" }]),
        });
        expect(await searchTitles(request(), ports)).toEqual({ kind: "elsewhere" });
        expect(ports.catalogByTmdb).toHaveBeenCalledWith([{ tmdbId: 1, type: "movie" }]);
    });

    it("TMDB sem nada: 'nenhum título'", async () => {
        const { ports } = fakePorts({ tmdb: vi.fn(async () => []) });
        expect(await searchTitles(request(), ports)).toEqual({ kind: "none" });
    });

    it("G5: 'nada no TMDB' fica em cache e a repetição não chama o TMDB", async () => {
        const { ports } = fakePorts({ tmdb: vi.fn(async () => []) });
        await searchTitles(request(), ports);
        expect(ports.save).toHaveBeenCalledWith("h-matrix", []);
        expect(await searchTitles(request(), ports)).toEqual({ kind: "none" });
        expect(ports.tmdb).toHaveBeenCalledTimes(1);
        expect(ports.admit).toHaveBeenCalledTimes(1);
    });

    it("resposta em cache não gasta ficha nem chama o TMDB", async () => {
        const { ports, cache } = fakePorts();
        cache.set("h-matrix", { status: "done", hits: [MATRIX_HIT] });
        expect((await searchTitles(request(), ports)).kind).toBe("results");
        expect(ports.admit).not.toHaveBeenCalled();
        expect(ports.tmdb).not.toHaveBeenCalled();
    });

    it("G4: pedidos simultâneos do mesmo termo fazem uma chamada só ao TMDB", async () => {
        let release!: (hits: TmdbHit[]) => void;
        const tmdb = vi.fn(() => new Promise<TmdbHit[]>((resolve) => (release = resolve)));
        const { ports } = fakePorts({ tmdb });
        const answers = Promise.all([1, 2, 3, 4, 5].map(() => searchTitles(request(), ports)));
        await vi.waitFor(() => expect(tmdb).toHaveBeenCalled());
        release([MATRIX_HIT]);
        expect((await answers).map((a) => a.kind)).toEqual(Array(5).fill("results"));
        expect(tmdb).toHaveBeenCalledTimes(1);
    });

    it("G4: outra instância perguntando agora (pending) não gera nova chamada", async () => {
        const { ports, cache } = fakePorts();
        cache.set("h-matrix", { status: "pending" });
        expect(await searchTitles(request(), ports)).toEqual({ kind: "unavailable" });
        expect(ports.tmdb).not.toHaveBeenCalled();
    });

    it("G4: quem perde a marca 'pending' para outra instância não chama o TMDB", async () => {
        const { ports } = fakePorts({ claim: vi.fn(async () => false) });
        expect(await searchTitles(request(), ports)).toEqual({ kind: "unavailable" });
        expect(ports.tmdb).not.toHaveBeenCalled();
    });
});

describe("searchTitles: limites (B1, B2, E3)", () => {
    it("B1: sem ficha (visitante ou orçamento global), sem TMDB e mensagem neutra", async () => {
        const { ports, setTokens } = fakePorts();
        setTokens(0);
        expect(await searchTitles(request(), ports)).toEqual({ kind: "unavailable" });
        expect(ports.tmdb).not.toHaveBeenCalled();
        expect(ports.count).toHaveBeenCalledWith("rate_limited");
    });

    it("B1: o orçamento acaba no meio de uma rajada de termos únicos", async () => {
        const { ports, setTokens } = fakePorts({ tmdb: vi.fn(async () => []) });
        setTokens(3);
        const kinds = [];
        for (let i = 0; i < 6; i++) {
            kinds.push((await searchTitles(request({ termHash: `h${i}` }), ports)).kind);
        }
        expect(kinds).toEqual([
            "none",
            "none",
            "none",
            "unavailable",
            "unavailable",
            "unavailable",
        ]);
        expect(ports.tmdb).toHaveBeenCalledTimes(3);
    });

    it("B2: 429 do TMDB abre o disjuntor e as buscas seguintes nem tentam", async () => {
        const tmdb = vi.fn(async (): Promise<TmdbHit[]> => {
            throw new RateLimited();
        });
        const { ports } = fakePorts({ tmdb });
        expect(await searchTitles(request(), ports)).toEqual({ kind: "unavailable" });
        expect(ports.tripBreaker).toHaveBeenCalledTimes(1);
        expect(ports.count).toHaveBeenCalledWith("breaker_trips");
        expect(await searchTitles(request({ termHash: "outro" }), ports)).toEqual({
            kind: "unavailable",
        });
        expect(tmdb).toHaveBeenCalledTimes(1);
    });

    it("erro comum do TMDB não abre o disjuntor nem grava cache", async () => {
        const { ports } = fakePorts({
            tmdb: vi.fn(async (): Promise<TmdbHit[]> => {
                throw new Error("timeout");
            }),
        });
        expect(await searchTitles(request(), ports)).toEqual({ kind: "unavailable" });
        expect(ports.tripBreaker).not.toHaveBeenCalled();
        expect(ports.save).not.toHaveBeenCalled();
    });

    it("E3: limitador fora do ar falha fechado, sem TMDB", async () => {
        const { ports } = fakePorts({
            admit: vi.fn(async (): Promise<Admission> => {
                throw new Error("banco fora");
            }),
        });
        expect(await searchTitles(request(), ports)).toEqual({ kind: "unavailable" });
        expect(ports.tmdb).not.toHaveBeenCalled();
    });

    it("E3: sem chave do visitante (sem segredo), sem TMDB", async () => {
        const { ports } = fakePorts();
        expect(await searchTitles(request({ clientKey: null }), ports)).toEqual({
            kind: "unavailable",
        });
        expect(ports.admit).not.toHaveBeenCalled();
        expect(ports.tmdb).not.toHaveBeenCalled();
    });
});
