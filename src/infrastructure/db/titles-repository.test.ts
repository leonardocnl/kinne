import { describe, expect, it } from "vitest";
import { CAST_STORED, MAX_DIRECTORS } from "@/domain/credits";
import { createDb } from "./client";
import { PgDialect } from "drizzle-orm/pg-core";
import { adultTitle, creditsQuery, DrizzleTitlesRepository } from "./titles-repository";
import type { Db } from "./client";

// Só monta a consulta: nada vai ao banco.
const db = createDb("postgresql://user:pw@localhost/db");

describe("créditos da tela do título (title-credits)", () => {
    const query = creditsQuery(db, 42).toSQL();

    it("recebe o título como parâmetro (B1)", () => {
        expect(query.params[0]).toBe(42);
        expect(query.sql).not.toContain("42");
    });

    it("lê só os diretores e o elenco guardado, com teto de linhas (D1)", () => {
        expect(query.sql).toContain('"title_credits"."credit_order" < $');
        expect(query.params).toContain(CAST_STORED);
        expect(query.sql).toMatch(/limit \$\d+$/);
        expect(query.params.at(-1)).toBe(CAST_STORED + MAX_DIRECTORS);
    });

    it("lê só papel e nome; nada além do nome sai da tabela people (C1)", () => {
        expect(query.sql).toMatch(/^select "title_credits"\."role", "people"\."name" from/);
    });

    it("põe o elenco antes da direção, cada um na ordem dos créditos", () => {
        expect(query.sql).toContain(
            'order by "title_credits"."role" asc, "title_credits"."credit_order" asc',
        );
    });
});

describe("bySlug (title-credits C2)", () => {
    it("não lê créditos quando não há título visível (inexistente ou bloqueado)", async () => {
        // banco de mentira: toda consulta devolve zero linhas e conta quantas vezes começou
        let selects = 0;
        const empty: unknown = new Proxy(() => empty, {
            get: (_, key) =>
                key === "then" ? (resolve: (rows: unknown[]) => void) => resolve([]) : empty,
            apply: () => empty,
        });
        const fake = { select: () => (selects++, empty) } as unknown as Db;
        await expect(
            new DrizzleTitlesRepository(fake).bySlug("bloqueado-2020"),
        ).resolves.toBeNull();
        expect(selects).toBe(1);
    });
});

describe("marca de 18 dos candidatos (recommendation-rounds A2)", () => {
    it("18 é adulto, e sem classificação também (falha fechada)", () => {
        const query = new PgDialect().sqlToQuery(adultTitle);
        expect(query.sql).toBe('coalesce("catalog_titles"."certification_br" = $1, true)');
        expect(query.params).toEqual(["18"]);
    });
});
