import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PIX } from "@/domain/pix";

const dir = import.meta.dirname;
const page = readFileSync(join(dir, "page.tsx"), "utf8");
const copy = readFileSync(join(dir, "PixCopy.tsx"), "utf8");

describe("/sobre", () => {
    it("o apoio é voluntário: nada de assinatura, plano ou compra", () => {
        for (const source of [page, copy]) {
            expect(source).not.toMatch(/\b(assinatura|plano|compre)\b/i);
        }
        // voluntário e sem atrito: "só se você quiser", qualquer valor, sem conta e sem taxa
        expect(page).toContain(
            "Só se você quiser: qualquer valor, pelo Pix, sem conta e sem taxa.",
        );
    });

    it("a chave, o nome e a cidade vêm só da constante", () => {
        for (const source of [page, copy]) {
            expect(source).not.toContain(PIX.key);
            expect(source).not.toContain(PIX.name);
            expect(source).not.toContain(PIX.city);
        }
    });

    it("todo link externo abre fora com noopener noreferrer, sem query string", () => {
        expect(page).toContain('target="_blank" rel="noopener noreferrer"');
        expect(page).not.toMatch(/https?:\/\/[^"'`\s]*\?/);
        expect(page).not.toContain("dangerouslySetInnerHTML");
    });

    it("traz o aviso do TMDB na redação exigida e o crédito ao JustWatch, só em texto", () => {
        expect(page).toContain(
            "This product uses the TMDB API but is not endorsed or certified by TMDB.",
        );
        expect(page).toContain("https://www.justwatch.com");
        expect(page).not.toMatch(/<img[^>]*(tmdb|justwatch)/i);
    });
});
