import { describe, expect, it } from "vitest";
import { initialRotation, rotate, type Rotation, type RotationEvent } from "./rotation";

const run = (...events: RotationEvent[]): Rotation => events.reduce(rotate, initialRotation);
const show = (index: number, animate = true): RotationEvent => ({ type: "show", index, animate });
const titleEnd: RotationEvent = { type: "titleAnimationEnd" };

describe("rotate", () => {
    it("troca a capa na hora e o texto só depois que o título antigo sai", () => {
        expect(run(show(1))).toEqual({ current: 1, shown: 0, swap: "out", playing: true });
        expect(run(show(1), titleEnd)).toEqual({
            current: 1,
            shown: 1,
            swap: "in",
            playing: true,
        });
        expect(run(show(1), titleEnd, titleEnd).swap).toBe("idle");
    });

    it("mostra o texto da última capa pedida durante a saída", () => {
        expect(run(show(1), show(3), titleEnd)).toMatchObject({ current: 3, shown: 3 });
    });

    it("sem animação, troca capa e texto juntos", () => {
        expect(run(show(2, false))).toEqual({ current: 2, shown: 2, swap: "idle", playing: true });
    });

    it("ignora pedir a capa que já está na tela", () => {
        const state = run(show(1), titleEnd, titleEnd);
        expect(rotate(state, show(1))).toBe(state);
    });

    it("pausa e retoma pelo botão; o primeiro toque só para", () => {
        expect(run({ type: "togglePause" }).playing).toBe(false);
        expect(run({ type: "togglePause" }, { type: "togglePause" }).playing).toBe(true);
        expect(run({ type: "stop" }, { type: "stop" }).playing).toBe(false);
    });
});
