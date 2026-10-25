import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { findSecrets, scanDirectory, SECRET_NAMES } from "./bundle-secrets.mjs";

// Revisão B6 (E1): o JS que vai ao navegador não pode conter o nome de nenhum segredo nem algo com
// cara de chave. O mesmo scanner roda em `npm run bundle:check` depois do build.
describe("findSecrets", () => {
    it.each(SECRET_NAMES)("acha %s, solto ou dentro de código minificado", (name) => {
        expect(findSecrets(`var a="x";o.env.${name};`)).toContain(name);
        expect(findSecrets(`{"${name}":1}`)).toContain(name);
    });

    it("acha chave do Resend e URL de banco com senha", () => {
        expect(findSecrets('k="re_123456789012345678901234567890"')).toContain("chave re_");
        expect(findSecrets('u="postgres://app:senha@host/db"')).toContain("URL de banco");
    });

    it("não reclama de texto comum", () => {
        expect(findSecrets("function a(){return NEXT_PUBLIC_X + 'secret' + 're_' + 1}")).toEqual(
            [],
        );
    });
});

describe("scanDirectory", () => {
    it("lista o arquivo e o que achou; um diretório limpo volta vazio", () => {
        const dir = mkdtempSync(join(tmpdir(), "bundle-"));
        mkdirSync(join(dir, "chunks"));
        writeFileSync(join(dir, "chunks", "a.js"), "console.log('oi')");
        writeFileSync(join(dir, "chunks", "b.js"), "x=process.env.AUTH_SECRET");
        writeFileSync(join(dir, "chunks", "c.txt"), "AUTH_SECRET num texto que não é JS");
        expect(scanDirectory(dir)).toEqual([
            { file: join(dir, "chunks", "b.js"), found: ["AUTH_SECRET"] },
        ]);
    });

    it.skipIf(!existsSync(".next/static"))(
        "o build atual não leva nenhum segredo ao cliente",
        () => {
            expect(scanDirectory(".next/static")).toEqual([]);
        },
    );
});
