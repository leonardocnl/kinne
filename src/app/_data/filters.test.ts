import { describe, expect, it } from "vitest";
import { DEFAULT_FILTERS, wireFilters } from "@/domain/filters";
import { SURPRISE_MAX_EXCLUDED } from "@/domain/surprise";
import { parseFilterRequest } from "./filters";

// os filtros como saem do navegador: da pessoa, só o id (person-search A7)
const WIRE = wireFilters(DEFAULT_FILTERS);
const ok = { filters: WIRE, watched: [1, 2], seen: [3] };

describe("parseFilterRequest", () => {
    it("aceita o pedido no formato esperado", () => {
        expect(parseFilterRequest(ok)).toEqual(ok);
    });

    it("aceita só o id da pessoa (person-search A6, A7)", () => {
        const filters = { ...WIRE, personId: 1056 };
        expect(parseFilterRequest({ ...ok, filters }).filters.personId).toBe(1056);
    });

    it("arredonda a nota do ponto flutuante", () => {
        const filters = { ...WIRE, minRating: 7.199999999999999 };
        expect(parseFilterRequest({ ...ok, filters }).filters.minRating).toBe(7.2);
    });

    it.each([
        ["nada", null],
        ["filtros inválidos", { ...ok, filters: { ...WIRE, type: "anime" } }],
        ["id que não é inteiro positivo", { ...ok, watched: [0] }],
        ["chave desconhecida", { ...ok, extra: 1 }],
        ["chave desconhecida nos filtros", { ...ok, filters: { ...WIRE, x: 1 } }],
        ["nota abaixo do piso", { ...ok, filters: { ...WIRE, minRating: 6.3 } }],
        ["nota acima do teto", { ...ok, filters: { ...WIRE, minRating: 9.1 } }],
        ["nota fora do passo", { ...ok, filters: { ...WIRE, minRating: 7.25 } }],
        ["nota com tipo errado", { ...ok, filters: { ...WIRE, minRating: "7" } }],
        ["gênero desconhecido", { ...ok, filters: { ...WIRE, genres: ["horror"] } }],
        ["gêneros demais", { ...ok, filters: { ...WIRE, genres: Array(6).fill("drama") } }],
        ["duração fora da lista", { ...ok, filters: { ...WIRE, maxRuntime: 100 } }],
        ["streaming desconhecido", { ...ok, filters: { ...WIRE, streamings: ["hbo"] } }],
        ["texto no lugar de id", { ...ok, seen: ["x".repeat(100_000)] }],
        ["pessoa com id zero", { ...ok, filters: { ...WIRE, personId: 0 } }],
        ["pessoa com id texto", { ...ok, filters: { ...WIRE, personId: "1056" } }],
        ["pessoa com id grande demais", { ...ok, filters: { ...WIRE, personId: 2 ** 31 } }],
        [
            "a pessoa inteira em vez do id (A7)",
            { ...ok, filters: { ...WIRE, person: { id: 1, name: "x", role: "cast" } } },
        ],
        [
            "títulos da pessoa vindos do navegador (A7)",
            { ...ok, filters: { ...WIRE, titles: [1] } },
        ],
        ["sem os já mostrados", { ...ok, seen: undefined }],
        [
            "lista longa demais",
            { ...ok, watched: Array.from({ length: SURPRISE_MAX_EXCLUDED + 1 }, (_, i) => i + 1) },
        ],
    ])("recusa %s", (_, input) => {
        expect(() => parseFilterRequest(input)).toThrow("Pedido inválido");
    });
});
