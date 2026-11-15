import { describe, expect, it } from "vitest";
import {
    availableStreamings,
    isOnStreamings,
    isStreaming,
    STREAMING_SERVICES,
    streamingList,
    streamingSummary,
    streamingToAsk,
    withoutStreaming,
} from "./streaming";

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

describe("streamings aprendidos pelo uso (US018)", () => {
    const on = (...ids: number[]) => availableStreamings(ids);

    it("Não com a lista vazia deixa todos menos o recusado", () => {
        expect(withoutStreaming([], "netflix")).toEqual([
            "max",
            "prime-video",
            "disney-plus",
            "globoplay",
        ]);
    });

    it("Não nunca esvazia a lista", () => {
        expect(withoutStreaming(["netflix"], "netflix")).toEqual(["netflix"]);
    });

    it("pergunta o primeiro serviço ainda não respondido", () => {
        expect(streamingToAsk(on(8, 1899), [], [])?.id).toBe("netflix");
        expect(streamingToAsk(on(8, 1899), [], ["netflix"])?.id).toBe("max");
        expect(streamingToAsk(on(8, 1899), [], ["netflix", "max"])).toBeNull();
    });

    it("não pergunta sobre serviço fora da lista nem com um único na lista", () => {
        expect(streamingToAsk(on(8), ["max", "globoplay"], [])).toBeNull();
        expect(streamingToAsk(on(8), ["netflix"], [])).toBeNull();
    });

    it("sabe quando o título saiu dos streamings da pessoa", () => {
        expect(isOnStreamings(on(8), [])).toBe(true);
        expect(isOnStreamings(on(8), ["max"])).toBe(false);
        expect(isOnStreamings(on(8, 1899), ["max"])).toBe(true);
    });

    it("resume a lista; vazia ou completa é todos", () => {
        expect(streamingSummary([])).toBeNull();
        expect(
            streamingSummary(["netflix", "max", "prime-video", "disney-plus", "globoplay"]),
        ).toBeNull();
        expect(streamingSummary(["max", "netflix"])).toBe("Netflix, Max");
    });
});
