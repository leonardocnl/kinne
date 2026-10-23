import { useCallback, useEffect, useRef, useState } from "react";
import { roomState, type RoomStateAnswer } from "../../_actions/room";

// RNE007, group-room D2: a cada 2,5 s enquanto a aba está visível; no saguão, depois de 2 minutos
// sem mudança, a cada 10 s; para no resultado e quando a sala termina.
export const POLL_MS = 2500;
export const LOBBY_IDLE_AFTER_MS = 2 * 60 * 1000;
export const LOBBY_IDLE_POLL_MS = 10_000;

export type RoomScreen = { kind: "loading" } | Exclude<RoomStateAnswer, { kind: "limited" }>;

/** O intervalo até a próxima pergunta, ou null se não há mais o que perguntar. */
export function nextPoll(screen: RoomScreen, idleMs: number, limited: boolean): number | null {
    if (screen.kind === "ended" || screen.kind === "none") return null;
    if (screen.kind === "room" && screen.phase === "result") return null;
    // o limite de pedidos pede calma: dobra a espera
    const base =
        screen.kind === "room" && screen.phase === "lobby" && idleMs >= LOBBY_IDLE_AFTER_MS
            ? LOBBY_IDLE_POLL_MS
            : POLL_MS;
    return limited ? base * 2 : base;
}

/**
 * O estado da sala, perguntado ao servidor. `refresh` pergunta agora (depois de uma ação). Nunca
 * há duas perguntas ao mesmo tempo, e a aba escondida não pergunta.
 */
export function useRoom() {
    const [screen, setScreen] = useState<RoomScreen>({ kind: "loading" });
    const screenRef = useRef(screen);
    const changedAt = useRef<number | null>(null);
    const limited = useRef(false);
    const busy = useRef(false);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const tick = useRef<() => void>(() => {});

    const schedule = useCallback(() => {
        clearTimeout(timer.current);
        const idle = changedAt.current === null ? 0 : Date.now() - changedAt.current;
        const wait = nextPoll(screenRef.current, idle, limited.current);
        if (wait !== null && !document.hidden)
            timer.current = setTimeout(() => tick.current(), wait);
    }, []);

    const refresh = useCallback(async () => {
        if (busy.current) return;
        busy.current = true;
        try {
            const answer = await roomState();
            limited.current = answer.kind === "limited";
            if (answer.kind !== "limited") {
                if (
                    changedAt.current === null ||
                    JSON.stringify(answer) !== JSON.stringify(screenRef.current)
                ) {
                    changedAt.current = Date.now();
                }
                screenRef.current = answer;
                setScreen(answer);
            }
        } catch {
            // sem rede: tenta de novo no próximo intervalo, sem trocar a tela
        } finally {
            busy.current = false;
            schedule();
        }
    }, [schedule]);

    useEffect(() => {
        tick.current = () => void refresh();
        // a aba que volta a aparecer pergunta na hora; a que some para de perguntar
        const onVisibility = () => {
            if (document.hidden) clearTimeout(timer.current);
            else void refresh();
        };
        document.addEventListener("visibilitychange", onVisibility);
        const first = setTimeout(() => void refresh(), 0);
        return () => {
            document.removeEventListener("visibilitychange", onVisibility);
            clearTimeout(timer.current);
            clearTimeout(first);
        };
    }, [refresh]);

    return { screen, refresh };
}
