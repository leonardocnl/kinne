import { describe, expect, it } from "vitest";
import { MemoryLimiter } from "./memory-limiter";

describe("MemoryLimiter (B3)", () => {
    it("deixa passar a capacidade, recusa depois e devolve fichas com o tempo", () => {
        let now = 0;
        const limiter = new MemoryLimiter(
            () => 3,
            () => 1,
            () => now,
        );
        expect([1, 2, 3, 4].map(() => limiter.take("a"))).toEqual([true, true, true, false]);
        expect(limiter.take("b")).toBe(true);
        now = 1_000;
        expect(limiter.take("a")).toBe(true);
        expect(limiter.take("a")).toBe(false);
    });
});
