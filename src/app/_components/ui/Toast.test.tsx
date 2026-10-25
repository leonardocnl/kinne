import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button } from "./Button";
import { Toast } from "./Toast";

describe("Toast", () => {
    it("fica na página vazio, para o leitor de tela anunciar o texto novo", () => {
        const html = renderToStaticMarkup(<Toast />);
        expect(html).toContain('role="status"');
        expect(html).toContain("empty:invisible");
    });

    it("US010 C1/C4: aceita os botões 👍 e 👎 com nome acessível, sem a cor de destaque", () => {
        const html = renderToStaticMarkup(
            <Toast message="Anotado: você já viu Corra!">
                <Button variant="round" aria-label="Curti">
                    👍
                </Button>
                <Button variant="round" aria-label="Não curti">
                    👎
                </Button>
            </Toast>,
        );
        expect(html).toContain('aria-label="Curti"');
        expect(html).toContain('aria-label="Não curti"');
        expect(html).not.toContain("bg-signal");
    });
});
