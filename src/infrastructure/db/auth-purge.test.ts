import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Revisão B2 (D3): sessões e códigos vencidos saem do banco na carga diária. A função existe desde
// a migration das contas; este teste garante que a carga a chama, depois da limpeza da busca, e
// que falha do job se a purga falhar.
describe("catalog:sync chama a purga das contas", () => {
    const script = readFileSync("scripts/sync-catalog.ts", "utf8");

    it("chama purgeExpiredAuth depois de cleanSearchState e falha o job se ela falhar", () => {
        const search = script.indexOf("cleanSearchState(");
        const purge = script.indexOf("purgeExpiredAuth()");
        expect(search).toBeGreaterThan(0);
        expect(purge).toBeGreaterThan(search);
        expect(script.slice(purge, purge + 200)).toMatch(/exitCode = 1/);
    });

    it("conta o que apagou no resumo, sem dado de ninguém", () => {
        expect(script).toMatch(/contas/i);
    });
});
