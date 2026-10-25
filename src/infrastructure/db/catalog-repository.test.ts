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
        expect(sql.match(/= "catalog_titles"\."id"/g)).toHaveLength(5);
        expect(sql).not.toMatch(/= "id"/);
    });

    // A chave group_room_finalists_catalog_title_id_catalog_titles_id_fk não tem cascade: um título
    // que está entre os finalistas de uma sala viva não pode ser apagado pela carga (US011).
    it("conta os finalistas de uma sala de grupo como referência", () => {
        const db = drizzle(neon("postgres://u:p@h/d"));
        const { sql } = db
            .select({ id: catalogTitles.id, referenced: titleReferenced })
            .from(catalogTitles)
            .toSQL();
        expect(sql).toContain('from "group_room_finalists"');
        expect(sql).toMatch(
            /from "group_room_finalists"\s+where "catalog_title_id" = "catalog_titles"\."id"/,
        );
    });

    // As chaves de user_taste_signals e user_watched para catalog_titles não têm cascade: a carga que
    // apagasse um título marcado por alguém falharia (23503) ou, pior, tiraria o título do gosto
    // da pessoa. Referenciado, ele só fica inativo (contas, decisão de 24/10/2026).
    it("conta o gosto e o 'Já vi' das contas como referência", () => {
        const db = drizzle(neon("postgres://u:p@h/d"));
        const { sql } = db
            .select({ id: catalogTitles.id, referenced: titleReferenced })
            .from(catalogTitles)
            .toSQL();
        expect(sql).toContain('from "user_taste_signals"');
        expect(sql).toContain('from "user_watched"');
    });
});
