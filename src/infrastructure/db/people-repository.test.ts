import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { MAX_PERSON_RESULTS, MAX_PERSON_TITLES } from "@/domain/person-search";
import { createDb } from "./client";
import {
    candidateTitle,
    drawableTitle,
    suggestionsQuery,
    titleIdsQuery,
} from "./people-repository";

// Só monta as consultas: nada vai ao banco.
const db = createDb("postgresql://user:pw@localhost/db");

describe("títulos de pessoas (person-search C3, recommendation-rounds C2)", () => {
    it("sugestões e contagens: sorteáveis fora do 18", () => {
        const query = new PgDialect().sqlToQuery(candidateTitle!);
        expect(query.sql).toContain('"catalog_titles"."is_recommendable" = $1');
        expect(query.sql).toContain('"catalog_titles"."is_blocked" = $2');
        expect(query.sql).toContain('"catalog_titles"."certification_br" <> $3');
        expect(query.sql).toContain('"streaming_availability"."country_code" = \'BR\'');
        expect(query.params).toEqual([true, false, "18"]);
    });
});

describe("sugestões de pessoas", () => {
    const query = suggestionsQuery(db, "100%_x").toSQL();

    it("o termo vai como parâmetro, normalizado e com os curingas escapados (A1, A2, A5)", () => {
        expect(query.params).toContain("100%_x");
        expect(query.sql).not.toContain("100%_x");
        expect(query.sql).toContain("kinne_normalize($");
        expect(query.sql).toContain("'%', '\\%'");
    });

    it("só pessoas com título sorteável, no máximo seis (B2, C3)", () => {
        expect(query.sql).toContain('"catalog_titles"."is_recommendable" = $');
        expect(query.sql).toMatch(/limit \$\d+$/);
        expect(query.params.at(-1)).toBe(MAX_PERSON_RESULTS);
    });

    it("só id, nome, papel e quantidade de títulos saem do banco (C2)", () => {
        expect(query.sql).toMatch(/^select "people"\."id", "people"\."name", case when/);
        expect(query.sql).not.toContain("tmdb_person_id");
    });
});

describe("títulos de uma pessoa", () => {
    const query = titleIdsQuery(db, 1056).toSQL();

    it("o id vai como parâmetro, com teto de títulos (A1, A6, B6)", () => {
        expect(query.params[0]).toBe(1056);
        expect(query.sql).toContain('"title_credits"."person_id" = $1');
        expect(query.params.at(-1)).toBe(MAX_PERSON_TITLES);
    });

    it("só títulos sorteáveis (C3)", () => {
        expect(query.sql).toContain('"catalog_titles"."is_recommendable" = $');
        expect(query.sql).toContain("exists (select 1 from");
    });
});

describe("o 18 nas consultas de pessoas (recommendation-rounds C2)", () => {
    it("sorteáveis: recomendável, não bloqueado e em streaming no BR, com os 18", () => {
        const query = new PgDialect().sqlToQuery(drawableTitle!);
        expect(query.sql).not.toContain("certification_br");
    });

    it("as sugestões tiram os 18; os títulos da pessoa não, o chip decide", () => {
        expect(suggestionsQuery(db, "hanks").toSQL().sql).toContain(
            '"catalog_titles"."certification_br" <> $',
        );
        expect(titleIdsQuery(db, 1).toSQL().sql).not.toContain("certification_br");
    });
});

describe("papéis da busca de pessoas (taste-graph-data D1)", () => {
    it("só direção e elenco: roteiro e criação ficam fora", () => {
        for (const query of [suggestionsQuery(db, "x").toSQL(), titleIdsQuery(db, 1).toSQL()]) {
            expect(query.sql).toContain('"title_credits"."role" in ($');
            expect(query.params).toContain("director");
            expect(query.params).toContain("cast");
            expect(query.params).not.toContain("writer");
        }
    });
});
