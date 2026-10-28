import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TopBar } from "./TopBar";

describe("TopBar", () => {
    it("não mostra o Entrar enquanto o login está fora da interface (SHOW_SIGN_IN)", () => {
        const html = renderToStaticMarkup(<TopBar />);
        expect(html).not.toContain('href="/entrar"');
    });

    it("mantém o Voltar fora da tela inicial", () => {
        const html = renderToStaticMarkup(<TopBar back />);
        expect(html).toContain("Voltar");
    });
});
