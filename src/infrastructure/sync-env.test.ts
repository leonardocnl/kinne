import { describe, expect, it } from "vitest";
import { syncEnvErrors } from "./sync-env";

const valid = {
    TMDB_TOKEN: "eyJsecret",
    DATABASE_URL_POOLED: "postgresql://user:pw@host/db?sslmode=require",
};

describe("syncEnvErrors", () => {
    it("aceita variáveis válidas", () => {
        expect(syncEnvErrors(valid)).toEqual([]);
        expect(syncEnvErrors({ ...valid, DATABASE_URL_POOLED: "postgres://h/db" })).toEqual([]);
    });

    it("recusa token ausente ou fora do formato", () => {
        expect(syncEnvErrors({ ...valid, TMDB_TOKEN: undefined })[0]).toMatch(/^TMDB_TOKEN/);
        expect(syncEnvErrors({ ...valid, TMDB_TOKEN: "abc" })[0]).toMatch(/^TMDB_TOKEN/);
    });

    it("recusa URL com aspas, ausente ou de outro esquema", () => {
        for (const url of [`"${valid.DATABASE_URL_POOLED}"`, undefined, "mysql://h/db"]) {
            expect(syncEnvErrors({ ...valid, DATABASE_URL_POOLED: url })[0]).toMatch(
                /^DATABASE_URL_POOLED/,
            );
        }
    });

    it("não expõe os valores", () => {
        const errors = syncEnvErrors({ TMDB_TOKEN: "segredo1", DATABASE_URL_POOLED: "'segredo2'" });
        expect(errors).toHaveLength(2);
        expect(errors.join(" ")).not.toMatch(/segredo/);
    });
});
