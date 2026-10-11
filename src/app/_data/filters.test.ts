import { describe, expect, it } from "vitest";
import { DEFAULT_FILTERS } from "@/domain/filters";
import { SURPRISE_MAX_EXCLUDED } from "@/domain/surprise";
import { parseFilterRequest } from "./filters";

const ok = { filters: DEFAULT_FILTERS, watched: [1, 2] };

describe("parseFilterRequest", () => {
    it("aceita o pedido no formato esperado", () => {
        expect(parseFilterRequest(ok)).toEqual(ok);
    });

    it.each([
        ["nada", null],
        ["filtros inválidos", { ...ok, filters: { ...DEFAULT_FILTERS, type: "anime" } }],
        ["id que não é inteiro positivo", { ...ok, watched: [0] }],
        [
            "lista longa demais",
            { ...ok, watched: Array.from({ length: SURPRISE_MAX_EXCLUDED + 1 }, (_, i) => i + 1) },
        ],
    ])("recusa %s", (_, input) => {
        expect(() => parseFilterRequest(input)).toThrow("Pedido inválido");
    });
});
