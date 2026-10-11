import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SHOW_SIGN_IN, TopBar } from "./TopBar";

describe("TopBar", () => {
    it("esconde o Entrar enquanto ele não tem ação", () => {
        expect(SHOW_SIGN_IN).toBe(false);
        const html = renderToStaticMarkup(<TopBar date="Domingo, 11 de outubro" />);
        expect(html).not.toContain("Entrar");
        expect(html).toContain("Domingo, 11 de outubro");
    });

    it("mantém o Voltar fora da tela inicial", () => {
        const html = renderToStaticMarkup(<TopBar back />);
        expect(html).toContain("Voltar");
        expect(html).not.toContain("Entrar");
    });
});
