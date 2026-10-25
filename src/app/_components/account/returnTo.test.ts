import { describe, expect, it } from "vitest";
import { isSafeReturn } from "./returnTo";

describe("volta depois de entrar (US012 C4, RNE007)", () => {
    it("aceita só caminhos do próprio Kinne", () => {
        expect(isSafeReturn("/")).toBe(true);
        expect(isSafeReturn("/titulo/duna-2021")).toBe(true);
    });

    it("recusa endereço de fora, caminho relativo ao protocolo, query e lixo", () => {
        for (const bad of [
            "//evil.example",
            "https://evil.example",
            "/\\evil",
            "/a?b=1",
            "/a#x",
            "javascript:alert(1)",
            "titulo",
            "/" + "a".repeat(300),
            null,
            42,
        ])
            expect(isSafeReturn(bad)).toBe(false);
    });
});
