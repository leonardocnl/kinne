import { describe, expect, it } from "vitest";
import { availableStreamings, isStreaming, STREAMING_SERVICES, streamingList } from "./streaming";

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

describe("availableStreamings", () => {
    const names = (ids: number[]) => availableStreamings(ids).map((s) => s.name);

    it("devolve todos em que o título está, na ordem fixa", () => {
        expect(names([])).toEqual([]);
        expect(names([119])).toEqual(["Prime Video"]);
        expect(names([307, 8])).toEqual(["Netflix", "Globoplay"]);
        expect(names([307, 337, 119, 1899, 8])).toEqual([
            "Netflix",
            "Max",
            "Prime Video",
            "Disney+",
            "Globoplay",
        ]);
    });

    it("ignora códigos que não são de streamings suportados", () => {
        expect(names([999, 1899])).toEqual(["Max"]);
    });
});

describe("streamingList", () => {
    it("junta os nomes em pt-BR", () => {
        expect(streamingList([])).toBe("");
        expect(streamingList(availableStreamings([8]))).toBe("Netflix");
        expect(streamingList(availableStreamings([1899, 8]))).toBe("Netflix e Max");
        expect(streamingList(STREAMING_SERVICES)).toBe(
            "Netflix, Max, Prime Video, Disney+ e Globoplay",
        );
    });

    // regressão: o filtro Netflix + Prime Video deixava passar um título de Max e Prime Video,
    // e a tela dizia só "Disponível no Max"
    it("mostra Max e Prime Video, nunca só Max", () => {
        expect(streamingList(availableStreamings([119, 1899]))).toBe("Max e Prime Video");
    });
});
