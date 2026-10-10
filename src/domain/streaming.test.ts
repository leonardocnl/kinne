import { describe, expect, it } from "vitest";
import { isStreaming } from "./streaming";

describe("isStreaming", () => {
    it("aceita streamings suportados", () => {
        expect(isStreaming("netflix")).toBe(true);
        expect(isStreaming("globoplay")).toBe(true);
    });

    it("recusa o que não é suportado", () => {
        expect(isStreaming("apple-tv")).toBe(false);
        expect(isStreaming("")).toBe(false);
    });
});
