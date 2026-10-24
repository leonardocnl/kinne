import { describe, expect, it } from "vitest";
import {
    LOBBY_IDLE_AFTER_MS,
    LOBBY_IDLE_POLL_MS,
    nextPoll,
    POLL_MS,
    type RoomScreen,
} from "./useRoom";

const room = (phase: "lobby" | "voting" | "result") =>
    ({ kind: "room", phase }) as unknown as RoomScreen;

describe("nextPoll (RNE007, group-room D2)", () => {
    it("pergunta a cada 2,5 s no saguão e na votação", () => {
        expect(nextPoll(room("lobby"), 0, false)).toBe(POLL_MS);
        expect(nextPoll(room("voting"), 0, false)).toBe(POLL_MS);
        expect(POLL_MS).toBe(2500);
    });

    it("no saguão, depois de 2 minutos sem mudança, desacelera para 10 s", () => {
        expect(nextPoll(room("lobby"), LOBBY_IDLE_AFTER_MS - 1, false)).toBe(POLL_MS);
        expect(nextPoll(room("lobby"), LOBBY_IDLE_AFTER_MS, false)).toBe(LOBBY_IDLE_POLL_MS);
        expect(LOBBY_IDLE_AFTER_MS).toBe(120_000);
        expect(LOBBY_IDLE_POLL_MS).toBe(10_000);
    });

    it("a votação não desacelera por ficar parada", () => {
        expect(nextPoll(room("voting"), LOBBY_IDLE_AFTER_MS * 5, false)).toBe(POLL_MS);
    });

    it("para no resultado e quando a sala termina ou não existe", () => {
        expect(nextPoll(room("result"), 0, false)).toBeNull();
        expect(nextPoll({ kind: "ended" }, 0, false)).toBeNull();
        expect(nextPoll({ kind: "none" }, 0, false)).toBeNull();
    });

    it("enquanto carrega, continua perguntando", () => {
        expect(nextPoll({ kind: "loading" }, 0, false)).toBe(POLL_MS);
    });

    it("quando o servidor pede calma, dobra a espera", () => {
        expect(nextPoll(room("voting"), 0, true)).toBe(POLL_MS * 2);
    });
});
