import { afterEach, describe, expect, it, vi } from "vitest";
import { TmdbCatalogSource } from "./catalog-source";
import type { TmdbClient } from "./client";

const CAP = 10_000;
const NETFLIX = 8;

type Params = Record<string, string | number>;

// Cliente falso: a listagem responde conforme a faixa de anos pedida.
function fakeSource(respond: (from: number | null, to: number | null) => number[] | "capped") {
    const calls: [number | null, number | null][] = [];
    const client = {
        requestCount: 0,
        get: async (_path: string, params: Params) => {
            const gte = params["primary_release_date.gte"];
            const lte = params["primary_release_date.lte"];
            const from = gte === undefined ? null : Number(String(gte).slice(0, 4));
            const to = lte === undefined ? null : Number(String(lte).slice(0, 4));
            calls.push([from, to]);
            const r = respond(from, to);
            return r === "capped"
                ? { page: 1, total_pages: 500, total_results: CAP, results: [] }
                : {
                      page: Number(params.page),
                      total_pages: 1,
                      total_results: r.length,
                      results: Number(params.page) === 1 ? r.map((id) => ({ id })) : [],
                  };
        },
    };
    return { source: new TmdbCatalogSource(client as unknown as TmdbClient), calls };
}

describe("TmdbCatalogSource.discover (B3)", () => {
    afterEach(() => vi.restoreAllMocks());

    it("lista direto quando cabe abaixo de 10.000", async () => {
        const { source, calls } = fakeSource(() => [1, 2, 3]);
        expect((await source.discover("movie", NETFLIX)).sort()).toEqual([1, 2, 3]);
        expect(calls).toEqual([[null, null]]);
    });

    it("divide por faixa de anos quando a resposta chega a 10.000 e junta os ids", async () => {
        // Faixas com mais de 50 anos estouram o limite; as menores têm um id (o ano inicial).
        const { source, calls } = fakeSource((from, to) =>
            from === null || to! - from > 50 ? "capped" : [from],
        );
        const ids = await source.discover("movie", NETFLIX);
        expect(calls[0]).toEqual([null, null]);
        expect(calls.length).toBeGreaterThan(3);
        expect(ids).toContain(1870);
        // Cada id é o início de uma faixa visitada, sem repetir.
        expect(new Set(ids).size).toBe(ids.length);
        expect(ids.length).toBeGreaterThan(1);
    });

    it("falha a carga se um ano sozinho ainda está no limite", async () => {
        vi.spyOn(console, "warn").mockImplementation(() => {});
        const { source, calls } = fakeSource(() => "capped");
        await expect(source.discover("movie", NETFLIX)).rejects.toThrow(/ainda no limite/);
        const last = calls.at(-1)!;
        expect(last[0]).toBe(last[1]);
    });
});

describe("TmdbCatalogSource.changedIds", () => {
    const window = [new Date("2026-10-11T00:00:00Z"), new Date("2026-10-23T00:00:00Z")] as const;
    const sourceWith = (total_pages: number) => {
        const get = vi.fn(async () => ({
            page: 1,
            total_pages,
            total_results: 1,
            results: [{ id: 7 }],
        }));
        return { source: new TmdbCatalogSource({ get } as unknown as TmdbClient), get };
    };

    it("junta os ids das páginas", async () => {
        const { source } = sourceWith(2);
        expect(await source.changedIds("movie", ...window)).toEqual(new Set([7]));
    });

    it("devolve null, sem pedir mais páginas, acima de 500 páginas", async () => {
        const { source, get } = sourceWith(501);
        expect(await source.changedIds("movie", ...window)).toBeNull();
        expect(get).toHaveBeenCalledTimes(1);
    });
});
