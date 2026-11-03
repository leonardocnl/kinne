import { describe, expect, it } from "vitest";
import { LIMITED_MESSAGE } from "@/domain/rate-limit";
import { loadError } from "../StateScreen";
import { filtersHint } from "./filtersHint";

const base = { failed: false, limited: false, drawFailed: false, count: 5, feeling: null };

describe("filtersHint", () => {
    it("passado o limite, mostra o aviso do limite, não o de falha (security.md §7)", () => {
        expect(filtersHint({ ...base, failed: true, limited: true, count: null })).toBe(
            LIMITED_MESSAGE,
        );
    });

    it("falha de carga ou de sorteio mostra o aviso genérico", () => {
        expect(filtersHint({ ...base, failed: true })).toBe(`${loadError.heading}. Tente de novo.`);
        expect(filtersHint({ ...base, drawFailed: true })).toBe(
            `${loadError.heading}. Tente de novo.`,
        );
    });

    it("nenhum título: a dica de sempre (US002 C4, US008 C5)", () => {
        expect(filtersHint({ ...base, count: 0 })).toBe(
            "Tente baixar a nota ou marcar mais um streaming.",
        );
        expect(filtersHint({ ...base, count: 0, feeling: "cry" })).toBe(
            "Tente outro sentimento ou marque mais um streaming.",
        );
    });

    it("com títulos, sem aviso", () => {
        expect(filtersHint(base)).toBe(false);
    });
});
