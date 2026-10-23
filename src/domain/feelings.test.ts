import { describe, expect, it } from "vitest";
import { feelingAllows, FEELINGS, feelingMask, maskAllows } from "./feelings";

describe("feelingMask (US008 RNE004, feelings-and-taste-ui A5)", () => {
    const samples: [number[], string | null][] = [
        [[35], "L"],
        [[27], "16"],
        [[18, 10749], "12"],
        [[99], "10"],
        [[28, 12], "14"],
        [[], null],
    ];

    it("o bit de cada sentimento é o que feelingAllows responde", () => {
        for (const [genres, certification] of samples) {
            const mask = feelingMask(genres, certification);
            for (const feeling of FEELINGS) {
                expect(maskAllows(mask, feeling)).toBe(
                    feelingAllows(feeling, genres, certification),
                );
            }
        }
    });

    it("cabe em nove bits, um por sentimento", () => {
        for (const [genres, certification] of samples) {
            expect(feelingMask(genres, certification)).toBeLessThan(2 ** FEELINGS.length);
        }
        expect(FEELINGS).toHaveLength(9);
    });

    it("terror aceita susto e recusa risada", () => {
        const mask = feelingMask([27], "16");
        expect(maskAllows(mask, "scare")).toBe(true);
        expect(maskAllows(mask, "laugh")).toBe(false);
    });
});
