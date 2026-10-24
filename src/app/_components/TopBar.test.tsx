import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TopBar } from "./TopBar";

describe("TopBar", () => {
    it("reserva o lugar do Entrar, invisível e fora do foco, até saber quem está na tela (US012 C1)", () => {
        const html = renderToStaticMarkup(<TopBar date="Domingo, 11 de outubro" />);
        const link = html.match(/<a[^>]*href="\/entrar"[^>]*>/)?.[0] ?? "";
        expect(link).toContain("invisible");
        expect(link).toContain('aria-hidden="true"');
        expect(link).toContain('tabindex="-1"');
        expect(html).toContain("Domingo, 11 de outubro");
    });

    it("mantém o Voltar fora da tela inicial", () => {
        const html = renderToStaticMarkup(<TopBar back />);
        expect(html).toContain("Voltar");
    });
});
