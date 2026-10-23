import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { describe, expect, it } from "vitest";
import { titleReferenced } from "./catalog-repository";
import { catalogTitles } from "./schema";

describe("título referenciado (catalog-sync B6)", () => {
    // Numa select de uma tabela só o drizzle tira o nome da tabela das colunas; sem o id escrito à
    // mão, "id" dentro do exists é o da tabela de eventos e nenhum título conta como referenciado:
    // a carga tenta apagar um título com eventos e o banco recusa (23503).
    it("compara com o id do título, nunca com um id sem tabela", () => {
        const db = drizzle(neon("postgres://u:p@h/d"));
        const { sql } = db
            .select({ id: catalogTitles.id, referenced: titleReferenced })
            .from(catalogTitles)
            .toSQL();
        expect(sql.match(/= "catalog_titles"\."id"/g)).toHaveLength(2);
        expect(sql).not.toMatch(/= "id"/);
    });
});
