import { beforeEach, describe, expect, it, vi } from "vitest";

const suggestions = vi.fn();
const titleIds = vi.fn();
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("../_data/people", () => ({ personSuggestions: suggestions, personTitleIds: titleIds }));

const load = async (env: Record<string, string> = {}) => {
    vi.resetModules();
    vi.unstubAllEnvs();
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
    return import("./people");
};

beforeEach(() => {
    suggestions.mockReset().mockResolvedValue([]);
    titleIds.mockReset().mockResolvedValue([1, 2]);
    vi.restoreAllMocks();
});

describe("searchPeople (person-search A3, B2)", () => {
    it.each([
        ["chave desconhecida", { term: "hanks", extra: 1 }],
        ["termo que não é texto", { term: 42 }],
        ["termo acima de 200 unidades", { term: "x".repeat(201) }],
        ["termo com menos de 3 letras", { term: "jo" }],
        ["nada", undefined],
    ])("recusa %s sem consultar nada", async (_, input) => {
        const { searchPeople } = await load();
        expect(await searchPeople(input)).toEqual({ kind: "none" });
        expect(suggestions).not.toHaveBeenCalled();
    });

    it("manda o termo normalizado e só o hash dele como chave do cache (A5, C1)", async () => {
        const { searchPeople } = await load();
        await searchPeople({ term: "  ZOË " });
        const [term, hash] = suggestions.mock.calls[0];
        expect(term).toBe("zoe");
        expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("devolve as pessoas, ou 'none' quando não há", async () => {
        const person = { id: 1, name: "Tom Hanks", role: "cast", titles: 37 };
        suggestions.mockResolvedValueOnce([person]);
        const { searchPeople } = await load();
        expect(await searchPeople({ term: "hanks" })).toEqual({
            kind: "results",
            people: [person],
        });
        expect(await searchPeople({ term: "zzzz" })).toEqual({ kind: "none" });
    });

    it("erro vira a mensagem neutra, e o log não leva o termo nem o erro (C1, C4)", async () => {
        suggestions.mockRejectedValue(new Error("detalhe interno hanks"));
        const log = vi.spyOn(console, "error").mockImplementation(() => {});
        const { searchPeople } = await load();
        expect(await searchPeople({ term: "hanks" })).toEqual({ kind: "unavailable" });
        expect(log).toHaveBeenCalledWith("Busca de pessoas falhou");
        expect(JSON.stringify(log.mock.calls)).not.toContain("hanks");
    });

    it("recusa pelo limite antes de consultar (B1, B5)", async () => {
        const { searchPeople } = await load({ SEARCH_CATALOG_PER_MINUTE: "2" });
        await searchPeople({ term: "hanks" });
        await searchPeople({ term: "hanks" });
        suggestions.mockClear();
        expect(await searchPeople({ term: "hanks" })).toEqual({ kind: "unavailable" });
        expect(suggestions).not.toHaveBeenCalled();
    });

    it("passou de 5 s, responde a mensagem neutra", async () => {
        vi.useFakeTimers();
        suggestions.mockReturnValue(new Promise(() => {}));
        const { searchPeople } = await load();
        const answer = searchPeople({ term: "hanks" });
        await vi.advanceTimersByTimeAsync(5_000);
        expect(await answer).toEqual({ kind: "unavailable" });
        vi.useRealTimers();
    });
});

describe("personTitles (A6, B4)", () => {
    it.each([
        ["id zero", { personId: 0 }],
        ["id negativo", { personId: -1 }],
        ["id fracionário", { personId: 1.5 }],
        ["id grande demais", { personId: 2 ** 31 }],
        ["id texto", { personId: "1" }],
        ["chave desconhecida", { personId: 1, titles: [1] }],
    ])("recusa %s sem consultar", async (_, input) => {
        const { personTitles } = await load();
        expect(await personTitles(input)).toBeNull();
        expect(titleIds).not.toHaveBeenCalled();
    });

    it("devolve os títulos da pessoa", async () => {
        const { personTitles } = await load();
        expect(await personTitles({ personId: 1056 })).toEqual([1, 2]);
        expect(titleIds).toHaveBeenCalledWith(1056);
    });

    it("divide o limite com as sugestões (B4)", async () => {
        const { personTitles, searchPeople } = await load({ SEARCH_CATALOG_PER_MINUTE: "1" });
        await searchPeople({ term: "hanks" });
        expect(await personTitles({ personId: 1056 })).toBeNull();
        expect(titleIds).not.toHaveBeenCalled();
    });

    it("erro vira null, com log fixo", async () => {
        titleIds.mockRejectedValue(new Error("detalhe interno"));
        const log = vi.spyOn(console, "error").mockImplementation(() => {});
        const { personTitles } = await load();
        expect(await personTitles({ personId: 1056 })).toBeNull();
        expect(log).toHaveBeenCalledWith("Títulos da pessoa não carregados");
    });
});
