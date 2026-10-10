import { describe, expect, it } from "vitest";
import { designDoc, parseDesignDoc } from "./design-doc";

describe("parseDesignDoc", () => {
    it("separa data, seções, parágrafos e itens", () => {
        const doc = parseDesignDoc(
            "# Título\n\nIntro.\n\nÚltima atualização: 1 de maio de 2026.\n\n## Cor\n\n- Um amarelo.\n- `signal` só ali.\n\n## A11y\n\nTexto:\n\n- Foco.\n",
        );
        expect(doc.updated).toBe("1 de maio de 2026");
        expect(doc.sections).toEqual([
            {
                title: "Cor",
                lines: [
                    { text: "Um amarelo.", bullet: true },
                    { text: "`signal` só ali.", bullet: true },
                ],
            },
            {
                title: "A11y",
                lines: [
                    { text: "Texto:", bullet: false },
                    { text: "Foco.", bullet: true },
                ],
            },
        ]);
    });

    it("acha a data e as seções no DESIGN.md de verdade", () => {
        expect(designDoc.updated).not.toBe("");
        expect(designDoc.sections.length).toBeGreaterThan(0);
    });
});
