import { describe, expect, it } from "vitest";
import { isStreaming, primaryStreaming } from "./streaming";

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

describe("primaryStreaming", () => {
    it("escolhe na ordem Netflix, Max, Prime Video, Disney+, Globoplay", () => {
        expect(primaryStreaming([307, 119, 1899])?.name).toBe("Max");
        expect(primaryStreaming([307, 8])?.name).toBe("Netflix");
        expect(primaryStreaming([])).toBeNull();
    });
});
