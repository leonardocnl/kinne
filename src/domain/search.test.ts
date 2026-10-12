import { describe, expect, it } from "vitest";
import { escapeLike, normalizeSearchText, parseSearchTerm } from "./search";
import { NORMALIZATION_CASES } from "./search-cases";

describe("normalizeSearchText (G14, A5)", () => {
    it.each(NORMALIZATION_CASES)("%s → %s", (input, normalized) => {
        expect(normalizeSearchText(input)).toBe(normalized);
    });

    it("trata a mesma palavra escrita de jeitos diferentes como uma só", () => {
        const decomposed = "Ação";
        expect(normalizeSearchText(decomposed)).toBe(normalizeSearchText("AÇÃO"));
    });

    it("tira caracteres de controle e de formatação e colapsa espaços (A3)", () => {
        expect(normalizeSearchText("  Ma​trix‮ \t\n Re\u0000loaded ")).toBe("matrix reloaded");
    });
});

describe("parseSearchTerm (A3, H4)", () => {
    it("aceita de 2 a 80 caracteres depois de normalizar", () => {
        expect(parseSearchTerm("ab")).toBe("ab");
        expect(parseSearchTerm("x".repeat(80))).toBe("x".repeat(80));
    });

    it.each([
        ["vazio", ""],
        ["só espaços", "     "],
        ["um caractere", "a"],
        ["um caractere com invisíveis", "​a​"],
        ["81 caracteres", "x".repeat(81)],
    ])("recusa %s", (_, raw) => {
        expect(parseSearchTerm(raw)).toBeNull();
    });

    it("recusa acima de 200 unidades antes de normalizar (H4)", () => {
        // 201 caracteres invisíveis viram "" depois de limpos, mas nem chegam a ser limpos
        expect(parseSearchTerm("ab" + "​".repeat(199))).toBeNull();
        expect(parseSearchTerm("ab" + "​".repeat(198))).toBe("ab");
    });
});

describe("escapeLike (A2)", () => {
    it("transforma curingas do LIKE em texto", () => {
        expect(escapeLike("100%_\\")).toBe("100\\%\\_\\\\");
    });

    it("não muda o resto", () => {
        expect(escapeLike("matrix reloaded")).toBe("matrix reloaded");
    });
});
