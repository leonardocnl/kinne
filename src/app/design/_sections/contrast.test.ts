import { describe, expect, it } from "vitest";
import { contrast, parseColor, wcagLevel } from "./contrast";

describe("contrast", () => {
    it("lê hex e rgb com alfa", () => {
        expect(parseColor("#fff340")).toEqual([255, 243, 64, 1]);
        expect(parseColor("#fff")).toEqual([255, 255, 255, 1]);
        expect(parseColor("#f2f2eebd")).toEqual([242, 242, 238, 189 / 255]);
        expect(parseColor("#fff8")).toEqual([255, 255, 255, 136 / 255]);
        expect(parseColor("rgb(242 242 238 / 0.74)")).toEqual([242, 242, 238, 0.74]);
        expect(parseColor("rgba(2, 2, 2, 0.5)")).toEqual([2, 2, 2, 0.5]);
        expect(parseColor("clamp(1rem, 2vw, 3rem)")).toBeUndefined();
    });

    it("dá 21:1 entre preto e branco, nos dois sentidos", () => {
        expect(contrast("#000", "#fff")).toBeCloseTo(21);
        expect(contrast("#fff", "#000")).toBeCloseTo(21);
    });

    it("mistura a cor translúcida ao fundo", () => {
        expect(contrast("rgb(255 255 255 / 0)", "#020202")).toBeCloseTo(1);
        const soft = contrast("rgb(242 242 238 / 0.74)", "#020202")!;
        expect(soft).toBeLessThan(contrast("#f2f2ee", "#020202")!);
        expect(soft).toBeGreaterThan(7);
    });

    it("marca AAA e AA", () => {
        expect(wcagLevel(7)).toBe("AAA");
        expect(wcagLevel(4.5)).toBe("AA");
        expect(wcagLevel(4.4)).toBeUndefined();
    });
});
