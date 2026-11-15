import { describe, expect, it } from "vitest";
import { isPersonId, parsePersonPick, parsePersonTerm, titleCount } from "./person-search";

describe("parsePersonTerm (A3, A5, B2)", () => {
    it("normaliza como a busca de títulos", () => {
        expect(parsePersonTerm("  Zoë  SALDAÑA ")).toBe("zoe saldana");
    });

    it("pede pelo menos 3 caracteres, porque abaixo disso o índice não ajuda", () => {
        expect(parsePersonTerm("jo")).toBeNull();
        expect(parsePersonTerm("joe")).toBe("joe");
    });

    it("recusa entrada enorme antes de normalizar e acima de 80 caracteres depois", () => {
        expect(parsePersonTerm("a".repeat(201))).toBeNull();
        expect(parsePersonTerm("a".repeat(81))).toBeNull();
    });

    it("tira caracteres de controle e de formatação", () => {
        expect(parsePersonTerm("to\u0000m​")).toBe("tom");
    });
});

describe("isPersonId (A6)", () => {
    it.each([[1], [2_147_483_647]])("aceita %s", (id) => expect(isPersonId(id)).toBe(true));
    it.each([[0], [-1], [1.5], [2_147_483_648], ["1"], [null]])("recusa %s", (id) =>
        expect(isPersonId(id)).toBe(false),
    );
});

describe("parsePersonPick (A9)", () => {
    const ok = { id: 1056, name: "Tom Hanks", role: "cast" };

    it("aceita a pessoa no formato esperado", () => {
        expect(parsePersonPick(ok)).toEqual(ok);
        expect(parsePersonPick({ ...ok, name: "  Tom Hanks " })?.name).toBe("Tom Hanks");
    });

    it.each([
        ["nada", null],
        ["id inválido", { ...ok, id: -3 }],
        ["nome vazio", { ...ok, name: "  " }],
        ["nome enorme", { ...ok, name: "a".repeat(201) }],
        ["papel desconhecido", { ...ok, role: "producer" }],
        ["chave a mais", { ...ok, titles: [1, 2] }],
    ])("recusa %s", (_, value) => {
        expect(parsePersonPick(value)).toBeNull();
    });
});

describe("titleCount", () => {
    it("concorda o número", () => {
        expect(titleCount(1)).toBe("1 título");
        expect(titleCount(37)).toBe("37 títulos");
    });
});
