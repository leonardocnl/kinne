import { beforeEach, describe, expect, it, vi } from "vitest";

const search = vi.fn();
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/server", () => ({ after: () => {} }));
vi.mock("@/application/title-search", () => ({ searchTitles: search }));
vi.mock("../_data/search", () => ({
    countSearch: vi.fn(),
    flushSearchCounters: vi.fn(async () => {}),
    searchPorts: vi.fn(() => ({})),
}));

describe("searchTitles (ação; A3, H4, G13)", () => {
    beforeEach(() => {
        vi.resetModules();
        search.mockReset().mockResolvedValue({ kind: "none" });
    });

    it.each([
        ["chave desconhecida", { term: "matrix", extra: 1 }],
        ["termo que não é texto", { term: 42 }],
        ["termo acima de 200 unidades", { term: "x".repeat(201) }],
        ["termo curto", { term: "a" }],
        ["termo longo depois de normalizar", { term: "x".repeat(81) }],
        ["nada", undefined],
    ])("recusa %s sem consultar nada", async (_, input) => {
        const { searchTitles } = await import("./search");
        expect(await searchTitles(input)).toEqual({ kind: "none" });
        expect(search).not.toHaveBeenCalled();
    });

    it("manda o termo normalizado e só o hash dele como chave", async () => {
        const { searchTitles } = await import("./search");
        await searchTitles({ term: "  AÇÃO " });
        const [request] = search.mock.calls[0];
        expect(request.term).toBe("acao");
        expect(request.termHash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("qualquer erro vira a mensagem neutra (H5, C5)", async () => {
        search.mockRejectedValue(new Error("detalhe interno"));
        const { searchTitles } = await import("./search");
        vi.spyOn(console, "error").mockImplementation(() => {});
        expect(await searchTitles({ term: "matrix" })).toEqual({ kind: "unavailable" });
        expect(console.error).toHaveBeenCalledWith("Busca falhou:", "detalhe omitido");
    });

    it("G13: passou de 5 s, responde a mensagem neutra", async () => {
        vi.useFakeTimers();
        search.mockReturnValue(new Promise(() => {}));
        const { searchTitles } = await import("./search");
        const answer = searchTitles({ term: "matrix" });
        await vi.advanceTimersByTimeAsync(5_000);
        expect(await answer).toEqual({ kind: "unavailable" });
        vi.useRealTimers();
    });
});
