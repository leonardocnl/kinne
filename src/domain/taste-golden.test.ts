import { describe, expect, it } from "vitest";

import { evaluateGolden, normalizeTitleName } from "./taste-golden";

describe("evaluateGolden", () => {
    const ids = new Map([
        ["A", 1],
        ["B", 2],
        ["C", 3],
    ]);
    const resolve = (ref: { name: string }) => ids.get(ref.name);
    const ref = (name: string) => ({ name, year: 2000 });

    it("counts expected titles in the top and forbidden ones anywhere in it", () => {
        const result = evaluateGolden(
            [1, 3, 9],
            { expected: [ref("A"), ref("B"), ref("Z")], forbidden: [ref("C")] },
            resolve,
            2,
        );
        expect(result.found).toBe(1);
        expect(result.expected).toBe(2);
        expect(result.missed).toEqual(["B (2000)"]);
        expect(result.violations).toEqual(["C (2000)"]);
        expect(result.absent).toEqual(["Z (2000)"]);
    });
});

describe("normalizeTitleName", () => {
    it("ignores case, accents and extra spaces", () => {
        expect(normalizeTitleName("  Invocação  do Mal ")).toBe("invocacao do mal");
    });
});
