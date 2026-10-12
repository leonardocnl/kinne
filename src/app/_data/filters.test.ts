import { describe, expect, it } from "vitest";
import { DEFAULT_FILTERS } from "@/domain/filters";
import { SURPRISE_MAX_EXCLUDED } from "@/domain/surprise";
import { parseFilterRequest } from "./filters";

const ok = { filters: DEFAULT_FILTERS, watched: [1, 2], seen: [3] };

describe("parseFilterRequest", () => {
    it("aceita o pedido no formato esperado", () => {
        expect(parseFilterRequest(ok)).toEqual(ok);
    });

    it("arredonda a nota do ponto flutuante", () => {
        const filters = { ...DEFAULT_FILTERS, minRating: 7.199999999999999 };
        expect(parseFilterRequest({ ...ok, filters }).filters.minRating).toBe(7.2);
    });

    it.each([
        ["nada", null],
        ["filtros inválidos", { ...ok, filters: { ...DEFAULT_FILTERS, type: "anime" } }],
        ["id que não é inteiro positivo", { ...ok, watched: [0] }],
        ["chave desconhecida", { ...ok, extra: 1 }],
        ["chave desconhecida nos filtros", { ...ok, filters: { ...DEFAULT_FILTERS, x: 1 } }],
        ["nota abaixo do piso", { ...ok, filters: { ...DEFAULT_FILTERS, minRating: 6.3 } }],
        ["nota acima do teto", { ...ok, filters: { ...DEFAULT_FILTERS, minRating: 9.1 } }],
        ["nota fora do passo", { ...ok, filters: { ...DEFAULT_FILTERS, minRating: 7.25 } }],
        ["nota com tipo errado", { ...ok, filters: { ...DEFAULT_FILTERS, minRating: "7" } }],
        ["gênero desconhecido", { ...ok, filters: { ...DEFAULT_FILTERS, genres: ["horror"] } }],
        [
            "gêneros demais",
            { ...ok, filters: { ...DEFAULT_FILTERS, genres: Array(6).fill("drama") } },
        ],
        ["duração fora da lista", { ...ok, filters: { ...DEFAULT_FILTERS, maxRuntime: 100 } }],
        ["streaming desconhecido", { ...ok, filters: { ...DEFAULT_FILTERS, streamings: ["hbo"] } }],
        ["texto no lugar de id", { ...ok, seen: ["x".repeat(100_000)] }],
        ["sem os já mostrados", { ...ok, seen: undefined }],
        [
            "lista longa demais",
            { ...ok, watched: Array.from({ length: SURPRISE_MAX_EXCLUDED + 1 }, (_, i) => i + 1) },
        ],
    ])("recusa %s", (_, input) => {
        expect(() => parseFilterRequest(input)).toThrow("Pedido inválido");
    });
});
