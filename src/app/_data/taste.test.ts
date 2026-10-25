import { describe, expect, it } from "vitest";
import { TASTE_LIST_MAX } from "@/domain/taste-signals";
import { tasteSchema } from "./taste";

const none = { liked: [], willWatch: [], disliked: [] };

describe("tasteSchema (feelings-and-taste-ui A3, A6)", () => {
    it("aceita listas vazias e de ids positivos", () => {
        expect(tasteSchema.parse(none)).toEqual(none);
        expect(tasteSchema.parse({ ...none, liked: [1, 2], disliked: [3] })).toEqual({
            liked: [1, 2],
            willWatch: [],
            disliked: [3],
        });
    });

    it("colapsa repetidos e deixa o id das duas listas na mais negativa", () => {
        const parsed = tasteSchema.parse({ liked: [1, 1, 2], willWatch: [2], disliked: [] });
        expect(parsed).toEqual({ liked: [1], willWatch: [2], disliked: [] });
    });

    it.each([
        [
            "lista com 100 mil ids",
            { ...none, liked: Array.from({ length: 100_000 }, (_, i) => i + 1) },
        ],
        [
            "201 ids",
            { ...none, liked: Array.from({ length: TASTE_LIST_MAX + 1 }, (_, i) => i + 1) },
        ],
        ["id negativo", { ...none, liked: [-1] }],
        ["id zero", { ...none, liked: [0] }],
        ["id decimal", { ...none, liked: [1.5] }],
        ["id texto", { ...none, liked: ["1"] }],
        ["id acima do inteiro do banco", { ...none, liked: [2 ** 31] }],
        ["lista que é texto", { ...none, liked: "1,2" }],
        ["chave desconhecida", { ...none, notInterested: [1] }],
        ["peso vindo do navegador", { ...none, weights: { liked: 100 } }],
        ["passo vindo do navegador", { ...none, damping: [1, 1, 1] }],
        ["lista faltando", { liked: [], willWatch: [] }],
        ["nada", null],
    ])("recusa %s", (_, input) => {
        expect(tasteSchema.safeParse(input).success).toBe(false);
    });
});
