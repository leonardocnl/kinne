import { afterEach, describe, expect, it, vi } from "vitest";
import { WIPE_EVENT, wipeRouter } from "./wipe";

const target = new EventTarget();
vi.stubGlobal("window", target);
const router = () => ({ push: vi.fn(), replace: vi.fn() });

describe("wipeRouter", () => {
    let listener: ((e: Event) => void) | null = null;
    afterEach(() => listener && target.removeEventListener(WIPE_EVENT, listener));

    it("sem cortina (celular, movimento reduzido), troca na hora", () => {
        const r = router();
        wipeRouter(r).replace("/titulo/a");
        expect(r.replace).toHaveBeenCalledWith("/titulo/a");
    });

    it("com a cortina, ela cuida da troca e o roteador espera", () => {
        const asked: string[] = [];
        listener = (e) => {
            e.preventDefault();
            asked.push((e as CustomEvent<string>).detail);
        };
        target.addEventListener(WIPE_EVENT, listener);
        const r = router();
        wipeRouter(r).replace("/titulo/b");
        expect(asked).toEqual(["/titulo/b"]);
        expect(r.replace).not.toHaveBeenCalled();
    });

    it("push (da tela inicial) nunca passa pela cortina", () => {
        const r = router();
        listener = (e) => e.preventDefault();
        target.addEventListener(WIPE_EVENT, listener);
        wipeRouter(r).push("/titulo/c");
        expect(r.push).toHaveBeenCalledWith("/titulo/c");
    });
});

describe("beginWipe e cancelWipe", () => {
    it("o destino que chega depois do começo não navega pelo roteador", async () => {
        const { beginWipe, cancelWipe, requestWipe, WIPE_CANCEL_EVENT } = await import("./wipe");
        const seen: (string | null)[] = [];
        let cancelled = 0;
        const onWipe = (e: Event) => {
            e.preventDefault();
            seen.push((e as CustomEvent<string | null>).detail);
        };
        const onCancel = () => cancelled++;
        target.addEventListener(WIPE_EVENT, onWipe);
        target.addEventListener(WIPE_CANCEL_EVENT, onCancel);
        expect(beginWipe()).toBe(true);
        expect(requestWipe("/titulo/d")).toBe(true);
        cancelWipe();
        target.removeEventListener(WIPE_EVENT, onWipe);
        target.removeEventListener(WIPE_CANCEL_EVENT, onCancel);
        expect(seen).toEqual([null, "/titulo/d"]);
        expect(cancelled).toBe(1);
    });
});
