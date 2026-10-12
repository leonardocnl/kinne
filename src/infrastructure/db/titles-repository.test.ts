import { describe, expect, it } from "vitest";
import { CAST_SHOWN, MAX_DIRECTORS } from "@/domain/credits";
import { createDb } from "./client";
import { creditsQuery } from "./titles-repository";

// Só monta a consulta: nada vai ao banco.
const db = createDb("postgresql://user:pw@localhost/db");

describe("créditos da tela do título (title-credits)", () => {
    const query = creditsQuery(db, 42).toSQL();

    it("recebe o título como parâmetro (B1)", () => {
        expect(query.params[0]).toBe(42);
        expect(query.sql).not.toContain("42");
    });

    it("lê só os diretores e os três primeiros do elenco, com teto de linhas (D1)", () => {
        expect(query.sql).toContain('"title_credits"."credit_order" < $');
        expect(query.params).toContain(CAST_SHOWN);
        expect(query.sql).toMatch(/limit \$\d+$/);
        expect(query.params.at(-1)).toBe(CAST_SHOWN + MAX_DIRECTORS);
    });

    it("lê só id de pessoa, papel e nome; nada além do nome sai da tabela people (C1)", () => {
        expect(query.sql).toMatch(/^select "title_credits"\."role", "people"\."name" from/);
    });

    it("põe o elenco antes da direção, cada um na ordem dos créditos", () => {
        expect(query.sql).toContain(
            'order by "title_credits"."role" asc, "title_credits"."credit_order" asc',
        );
    });
});
