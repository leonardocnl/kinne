import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { likeNeedle, visible } from "./search-repository";

describe("filtro da busca (G9)", () => {
    it("catálogo e mapeamento do TMDB só mostram ativos e não bloqueados", () => {
        const query = new PgDialect().sqlToQuery(visible!);
        expect(query.sql).toBe(
            '("catalog_titles"."is_active" = $1 and "catalog_titles"."is_blocked" = $2)',
        );
        expect(query.params).toEqual([true, false]);
    });
});

describe("termo no LIKE (A1, A2)", () => {
    it("vai como parâmetro e tem os curingas escapados depois de normalizado", () => {
        const query = new PgDialect().sqlToQuery(likeNeedle("100%_x"));
        expect(query.params).toEqual(["100%_x"]);
        expect(query.sql).toBe(
            "replace(replace(replace(kinne_normalize($1), '\\', '\\\\'), '%', '\\%'), '_', '\\_')",
        );
    });
});
