import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { toResult, visible } from "./search-repository";

describe("filtro da busca (G9)", () => {
    it("catálogo e mapeamento do TMDB só mostram ativos e não bloqueados", () => {
        const query = new PgDialect().sqlToQuery(visible!);
        expect(query.sql).toBe(
            '("catalog_titles"."is_active" = $1 and "catalog_titles"."is_blocked" = $2)',
        );
        expect(query.params).toEqual([true, false]);
    });
});

describe("imagem no resultado (C4)", () => {
    const row = {
        slug: "x-2020",
        title: "X",
        year: 2020,
        type: "movie",
        posterPath: "/p.jpg",
    };

    it.each([
        ["18", null],
        [null, null],
        ["16", "/p.jpg"],
        ["L", "/p.jpg"],
    ])("classificação %s → pôster %s", (certification, posterPath) => {
        expect(toResult({ ...row, certification }).posterPath).toBe(posterPath);
    });
});
