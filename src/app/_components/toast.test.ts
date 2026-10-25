import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readToast, showAnswered, showToast } from "./toast";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
    showToast("");
    vi.useRealTimers();
});

describe("aviso com a pergunta Curtiu? (US010)", () => {
    it("C1: o aviso do Já vi traz a pergunta sobre o título", () => {
        showToast("Anotado: você já viu Corra!", { asking: { id: 42, slug: "corra-2017" } });
        expect(readToast()).toEqual({
            text: "Anotado: você já viu Corra!",
            asking: { id: 42, slug: "corra-2017" },
        });
    });

    it("C2: responder troca a pergunta por Anotado. e some logo", () => {
        showToast("Anotado: você já viu Corra!", { asking: { id: 42, slug: "corra-2017" } });
        showAnswered();
        expect(readToast()).toEqual({ text: "Anotado.", asking: null });
        vi.advanceTimersByTime(2000);
        expect(readToast()).toEqual({ text: "", asking: null });
    });

    it("C3: sem resposta, a pergunta some sozinha e não deixa sinal", () => {
        showToast("Anotado: você já viu Corra!", { asking: { id: 42, slug: "corra-2017" } });
        vi.advanceTimersByTime(9000);
        expect(readToast()).toEqual({ text: "", asking: null });
    });

    it("um aviso comum não traz pergunta", () => {
        showToast("Combinado.");
        expect(readToast().asking).toBeNull();
    });

    it("texto vazio esconde a pergunta também", () => {
        showToast("x", { asking: { id: 1, slug: "x" } });
        showToast("", { asking: { id: 1, slug: "x" } });
        expect(readToast()).toEqual({ text: "", asking: null });
    });
});
