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
