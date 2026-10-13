import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { dailyPickTitle } from "./daily-picks-repository";

describe("indicações do dia (recommendation-rounds A2)", () => {
    it("só recomendáveis, não bloqueados e nunca 18", () => {
        const query = new PgDialect().sqlToQuery(dailyPickTitle!);
        expect(query.sql).toBe(
            '("catalog_titles"."is_recommendable" = $1 and "catalog_titles"."is_blocked" = $2 and "catalog_titles"."certification_br" <> $3)',
        );
        expect(query.params).toEqual([true, false, "18"]);
    });
});
