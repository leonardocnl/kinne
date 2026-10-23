import { useSyncExternalStore } from "react";

// O aviso vive fora das telas para sobreviver à troca de título: "Já vi" mostra o aviso e já
// navega para a próxima opção (US005 C2).
const VISIBLE_MS = 3500;
// Com a pergunta "Curtiu?" (US010), um pouco mais, para dar tempo de responder.
const VISIBLE_ASKING_MS = 8000;
// Depois de responder, só o "Anotado." (US010 C2).
const VISIBLE_ANSWERED_MS = 1800;

export type ToastState = {
    text: string;
    /** id do título de que se pergunta "Curtiu?" (US010 C1); null quando não há pergunta */
    asking: number | null;
};

const EMPTY: ToastState = { text: "", asking: null };

let state = EMPTY;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function set(next: ToastState) {
    state = next;
    for (const listener of listeners) listener();
}

/**
 * Mostra o aviso por alguns segundos; texto vazio esconde na hora. Com `asking`, o aviso traz a
 * pergunta "Curtiu?" sobre esse título.
 */
export function showToast(text: string, options: { asking?: number } = {}) {
    clearTimeout(timer);
    const asking = text && options.asking !== undefined ? options.asking : null;
    set(text ? { text, asking } : EMPTY);
    if (text) {
        timer = setTimeout(() => set(EMPTY), asking === null ? VISIBLE_MS : VISIBLE_ASKING_MS);
    }
}

/** Resposta à pergunta: troca o aviso por "Anotado." e some logo (US010 C2). */
export function showAnswered() {
    clearTimeout(timer);
    set({ text: "Anotado.", asking: null });
    timer = setTimeout(() => set(EMPTY), VISIBLE_ANSWERED_MS);
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export const readToast = (): ToastState => state;

export function useToast(): ToastState {
    return useSyncExternalStore(subscribe, readToast, () => EMPTY);
}
