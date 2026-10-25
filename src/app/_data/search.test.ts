import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

const repoCatalog = vi.fn(async (term: string) => [{ slug: term }]);
vi.mock("next/cache", () => ({ cacheLife: () => {}, cacheTag: () => {} }));
vi.mock("@/infrastructure/db/client", () => ({ createDb: () => ({}) }));
vi.mock("@/infrastructure/db/search-repository", () => ({
    DrizzleSearchRepository: class {
        catalog = repoCatalog;
    },
}));

describe("cache do catálogo (C2)", () => {
    it("a função em cache recebe só o hash; o termo nunca entra na chave", () => {
        const source = readFileSync(join(import.meta.dirname, "search.ts"), "utf8");
        const cached = /async function (\w+)\(([^)]*)\)[^{]*\{\s*"use cache: remote"/.exec(source);
        expect(cached?.[2]).toBe("termHash: string");
    });

    it("busca o termo certo, inclusive com pedidos simultâneos do mesmo hash", async () => {
        const { catalog } = await import("./search");
        const results = await Promise.all([catalog("matrix", "h1"), catalog("matrix", "h1")]);
        expect(results).toEqual([[{ slug: "matrix" }], [{ slug: "matrix" }]]);
        expect(repoCatalog).toHaveBeenCalledWith("matrix");
        // depois de terminar, o mesmo hash continua funcionando (o termo não vazou nem sumiu)
        expect(await catalog("matrix", "h1")).toEqual([{ slug: "matrix" }]);
    });
});
