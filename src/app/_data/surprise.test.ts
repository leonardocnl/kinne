import { describe, expect, it } from "vitest";
import { SURPRISE_MAX_EXCLUDED } from "@/domain/surprise";
import { parseSurpriseRequest } from "./surprise";

const ok = { streamings: ["netflix"], watched: [1, 2], shown: [] };

describe("parseSurpriseRequest", () => {
    it("aceita o pedido no formato esperado", () => {
        expect(parseSurpriseRequest(ok)).toEqual(ok);
    });

    it.each([
        ["nada", null],
        ["texto", "netflix"],
        ["streaming desconhecido", { ...ok, streamings: ["apple-tv"] }],
        ["id que não é inteiro positivo", { ...ok, watched: [1, "2"] }],
        ["id negativo", { ...ok, shown: [-1] }],
        [
            "lista longa demais",
            { ...ok, shown: Array.from({ length: SURPRISE_MAX_EXCLUDED + 1 }, (_, i) => i + 1) },
        ],
        ["campo faltando", { streamings: [], watched: [] }],
        ["chave desconhecida", { ...ok, extra: 1 }],
        ["streamings repetidos demais", { ...ok, streamings: Array(6).fill("netflix") }],
        ["streaming com tipo errado", { ...ok, streamings: [1] }],
        ["texto gigante", { ...ok, streamings: ["x".repeat(100_000)] }],
    ])("recusa %s", (_, input) => {
        expect(() => parseSurpriseRequest(input)).toThrow("Pedido inválido");
    });
});
