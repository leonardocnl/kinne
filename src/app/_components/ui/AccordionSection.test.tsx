import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AccordionSection } from "./AccordionSection";

describe("AccordionSection", () => {
    const html = renderToStaticMarkup(
        <AccordionSection title="Gênero" summary="Ação, Drama">
            <input aria-label="dentro" />
        </AccordionSection>,
    );

    it("nasce fechada: aria-expanded false, resumo no cabeçalho, conteúdo escondido", () => {
        expect(html).toContain('aria-expanded="false"');
        expect(html).toContain("Ação, Drama");
        expect(html).toMatch(/<div id="[^"]+-body" hidden=""/);
    });

    it("o botão aponta para o conteúdo com aria-controls", () => {
        const controls = html.match(/aria-controls="([^"]+)"/)?.[1];
        expect(html).toContain(`id="${controls}"`);
    });

    it("mantém o conteúdo montado quando fechada, para não perder estado", () => {
        expect(html).toContain('aria-label="dentro"');
    });

    it("é um <button> nativo: Enter e Espaço alternam sem código", () => {
        expect(html).toContain('<button type="button"');
    });
});
