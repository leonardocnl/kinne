import { describe, expect, it } from "vitest";
import { directionLine, joinNames } from "./credits";

describe("joinNames", () => {
    it.each([
        [[], null],
        [["Ana"], "Ana"],
        [["Ana", "Bia"], "Ana e Bia"],
        [["Ana", "Bia", "Caio"], "Ana, Bia e Caio"],
        [["Ana", "Bia", "Caio", "Davi"], "Ana, Bia, Caio e Davi"],
    ])("%j vira %j", (names, expected) => {
        expect(joinNames(names)).toBe(expected);
    });

    it("ignora nomes vazios e repetidos", () => {
        expect(joinNames([" Ana ", "", "Ana", "  ", "Bia"])).toBe("Ana e Bia");
        expect(joinNames(["", " "])).toBeNull();
    });
});

describe("directionLine", () => {
    it("lista todos os diretores", () => {
        expect(directionLine(["Lana Wachowski", "Lilly Wachowski"])).toBe(
            "Direção de Lana Wachowski e Lilly Wachowski",
        );
        expect(directionLine(["A", "B", "C"])).toBe("Direção de A, B e C");
    });

    it("some sem diretor", () => {
        expect(directionLine([])).toBeNull();
    });
});
