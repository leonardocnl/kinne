import { describe, expect, it } from "vitest";
import { dbEnvErrors, syncEnvErrors } from "./sync-env";

const valid = {
    TMDB_TOKEN: "eyJsecret",
    SYNC_DATABASE_URL: "postgresql://kinne_sync:pw@host/db?sslmode=require",
    SYNC_TARGET: "develop",
};

describe("syncEnvErrors", () => {
    it("aceita variáveis válidas", () => {
        expect(syncEnvErrors(valid)).toEqual([]);
        expect(syncEnvErrors({ ...valid, SYNC_DATABASE_URL: "postgres://h/db" })).toEqual([]);
    });

    it("recusa token ausente ou fora do formato", () => {
        expect(syncEnvErrors({ ...valid, TMDB_TOKEN: undefined })[0]).toMatch(/^TMDB_TOKEN/);
        expect(syncEnvErrors({ ...valid, TMDB_TOKEN: "abc" })[0]).toMatch(/^TMDB_TOKEN/);
    });

    it("recusa URL com aspas, ausente ou de outro esquema", () => {
        for (const url of [`"${valid.SYNC_DATABASE_URL}"`, undefined, "mysql://h/db"]) {
            expect(syncEnvErrors({ ...valid, SYNC_DATABASE_URL: url })[0]).toMatch(
                /^SYNC_DATABASE_URL/,
            );
        }
    });

    it("exige SYNC_TARGET de uma lista fechada (C3)", () => {
        for (const target of [undefined, "", "prod", "DEVELOP"]) {
            expect(syncEnvErrors({ ...valid, SYNC_TARGET: target })[0]).toMatch(/^SYNC_TARGET/);
        }
    });

    it("só aceita produção no GitHub Actions e com revalidação configurada (C3, C4)", () => {
        const prod = { ...valid, SYNC_TARGET: "production" };
        expect(syncEnvErrors(prod)).toHaveLength(2);
        expect(
            syncEnvErrors({
                ...prod,
                GITHUB_ACTIONS: "true",
                REVALIDATE_ORIGIN: "https://kinne.example",
                REVALIDATE_SECRET: "s",
            }),
        ).toEqual([]);
    });

    it("não expõe os valores", () => {
        const errors = syncEnvErrors({
            TMDB_TOKEN: "segredo1",
            SYNC_DATABASE_URL: "'segredo2'",
            SYNC_TARGET: "segredo3",
        });
        expect(errors).toHaveLength(3);
        expect(errors.join(" ")).not.toMatch(/segredo/);
    });
});

describe("dbEnvErrors", () => {
    it("confere só DATABASE_URL_POOLED", () => {
        expect(dbEnvErrors({ DATABASE_URL_POOLED: "postgres://h/db" })).toEqual([]);
        expect(dbEnvErrors({})[0]).toMatch(/^DATABASE_URL_POOLED/);
    });
});
