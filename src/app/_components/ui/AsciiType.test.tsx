import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import NotFound from "../../not-found";
import TitleNotFound from "../../titulo/[slug]/not-found";
import { AsciiType } from "./AsciiType";

describe("AsciiType", () => {
    it("é um canvas decorativo", () => {
        expect(renderToStaticMarkup(<AsciiType text="404" />)).toBe(
            '<canvas aria-hidden="true"></canvas>',
        );
    });

    it("respeita o movimento reduzido e só usa cores dos tokens", () => {
        const source = readFileSync(join(import.meta.dirname, "AsciiType.tsx"), "utf8");
        expect(source).toContain("prefers-reduced-motion: reduce");
        expect(source).toMatch(/if \(still\) return/);
        // amarelo só quando quem usa pede (exceção do fim de rodada); o padrão é paper
        expect(source).toContain('tone = "paper"');
        expect(source).not.toMatch(/#[0-9a-f]{3,8}/i);
    });
});

describe("telas 404", () => {
    it("a página e o título têm cada uma o seu texto, com o 404 no quadro", () => {
        const page = renderToStaticMarkup(<NotFound />);
        const title = renderToStaticMarkup(<TitleNotFound />);
        expect(page).toContain("Não encontramos esta página");
        expect(title).toContain("Não encontramos este título");
        // o efeito baixa sob demanda (AsciiArt): fora do JS de toda página
        // o 404 da raiz fica sem: o que ele importa entra no JS de toda página (orçamento)
        for (const file of ["titulo/[slug]/not-found.tsx"])
            expect(readFileSync(join(import.meta.dirname, "../..", file), "utf8")).toContain(
                '<AsciiArt text="404" tone="signal"',
            );
    });
});
